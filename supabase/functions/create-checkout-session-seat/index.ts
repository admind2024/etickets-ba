import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SelectedSeat {
  id: string;
  category: string;
  price: number;
  objectType?: string;
  view?: string;
  viewQuality?: string;
  quantity?: number;
  sectionLabel?: string;
  entrance?: string;
  label?: string;
  number?: string;
}

interface CheckoutRequest {
  eventId: string;
  holdToken?: string; // Hold token from frontend Seats.io chart
  selectedSeats: SelectedSeat[];
  eventDetails: {
    name: string;
    date: string;
    time: string;
    venue: string;
  };
  hasInsurance: boolean;
  insurancePrice?: number;
  subtotal?: number;
  serviceFee?: number;
  total?: number;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
}

async function holdSeats(
  eventKey: string,
  seats: SelectedSeat[],
  secretKey: string,
): Promise<{ success: boolean; holdToken: string }> {
  // Create hold token
  const tokenResponse = await fetch("https://api.seatsio.net/hold-tokens", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(secretKey + ":")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresInMinutes: 30 }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error("Failed to create hold token:", err);
    throw new Error("Failed to create hold token");
  }

  const tokenData = await tokenResponse.json();
  const holdToken = tokenData.holdToken;

  // Build objects array for hold
  const objects = seats.map((seat) => {
    if (seat.objectType === "GeneralAdmissionArea" || seat.objectType === "generalAdmission") {
      return { objectId: seat.id, quantity: seat.quantity || 1 };
    }
    if (seat.objectType === "variableOccupancyArea") {
      return { objectId: seat.id, quantity: seat.quantity || 1 };
    }
    return seat.id;
  });

  console.log("Holding seats:", JSON.stringify(objects));

  // Hold seats
  const holdResponse = await fetch(`https://api.seatsio.net/events/${eventKey}/actions/hold`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(secretKey + ":")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ objects, holdToken }),
  });

  if (!holdResponse.ok) {
    const error = await holdResponse.text();
    console.error("Seats.io hold failed:", error);
    // If already held by same session, continue
    if (!error.includes("ALREADY_HELD_BY_SAME_SESSION")) {
      throw new Error(`Failed to hold seats: ${error}`);
    }
  }

  return { success: true, holdToken };
}

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.substring(i, i + size));
  }
  return chunks;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const requestData: CheckoutRequest = await req.json();
    const {
      eventId,
      holdToken: frontendHoldToken, // Hold token from Seats.io chart
      selectedSeats,
      eventDetails,
      hasInsurance,
      insurancePrice: providedInsurancePrice,
      currency: providedCurrency,
      successUrl,
      cancelUrl,
    } = requestData;

    console.log("=== CREATE CHECKOUT SESSION SEAT ===");
    console.log("Event ID (eventKey):", eventId);
    console.log("Hold token from frontend:", frontendHoldToken);
    console.log("Selected seats count:", selectedSeats.length);
    console.log("Event details:", JSON.stringify(eventDetails));

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_SEAT");
    const seatsioKey = Deno.env.get("SEATS_IO_SECRET_KEY");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY_SEAT not configured");
    }
    if (!seatsioKey) {
      throw new Error("SEATS_IO_SECRET_KEY not configured");
    }

    // Validate hold token - it's required for proper seat booking
    if (!frontendHoldToken) {
      console.error("No hold token provided from frontend!");
      throw new Error("Hold token is required. Please refresh the page and try again.");
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // eventId from frontend IS the eventKey (Seats.io key)
    const eventKey = eventId;

    // Try to get event from database for extra config (serviceFeePercentage, etc.)
    // But don't fail if not found - use eventDetails from frontend
    const { data: dbEvent } = await supabase.from("AboutEvents").select("*").eq("eventKey", eventKey).single();

    if (dbEvent) {
      console.log("Found event in DB:", dbEvent.name);
    } else {
      console.log("Event not found in DB by eventKey, using provided eventDetails");
    }

    // Use the hold token from the frontend - seats are already held by the chart
    const holdToken = frontendHoldToken;
    console.log("Using hold token:", holdToken);

    // Calculate prices
    const subtotal = selectedSeats.reduce((sum, seat) => {
      const qty = seat.quantity || 1;
      return sum + seat.price * qty;
    }, 0);

    // Use DB serviceFeePercentage if available, otherwise default to 5%
    const serviceFeePercent = dbEvent?.serviceFeePercentage ? parseFloat(dbEvent.serviceFeePercentage) / 100 : 0.05;
    const fixedFee = 0.3;
    const serviceFee = subtotal * serviceFeePercent + fixedFee;

    const insuranceRate = 0.07;
    const insurancePrice = hasInsurance
      ? providedInsurancePrice || Math.round(subtotal * insuranceRate * 100) / 100
      : 0;

    const total = subtotal + serviceFee + insurancePrice;
    const currency = (dbEvent?.currency || providedCurrency || "EUR").toLowerCase();

    console.log("Price calculation:", { subtotal, serviceFee, insurancePrice, total, currency });

    // Create Stripe session
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Prepare line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Add ticket line items
    selectedSeats.forEach((seat) => {
      const qty = seat.quantity || 1;
      const seatInfo =
        seat.label && seat.number
          ? `Red ${seat.label}, Sjedište ${seat.number}`
          : seat.sectionLabel
            ? `${seat.sectionLabel} - ${seat.id}`
            : seat.id;

      lineItems.push({
        price_data: {
          currency,
          product_data: {
            name: `${eventDetails.name} - ${seat.category}`,
            description: seatInfo,
          },
          unit_amount: Math.round(seat.price * 100),
        },
        quantity: qty,
      });
    });

    // Add service fee
    if (serviceFee > 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: {
            name: "Servisna naknada",
            description: "Naknada za online obradu",
          },
          unit_amount: Math.round(serviceFee * 100),
        },
        quantity: 1,
      });
    }

    // Add insurance if selected
    if (hasInsurance && insurancePrice > 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: {
            name: "Osiguranje karata",
            description: "Povrat novca u slučaju spriječenosti",
          },
          unit_amount: Math.round(insurancePrice * 100),
        },
        quantity: 1,
      });
    }

    // Prepare seats data for metadata - compact format
    const compactSeats = selectedSeats.map((s) => ({
      i: s.id,
      c: s.category,
      p: s.price,
      vq: s.viewQuality || "clear",
      e: s.entrance || "Glavni ulaz",
      ot: s.objectType || "seat",
      sl: s.sectionLabel || s.category,
      l: s.label || "",
      n: s.number || "",
      q: s.quantity || 1,
    }));

    // Chunk seats data for metadata (Stripe has 500 char limit per field)
    const seatsJson = JSON.stringify(compactSeats);
    const seatsChunks = chunkString(seatsJson, 450);

    // Build metadata
    const metadata: Record<string, string> = {
      event_id: eventKey,
      event_type: "seat",
      event_name: eventDetails.name.substring(0, 100),
      event_date: eventDetails.date,
      event_time: eventDetails.time,
      event_venue: eventDetails.venue.substring(0, 100),
      hold_token: holdToken,
      has_insurance: hasInsurance.toString(),
      insurance_price: insurancePrice.toFixed(2),
      service_fee: serviceFee.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      currency: currency.toUpperCase(),
      seats_chunks: seatsChunks.length.toString(),
      ticket_count: selectedSeats.length.toString(),
      sales_channel: "Online",
    };

    // Add chunked seats data
    seatsChunks.forEach((chunk, i) => {
      metadata[`seats_${i}`] = chunk;
    });

    // Determine URLs
    const origin = req.headers.get("origin") || "https://etiketing.me";
    const slug = dbEvent?.slug || eventDetails.name.toLowerCase().replace(/\s+/g, "-");

    const successUrlFinal = successUrl || `https://etiketing.me/uspjesno-placanje?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrlFinal = cancelUrl || `${origin}/event/${slug}`;

    console.log("Success URL:", successUrlFinal);
    console.log("Cancel URL:", cancelUrlFinal);

    // Build payment description for Stripe dashboard
    const seatSummary = selectedSeats.map(s => `${s.quantity || 1}x ${s.category}`).join(", ");
    const paymentDescription = `${eventDetails.name} | ${eventDetails.date} ${eventDetails.time} | ${seatSummary} | ${total.toFixed(2)} ${currency.toUpperCase()}`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrlFinal,
      cancel_url: cancelUrlFinal,
      metadata,
      payment_intent_data: {
        description: paymentDescription,
      },
      custom_fields: [
        {
          key: "pol",
          label: { type: "custom", custom: "Spol" },
          type: "dropdown",
          dropdown: {
            options: [
              { label: "Muški", value: "M" },
              { label: "Ženski", value: "Z" },
            ],
          },
        },
      ],
      phone_number_collection: { enabled: true },
      billing_address_collection: "required",
      customer_creation: "always",
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    });

    console.log("✅ Checkout session created:", session.id);
    console.log("Checkout URL:", session.url);

    return new Response(
      JSON.stringify({
        success: true,
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error creating checkout session:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
