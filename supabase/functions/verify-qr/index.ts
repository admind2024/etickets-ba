import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { qrCodeRaw } = await req.json();

    if (!qrCodeRaw) {
      return new Response(
        JSON.stringify({ valid: false, reason: "PRAZAN_QR" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parts = qrCodeRaw.split("|");

    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ valid: false, reason: "NEISPRAVAN_FORMAT" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [eventId, ticketId, providedSignature] = parts;
    const hmacSecret = Deno.env.get("HMAC_SECRET_KEY") || "ETK-9f38d1a2-cc49-4e3b-b182-7f94c2d9f6aa-2025";
    const payload = `${eventId}|${ticketId}`;
    const expectedSignature = await generateHmacSignature(payload, hmacSecret);

    if (providedSignature !== expectedSignature) {
      console.log("❌ FALSIFIKAT - potpisi se ne podudaraju!");
      return new Response(
        JSON.stringify({ valid: false, reason: "FALSIFIKAT", eventId, ticketId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ HMAC verifikacija uspješna");
    return new Response(
      JSON.stringify({ valid: true, eventId, ticketId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Greška:", error.message);
    return new Response(
      JSON.stringify({ valid: false, reason: "SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
