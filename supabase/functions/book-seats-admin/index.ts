import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    console.log("=== ADMIN BOOK SEATS ===");
    console.log("Event ID:", eventId);
    console.log("Seats to book:", seats.length);

    // Nuclear normalizacija za matching
    const nuclearNormalize = (raw: string): string => {
      return raw.toUpperCase().replace(/[^A-ZÀ-Ž0-9]/g, "");
    };

    // Dohvati SVE objekte sa seats.io (free) da nađemo tačne objectId-ove
    // jer QRKarte seatId može biti u drugačijem formatu
    const seatsioObjects = new Map<string, string>(); // nuclearKey → original objectId
    try {
      const statusRes = await fetch(`${apiBase}/reports/events/${eventId}/byStatus`, {
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        },
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        // Registruj SVE objekte (free, booked, held, reserved) po nuclear ključu
        for (const status of ["free", "booked", "reservedByToken", "held", "reserved"]) {
          if (statusData[status] && Array.isArray(statusData[status])) {
            for (const obj of statusData[status]) {
              const objId = obj.objectId || obj.label || "";
              const label = obj.label || obj.objectId || "";
              if (objId) {
                const nucObj = nuclearNormalize(objId);
                if (!seatsioObjects.has(nucObj)) seatsioObjects.set(nucObj, objId);
                const nucLabel = nuclearNormalize(label);
                if (nucLabel && !seatsioObjects.has(nucLabel)) seatsioObjects.set(nucLabel, objId);
              }
            }
          }
        }
      }
      console.log("Seats.io objects indexed:", seatsioObjects.size);
    } catch (err: any) {
      console.error("Failed to fetch seats.io objects for mapping:", err.message);
    }

    const results: { seatId: string; success: boolean; message: string }[] = [];

    // Grupiši po seatId (za GA zone može biti više karata za isti objectId)
    const seatCounts: Record<string, number> = {};
    for (const seatId of seats) {
      if (!seatCounts[seatId]) {
        seatCounts[seatId] = 0;
      }
      seatCounts[seatId]++;
    }

    // Probaj bukirat svako sjedište pojedinačno da znamo koji su uspjeli
    for (const [qrSeatId, count] of Object.entries(seatCounts)) {
      // Pronađi tačan seats.io objectId — prvo probaj direktno, pa nuclear match
      let actualSeatId = qrSeatId;
      const nucKey = nuclearNormalize(qrSeatId);
      if (seatsioObjects.has(nucKey)) {
        const mapped = seatsioObjects.get(nucKey)!;
        if (mapped !== qrSeatId) {
          console.log(`🔄 Mapped QR seatId "${qrSeatId}" → seats.io "${mapped}"`);
          actualSeatId = mapped;
        }
      }

      const obj = count > 1
        ? { objectId: actualSeatId, quantity: count }
        : actualSeatId;

      try {
        const response = await fetch(
          `${apiBase}/events/${eventId}/actions/book`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              objects: [obj],
              orderId: `admin-fix-${Date.now()}`,
            }),
          }
        );

        const responseText = await response.text();

        if (response.ok) {
          console.log(`✅ Booked: ${actualSeatId}`);
          results.push({ seatId: qrSeatId, success: true, message: "Bukirano" });
        } else if (responseText.includes("ALREADY_BOOKED") || responseText.includes("already booked")) {
          console.log(`ℹ️ Already booked: ${actualSeatId}`);
          results.push({ seatId: qrSeatId, success: true, message: "Već bukirano" });
        } else {
          console.error(`❌ Failed: ${actualSeatId} (QR: ${qrSeatId}) — ${responseText}`);
          results.push({ seatId: qrSeatId, success: false, message: responseText });
        }
      } catch (err: any) {
        console.error(`❌ Error booking ${actualSeatId}:`, err.message);
        results.push({ seatId: qrSeatId, success: false, message: err.message });
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
