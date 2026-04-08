import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SelectedTicket {
  type: string;
  category?: string;
  categoryName?: string;
  name?: string;
  price: number;
  quantity?: number;
  seatNumber?: string;
  sectionLabel?: string;
  description?: string;
}

interface CheckoutRequest {
  eventId: string;
  selectedTickets: SelectedTicket[];
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
    // Handle health checks and non-POST requests
    if (req.method === "GET" || req.method === "HEAD") {
      return new Response(JSON.stringify({ status: "ok", service: "create-checkout-session-simple" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check for empty body
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      return new Response(JSON.stringify({ status: "ok", service: "create-checkout-session-simple" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const requestData: CheckoutRequest = JSON.parse(rawBody);
    const {
      eventId,
      selectedTickets,
      eventDetails,
      hasInsurance,
      insurancePrice: providedInsurancePrice,
      currency: providedCurrency,
      successUrl,
      cancelUrl,
    } = requestData;

    console.log("=== CREATE CHECKOUT SESSION SIMPLE ===");
    console.log("Event ID:", eventId);
    console.log("Selected tickets count:", selectedTickets.length);
    console.log("Event details:", JSON.stringify(eventDetails));

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_SIMPLE");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY_SIMPLE not configured");
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get event from database for extra config
    // First try by eventId field, then by id (primary key)
    let dbEvent: any = null;
    const { data: byEventId } = await supabase.from("AboutEvents").select("*").eq("eventId", eventId).single();
    if (byEventId) {
      dbEvent = byEventId;
      console.log("Found event in DB by eventId:", dbEvent.name);
    } else {
      const { data: byId } = await supabase.from("AboutEvents").select("*").eq("id", eventId).single();
      if (byId) {
        dbEvent = byId;
        console.log("Found event in DB by id:", dbEvent.name);
      } else {
        console.log("Event not found in DB, using provided eventDetails");
      }
    }

    // Calculate total tickets (selectedTickets are already flattened from frontend)
    const totalTicketCount = selectedTickets.length;

    // Calculate prices
    const subtotal = selectedTickets.reduce((sum, ticket) => {
      return sum + ticket.price;
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

    // Group tickets by type for line items
    const ticketGroups: Record<string, { type: string; price: number; quantity: number; seatNumbers: string[] }> = {};

    selectedTickets.forEach((ticket) => {
      const ticketType = ticket.type || ticket.category || ticket.categoryName || ticket.name || "Standardna";
      const key = `${ticketType}-${ticket.price}`;

      if (!ticketGroups[key]) {
        ticketGroups[key] = {
          type: ticketType,
          price: ticket.price,
          quantity: 0,
          seatNumbers: [],
        };
      }
      ticketGroups[key].quantity += 1;
      if (ticket.seatNumber) {
        ticketGroups[key].seatNumbers.push(ticket.seatNumber);
      }
    });

    // Prepare line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Add ticket line items
    Object.values(ticketGroups).forEach((group) => {
      const description = group.seatNumbers.length > 0 ? `Stolovi: ${group.seatNumbers.join(", ")}` : group.type;

      lineItems.push({
        price_data: {
          currency,
          product_data: {
            name: `${eventDetails.name} - ${group.type}`,
            description: description,
          },
          unit_amount: Math.round(group.price * 100),
        },
        quantity: group.quantity,
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

    // Prepare tickets data for metadata - compact format
    // Use seatNumber from frontend, or fallback to category + slobodno sjedenje
    const compactTickets = selectedTickets.map((t) => {
      const ticketType = t.type || t.category || t.name || "Standardna";
      return {
        t: ticketType,
        p: t.price,
        sn: t.seatNumber || `${t.sectionLabel || ticketType}, slobodno sjedenje`,
        sl: t.sectionLabel || ticketType,
      };
    });

    // Chunk tickets data for metadata (Stripe has 500 char limit per field)
    const ticketsJson = JSON.stringify(compactTickets);
    const ticketsChunks = chunkString(ticketsJson, 450);

    // Build metadata
    const metadata: Record<string, string> = {
      event_id: eventId,
      event_type: "simple",
      event_name: eventDetails.name.substring(0, 100),
      event_date: eventDetails.date,
      event_time: eventDetails.time,
      venue: eventDetails.venue.substring(0, 100),
      has_insurance: hasInsurance.toString(),
      insurance_price: insurancePrice.toFixed(2),
      service_fee: serviceFee.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
      currency: currency.toUpperCase(),
      tickets_chunks: ticketsChunks.length.toString(),
      ticket_count: totalTicketCount.toString(),
      sales_channel: "Online",
    };

    // Add chunked tickets data
    ticketsChunks.forEach((chunk, i) => {
      metadata[`tickets_${i}`] = chunk;
    });

    // Determine URLs
    const origin = req.headers.get("origin") || "https://etiketing.me";
    const slug = dbEvent?.slug || eventDetails.name.toLowerCase().replace(/\s+/g, "-");

    const successUrlFinal = successUrl || `https://etiketing.me/uspjesno-placanje?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrlFinal = cancelUrl || `${origin}/event/${slug}`;

    console.log("Success URL:", successUrlFinal);
    console.log("Cancel URL:", cancelUrlFinal);

    // Build description for Stripe dashboard
    const ticketSummary = Object.values(ticketGroups)
      .map((g) => `${g.quantity}x ${g.type}`)
      .join(", ");
    const paymentDescription = `${eventDetails.name} | ${eventDetails.date} ${eventDetails.time} | ${ticketSummary} | ${total.toFixed(2)} ${currency.toUpperCase()}`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrlFinal,
      cancel_url: cancelUrlFinal,
      payment_intent_data: {
        description: paymentDescription,
      },
      metadata,
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
