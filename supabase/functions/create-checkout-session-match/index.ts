import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0";
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

interface MatchCheckoutRequest {
  eventId: string;
  holdToken?: string;
  selectedSeats: SelectedSeat[];
  vipTables?: Array<{ id: string; price: number; seats: string[] }>;
  eventDetails: {
    name: string;
    date: string;
    time: string;
    venue: string;
  };
  hasInsurance: boolean;
  insurancePrice?: number;
  subtotal?: number;
  totalTableFixedPrice?: number;
  serviceFee?: number;
  total?: number;
  currency?: string;
  analytics?: Record<string, string>;
  // Customer info (collected on our form)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerGender: string;
  // Document info
  documentType: "passport" | "id_card";
  documentNumber: string;
  documentImageUrl?: string;
  documentFilePath?: string;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const requestData: MatchCheckoutRequest = await req.json();
    const {
      eventId,
      holdToken: frontendHoldToken,
      selectedSeats,
      eventDetails,
      hasInsurance,
      insurancePrice: providedInsurancePrice,
      currency: providedCurrency,
      analytics,
      customerName,
      customerEmail,
      customerPhone,
      customerGender,
      documentType,
      documentNumber,
      documentImageUrl,
      documentFilePath,
      ocrSurname,
      ocrGivenNames,
      ocrSex,
      documentExpiryDate,
      customerAddress,
      customerCity,
      customerZip,
      customerCountry,
    } = requestData as any;

    console.log("=== CREATE CHECKOUT SESSION MATCH (FSCG) ===");
    console.log("Event ID (eventKey):", eventId);
    console.log("Hold token from frontend:", frontendHoldToken);
    console.log("Selected seats count:", selectedSeats.length);
    console.log("Customer:", customerName, customerEmail);
    console.log("Document:", documentType, documentNumber);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_SEAT");
    const seatsioKey = Deno.env.get("SEATS_IO_SECRET_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY_SEAT not configured");

    // holdToken is optional — not needed for simple/sport events without seats.io
    if (frontendHoldToken) {
      console.log("Has hold token (seats.io event):", frontendHoldToken);
    } else {
      console.log("No hold token — simple/sport event (no seats.io)");
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get event from database — by eventKey first, then by id
    let dbEvent: any = null;
    const { data: byKey } = await supabase.from("AboutEvents").select("*").eq("eventKey", eventId).maybeSingle();
    if (byKey) {
      dbEvent = byKey;
      console.log("Found event in DB by eventKey:", dbEvent.name);
    } else {
      const { data: byId } = await supabase.from("AboutEvents").select("*").eq("id", eventId).maybeSingle();
      if (byId) {
        dbEvent = byId;
        console.log("Found event in DB by id:", dbEvent.name);
      } else {
        console.log("Event not found in DB, using provided eventDetails");
      }
    }

    const holdToken = frontendHoldToken || "";
    const eventKey = dbEvent?.eventKey || eventId;

    // Calculate prices
    const subtotal = selectedSeats.reduce((sum: number, seat: SelectedSeat) => {
      const qty = seat.quantity || 1;
      return sum + seat.price * qty;
    }, 0);

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

    // Create Stripe instance
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });

    // Prepare line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    selectedSeats.forEach((seat: SelectedSeat) => {
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

    // Prepare compact seats data for metadata
    const compactSeats = selectedSeats.map((s: SelectedSeat) => ({
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

    const seatsJson = JSON.stringify(compactSeats);
    const seatsChunks = chunkString(seatsJson, 450);

    // Build metadata
    const metadata: Record<string, string> = {
      event_id: eventKey,
      event_type: "match",
      event_name: eventDetails.name.substring(0, 100),
      event_date: eventDetails.date,
      event_time: eventDetails.time,
      venue: eventDetails.venue.substring(0, 100),
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
      // Customer info
      customer_name: (customerName || "").substring(0, 200),
      customer_email: (customerEmail || "").substring(0, 200),
      customer_phone: (customerPhone || "").substring(0, 50),
      customer_gender: customerGender || "",
      // Document info
      document_type: documentType || "",
      document_number: (documentNumber || "").substring(0, 50),
      document_file_path: (documentFilePath || "").substring(0, 450),
      // Billing address (fallback for Apple Pay)
      customer_address: (customerAddress || "").substring(0, 200),
      customer_city: (customerCity || "").substring(0, 100),
      customer_zip: (customerZip || "").substring(0, 20),
      customer_country: (customerCountry || "").substring(0, 5),
      // OCR scanned data from document
      ocr_surname: (ocrSurname || "").substring(0, 100),
      ocr_given_names: (ocrGivenNames || "").substring(0, 100),
      ocr_sex: ocrSex || "",
      doc_expiry_date: documentExpiryDate || "",
    };

    // Add document image URL (might be long signed URL, chunk if needed)
    if (documentImageUrl) {
      const docUrlChunks = chunkString(documentImageUrl, 450);
      metadata.document_image_url_chunks = docUrlChunks.length.toString();
      docUrlChunks.forEach((chunk, i) => {
        metadata[`doc_url_${i}`] = chunk;
      });
    }

    // Add chunked seats data
    seatsChunks.forEach((chunk, i) => {
      metadata[`seats_${i}`] = chunk;
    });

    // Add seat reservation session ID (for stadium_seats system, if present)
    const seatReservationSessionId = (requestData as any).seatReservationSessionId;
    if (seatReservationSessionId) {
      metadata.seat_reservation_session_id = seatReservationSessionId;
    }

    // Add analytics
    if (analytics) {
      Object.entries(analytics).forEach(([key, value]) => {
        if (value && !metadata[key]) {
          metadata[key] = String(value).substring(0, 450);
        }
      });
    }

    const metaKeys = Object.keys(metadata);
    console.log("Metadata keys count:", metaKeys.length, "(Stripe limit: 50)");
    console.log("Metadata keys:", metaKeys.join(", "));
    const longValues = metaKeys.filter(k => metadata[k].length > 450);
    if (longValues.length > 0) console.log("⚠️ Long metadata values:", longValues);

    // Create checkout session with ui_mode: "custom"
    console.log("Creating Stripe checkout session with ui_mode: custom...");
    console.log("Line items count:", lineItems.length);
    console.log("Total amount (cents):", Math.round(total * 100));

    const sessionParams: any = {
      ui_mode: "custom",
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: lineItems,
      customer_email: customerEmail,
      metadata,
      return_url: `https://etiketing.me/uspjesno-placanje-fscg?session_id={CHECKOUT_SESSION_ID}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Stripe minimum 30 min
    };

    console.log("Session params keys:", Object.keys(sessionParams));

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("✅ Custom checkout session created:", session.id);
    console.log("✅ Client secret present:", !!session.client_secret);

    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: session.client_secret,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    const stripeCode = (error as any)?.code || "";
    const stripeType = (error as any)?.type || "";
    console.error("❌ Error creating match checkout session:", errorMessage);
    console.error("❌ Stack:", errorStack);
    console.error("❌ Stripe code:", stripeCode, "type:", stripeType);
    if ((error as any)?.raw) {
      console.error("❌ Stripe raw:", JSON.stringify((error as any).raw));
    }

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
