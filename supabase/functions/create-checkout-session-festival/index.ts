import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TicketItem {
  category: string;
  price: number;
  quantity: number;
  description?: string;
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
    const requestData = await req.json();

    // Retrieve card BIN via backend (server-side has access to card.iin)
    if (requestData.action === "detect_bin") {
      const { paymentMethodId } = requestData;
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_SEAT");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY_SEAT not configured");
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });

      console.log("=== DETECT BIN ===");
      console.log("PaymentMethod ID:", paymentMethodId);

      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      const card = pm.card as any;
      const iin = card?.iin || "";
      const issuer = card?.issuer || "";
      const brand = card?.brand || "";
      const country = card?.country || "";

      console.log("BIN result:", JSON.stringify({ iin, issuer, brand, country }));

      return new Response(
        JSON.stringify({ success: true, iin, issuer, brand, country }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Handle PaymentIntent amount update (for BIN discount)
    if (requestData.action === "update_amount") {
      const { paymentIntentId, newAmount, discountBin, discountPercentage, discountBankName } = requestData;
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_SEAT");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY_SEAT not configured");
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });

      console.log("=== UPDATE PAYMENT INTENT AMOUNT ===");
      console.log("PI:", paymentIntentId, "New amount:", newAmount, "BIN:", discountBin);

      await stripe.paymentIntents.update(paymentIntentId, {
        amount: newAmount,
        metadata: {
          discount_applied: "true",
          discount_percentage: String(discountPercentage),
          discount_bin: discountBin || "",
          discount_bank_name: discountBankName || "",
        },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const {
      eventId,
      tickets,
      eventDetails,
      hasInsurance,
      insurancePrice: providedInsurancePrice,
      currency: providedCurrency,
      analytics,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerZip,
      customerCountry,
      binDiscount,
    } = requestData;

    console.log("=== CREATE PAYMENT INTENT FESTIVAL ===");
    console.log("Event ID:", eventId);
    console.log("Tickets:", JSON.stringify(tickets));
    console.log("Customer:", customerName, customerEmail);
    console.log("BIN discount:", JSON.stringify(binDiscount));

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_SEAT");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY_SEAT not configured");

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get event from database
    let dbEvent: any = null;
    const { data: byId } = await supabase
      .from("AboutEvents")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();
    if (byId) {
      dbEvent = byId;
      console.log("Found event in DB:", dbEvent.name);
    } else {
      const { data: bySlug } = await supabase
        .from("AboutEvents")
        .select("*")
        .eq("slug", eventId)
        .maybeSingle();
      if (bySlug) {
        dbEvent = bySlug;
        console.log("Found event in DB by slug:", dbEvent.name);
      }
    }

    // Calculate prices
    const subtotal = tickets.reduce((sum: number, t: TicketItem) => sum + t.price * t.quantity, 0);

    const serviceFeePercent = dbEvent?.serviceFeePercentage
      ? parseFloat(dbEvent.serviceFeePercentage) / 100
      : 0.05;
    const fixedFee = 0.3;
    const serviceFee = subtotal * serviceFeePercent + fixedFee;

    const insuranceRate = 0.07;
    const insurancePrice = hasInsurance
      ? providedInsurancePrice || Math.round(subtotal * insuranceRate * 100) / 100
      : 0;

    // BIN discount NOT applied here — will be applied via manual capture in webhook
    const total = subtotal + serviceFee + insurancePrice;
    const currency = (dbEvent?.currency || providedCurrency || "EUR").toLowerCase();

    console.log("Price calculation:", { subtotal, serviceFee, insurancePrice, total, currency });

    // Create Stripe instance
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });

    // Flatten tickets for metadata (webhook creates 1 ticket per entry)
    const flattenedTickets: Array<{ c: string; p: number; i: string }> = [];
    let ticketIndex = 0;
    for (const t of tickets) {
      for (let j = 0; j < t.quantity; j++) {
        ticketIndex++;
        flattenedTickets.push({
          c: t.category,
          p: t.price,
          i: `${t.category.replace(/\s+/g, "-").toLowerCase()}-${ticketIndex}`,
        });
      }
    }

    const ticketsJson = JSON.stringify(flattenedTickets);
    const ticketsChunks = chunkString(ticketsJson, 450);

    // Build metadata
    const metadata: Record<string, string> = {
      event_id: dbEvent?.id || eventId,
      event_type: "festival",
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
      seats_chunks: ticketsChunks.length.toString(),
      ticket_count: flattenedTickets.length.toString(),
      sales_channel: "Online",
      customer_name: (customerName || "").substring(0, 200),
      customer_email: (customerEmail || "").substring(0, 200),
      customer_phone: (customerPhone || "").substring(0, 50),
      customer_address: (customerAddress || "").substring(0, 200),
      customer_city: (customerCity || "").substring(0, 100),
      customer_zip: (customerZip || "").substring(0, 20),
      customer_country: (customerCountry || "").substring(0, 5),
      // BIN discount info — stored for webhook verification
      discount_applied: (binDiscount?.applied || false).toString(),
      discount_percentage: (binDiscount?.percentage || 0).toString(),
      discount_bin: (binDiscount?.bin || "").substring(0, 10),
      discount_bank_name: (binDiscount?.bankName || "").substring(0, 100),
    };

    // Add chunked tickets data
    ticketsChunks.forEach((chunk, i) => {
      metadata[`seats_${i}`] = chunk;
    });

    // Add analytics
    if (analytics) {
      Object.entries(analytics).forEach(([key, value]) => {
        if (value && !metadata[key]) {
          metadata[key] = String(value).substring(0, 450);
        }
      });
    }

    console.log("Metadata keys count:", Object.keys(metadata).length);

    // Amount in cents
    const amountInCents = Math.round(total * 100);

    // Create PaymentIntent with capture_method: manual
    // This allows BIN detection via onChange before payment, and manual capture with discount in webhook
    console.log("Creating PaymentIntent with manual capture...");
    console.log("Amount:", amountInCents, "cents");

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      capture_method: "manual",
      automatic_payment_methods: { enabled: true },
      metadata,
      description: `${eventDetails.name} - ${flattenedTickets.length} karte`,
    });

    console.log("PaymentIntent created:", paymentIntent.id);
    console.log("Client secret present:", !!paymentIntent.client_secret);

    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: total,
        amountInCents,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating festival PaymentIntent:", errorMessage);
    if ((error as any)?.raw) {
      console.error("Stripe raw:", JSON.stringify((error as any).raw));
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
