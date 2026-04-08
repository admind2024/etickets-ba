import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// GeoIP via Cloudflare headers (Supabase Edge koristi Deno Deploy / CF)
function getCountry(req: Request): string {
  return req.headers.get("cf-ipcountry") || req.headers.get("x-country") || "unknown";
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      sponsor_id,
      event_type,
      sponsor_name,
      sponsor_image,
      sponsor_link,
      user_agent,
      referrer,
      device,
    } = body;

    // Validacija
    if (!sponsor_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "sponsor_id and event_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!["impression", "click"].includes(event_type)) {
      return new Response(
        JSON.stringify({ error: "event_type must be 'impression' or 'click'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Supabase klijent
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Država iz headera
    const country = getCountry(req);

    // Insert u sponsor_analytics
    const { error } = await supabase.from("sponsor_analytics").insert({
      sponsor_id,
      event_type,
      user_agent: user_agent || "",
      referrer: referrer || "",
      country,
      device: device || "unknown",
      sponsor_name: sponsor_name || "",
      sponsor_image: sponsor_image || "",
      sponsor_link: sponsor_link || "",
    });

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to track event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Track sponsor error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
