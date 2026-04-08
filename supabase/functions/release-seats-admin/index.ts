import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Nuclear normalizacija — samo slova i brojevi za sigurnu usporedbu
const nuclearNormalize = (raw: string): string => {
  return raw.toUpperCase().replace(/[^A-ZÀ-Ž0-9]/g, "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const { eventId, seats } = await req.json();

    if (!eventId) {
      throw new Error("eventId is required");
    }

    if (!seats || !Array.isArray(seats) || seats.length === 0) {
      throw new Error("seats array is required");
    }

    const seatsioKey = Deno.env.get("SEATS_IO_SECRET_KEY");
    if (!seatsioKey) {
      throw new Error("SEATS_IO_SECRET_KEY not configured");
    }

    const credentials = btoa(`${seatsioKey}:`);
    const apiBase = "https://api-eu.seatsio.net";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("=== ADMIN RELEASE SEATS ===");
    console.log("Event ID:", eventId);
    console.log("Seats to release:", seats.length);

    // SAFETY CHECK: dohvati sve QRKarte za ovaj event i napravi set prodatih sjedišta
    const allSoldSeatIds = new Set<string>();
    let page = 0;
    const pageSize = 1000;
    while (page < 100) {
      const { data, error } = await supabase
        .from("QRKarte")
        .select("seatId")
        .eq("eventId", eventId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error || !data || data.length === 0) break;
      for (const row of data) {
        if (row.seatId) {
          allSoldSeatIds.add(nuclearNormalize(row.seatId));
        }
      }
      page++;
      if (data.length < pageSize) break;
    }

    console.log("QRKarte sold seats count:", allSoldSeatIds.size);

    const results: { seatId: string; success: boolean; message: string }[] = [];

    for (const seatId of seats) {
      // SAFETY: provjeri da li ovo sjedište ima prodatu kartu u QRKarte
      const nucSeatId = nuclearNormalize(seatId);
      if (allSoldSeatIds.has(nucSeatId)) {
        console.log(`⛔ SKIPPED (has sale): ${seatId}`);
        results.push({ seatId, success: false, message: "Preskočeno — sjedište ima prodatu kartu u bazi" });
        continue;
      }
      try {
        // First try simple release
        const response = await fetch(
          `${apiBase}/events/${eventId}/actions/release`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              objects: [seatId],
            }),
          }
        );

        const responseText = await response.text();

        if (response.ok) {
          console.log(`✅ Released: ${seatId}`);
          results.push({ seatId, success: true, message: "Otpušteno" });
        } else if (responseText.includes("FREE") || responseText.includes("not booked")) {
          console.log(`ℹ️ Already free: ${seatId}`);
          results.push({ seatId, success: true, message: "Već slobodno" });
        } else if (responseText.includes("variable occupancy") || responseText.includes("ILLEGAL_STATUS_CHANGE")) {
          // Variable occupancy table — need to get booked quantity first, then release with quantity
          console.log(`🔄 Variable occupancy table detected: ${seatId}, fetching status...`);
          try {
            const statusRes = await fetch(
              `${apiBase}/events/${eventId}/objects/${encodeURIComponent(seatId)}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Basic ${credentials}`,
                },
              }
            );
            const statusData = await statusRes.json();
            const numBooked = statusData?.numBooked || statusData?.quantity || 0;

            if (numBooked > 0) {
              const retryRes = await fetch(
                `${apiBase}/events/${eventId}/actions/release`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    objects: [{ objectId: seatId, quantity: numBooked }],
                  }),
                }
              );
              const retryText = await retryRes.text();
              if (retryRes.ok) {
                console.log(`✅ Released table: ${seatId} (quantity: ${numBooked})`);
                results.push({ seatId, success: true, message: `Otpušteno (${numBooked} mjesta)` });
              } else {
                console.error(`❌ Retry failed: ${seatId} — ${retryText}`);
                results.push({ seatId, success: false, message: retryText });
              }
            } else {
              console.log(`ℹ️ No booked places on table: ${seatId}`);
              results.push({ seatId, success: true, message: "Nema bukiranih mjesta" });
            }
          } catch (tableErr: any) {
            console.error(`❌ Error handling table ${seatId}:`, tableErr.message);
            results.push({ seatId, success: false, message: tableErr.message });
          }
        } else {
          console.error(`❌ Failed: ${seatId} — ${responseText}`);
          results.push({ seatId, success: false, message: responseText });
        }
      } catch (err: any) {
        console.error(`❌ Error releasing ${seatId}:`, err.message);
        results.push({ seatId, success: false, message: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Results: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        totalRequested: seats.length,
        successCount,
        failCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
