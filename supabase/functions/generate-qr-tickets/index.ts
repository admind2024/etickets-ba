import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateUniqueTicketId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKT-${year}${month}${day}-${randomPart}`;
}

async function generateHmacSignature(payload: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const data = encoder.encode(payload);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 12);
}

async function generateSignedQRCode(eventId: string, ticketId: string, hmacSecret: string) {
  const payload = `${eventId}|${ticketId}`;
  const signature = await generateHmacSignature(payload, hmacSecret);
  const qrString = `${payload}|${signature}`;
  return {
    qrCodeRaw: qrString,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrString)}`,
  };
}

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return "";
  // If already DD.MM.YYYY, return as is
  if (dateStr.includes(".")) return dateStr;
  // Convert YYYY-MM-DD to DD.MM.YYYY
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return dateStr;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hmacSecret = Deno.env.get("HMAC_SECRET_KEY") || "ETK-9f38d1a2-cc49-4e3b-b182-7f94c2d9f6aa-2025";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { eventId, quantity, category, entrance, seatIds, customerName, customerEmail, price, salesChannel, manualEvent } = await req.json();

    if (!quantity || quantity < 1) {
      return new Response(
        JSON.stringify({ success: false, message: "quantity je obavezan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let eventName = "";
    let eventDate = "";
    let eventTime = "";
    let venue = "";
    let currency = "EUR";
    let resolvedEventId = eventId;

    if (manualEvent) {
      // Ručni unos - event ne mora biti u bazi
      if (!manualEvent.name) {
        return new Response(
          JSON.stringify({ success: false, message: "Ime eventa je obavezno za ručni unos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      resolvedEventId = manualEvent.eventId || `MANUAL-${Date.now()}`;
      eventName = manualEvent.name;
      eventDate = formatDateForDisplay(manualEvent.date || "");
      eventTime = manualEvent.time || "";
      venue = manualEvent.venue || "";
      currency = manualEvent.currency || "EUR";
    } else {
      // Iz baze
      if (!eventId) {
        return new Response(
          JSON.stringify({ success: false, message: "Izaberi event ili unesi ručno" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: event, error: eventError } = await supabase
        .from("AboutEvents")
        .select("name, date, event_time, venue, currency, id")
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        return new Response(
          JSON.stringify({ success: false, message: "Event nije pronađen" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      eventName = event.name;
      eventDate = formatDateForDisplay(event.date || "");
      eventTime = event.event_time || "";
      venue = event.venue || "";
      currency = event.currency || "EUR";
    }

    const now = new Date();
    const purchaseDate = now.toISOString().split("T")[0];
    const purchaseTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const sessionId = `ADMIN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Ako je unesen samo 1 seatId, koristi ga za SVE karte (npr. "Slobodno sjedenje")
    // Ako ih je više, mapira 1:1. Ako nema, generisi automatski.
    const seatIdList = seatIds && seatIds.length === 1 && seatIds[0]
      ? Array.from({ length: quantity }, () => seatIds[0])
      : seatIds && seatIds.length > 1
        ? seatIds
        : Array.from({ length: quantity }, (_, i) => `ADMIN-${i + 1}`);

    const createdTickets = [];

    for (let i = 0; i < quantity; i++) {
      const ticketId = generateUniqueTicketId();
      const { qrCodeRaw, qrCodeUrl } = await generateSignedQRCode(resolvedEventId, ticketId, hmacSecret);

      const ticketData: Record<string, any> = {
        ticketId,
        sessionId,
        eventName,
        eventId: resolvedEventId,
        eventDate,
        eventTime,
        Lokacija: venue,
        seatId: seatIdList[i] || `ADMIN-${i + 1}`,
        category: category || "",
        entrance: entrance || "",
        price: price ? Number(price).toFixed(2) : "0.00",
        serviceFee: "0.00",
        totalPrice: price ? Number(price).toFixed(2) : "0.00",
        Valuta: currency,
        customerName: customerName || "Admin - Štampa",
        "Customer Email": customerEmail || "",
        qrCodeRaw,
        "QR Code": qrCodeUrl,
        status: "active",
        isUsed: false,
        validationCount: 0,
        Purchasedate: purchaseDate,
        purchaseTime,
        salesChannel: salesChannel || "Admin",
      };

      const { data, error } = await supabase.from("QRKarte").insert(ticketData).select();

      if (error) {
        console.error("Greška pri kreiranju karte:", error.message);
      } else if (data && data[0]) {
        createdTickets.push({ ...ticketData, id: data[0].id });
      }
    }

    console.log(`✅ Generisano ${createdTickets.length}/${quantity} karata za event: ${eventName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generisano ${createdTickets.length} karata`,
        tickets: createdTickets,
        sessionId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Greška:", error.message);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
