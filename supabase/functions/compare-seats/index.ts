import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const { eventId } = await req.json();

    if (!eventId) {
      throw new Error("eventId is required");
    }

    const seatsioKey = Deno.env.get("SEATS_IO_SECRET_KEY");
    if (!seatsioKey) {
      throw new Error("SEATS_IO_SECRET_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const credentials = btoa(`${seatsioKey}:`);
    const apiBase = "https://api-eu.seatsio.net";

    // Normalizacija: trim, uppercase, sažmi višestruke crtice/razmake u " - "
    const normalizeSeatId = (raw: string): string => {
      return raw
        .trim()
        .toUpperCase()
        .replace(/\s*-{2,}\s*/g, " - ")   // "--" ili "---" → " - "
        .replace(/\s*-\s*/g, " - ")        // "- " ili " -" → " - "
        .replace(/\s{2,}/g, " ");          // višestruki razmaci → jedan
    };

    // Smart normalizacija: izjednači crtice-kao-separatore sa razmacima
    // ALI sačuvaj crtice unutar numeričkih oznaka (npr. "1-4" ostaje "1-4")
    // Primjer: "Tribina zapad-Prolaz 1-4-D-3" i "Tribina zapad Prolaz 1-4 D-3"
    //          oba postaju "TRIBINA ZAPAD PROLAZ 1-4 D 3"
    const superNormalize = (raw: string): string => {
      return raw
        .trim()
        .toUpperCase()
        .replace(/-{2,}/g, "-")                        // dupla crtica → jedna
        .replace(/\s+-\s+/g, " ")                      // " - " → " "
        .replace(/([A-ZÀ-Ž])-([A-ZÀ-Ž])/g, "$1 $2")  // slovo-crtica-slovo → razmak
        .replace(/([0-9])-([A-ZÀ-Ž])/g, "$1 $2")      // broj-crtica-slovo → razmak
        .replace(/([A-ZÀ-Ž])-([0-9])/g, "$1 $2")      // slovo-crtica-broj → razmak
        .replace(/\s{2,}/g, " ")
        .trim();
    };

    // Nuclear normalizacija: skini SVE osim slova i brojeva
    // "Galerija Sektor A-4-10" → "GALERIJASEKTORA410"
    // "Galerija-Sektor A-4-10" → "GALERIJASEKTORA410"
    // Ovo je zadnji fallback za matching
    const nuclearNormalize = (raw: string): string => {
      return raw.toUpperCase().replace(/[^A-ZÀ-Ž0-9]/g, "");
    };

    console.log("=== COMPARE SEATS ===");
    console.log("Event ID:", eventId);

    // ═══════════════════════════════════════════════════════
    // 1. FETCH SEATS.IO DATA
    // ═══════════════════════════════════════════════════════

    // 1a. byStatus — detalji svih bukiranih/held sjedišta
    const statusResponse = await fetch(`${apiBase}/reports/events/${eventId}/byStatus`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    });

    if (!statusResponse.ok) {
      const errText = await statusResponse.text();
      throw new Error(`Seats.io byStatus error: ${statusResponse.status} ${errText}`);
    }

    const statusData = await statusResponse.json();

    // 1b. byObjectType — za GA zone
    const objectTypeResponse = await fetch(`${apiBase}/reports/events/${eventId}/byObjectType`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    });

    let gaAreasList: any[] = [];
    if (objectTypeResponse.ok) {
      const objectTypeData = await objectTypeResponse.json();
      if (objectTypeData.generalAdmission && Array.isArray(objectTypeData.generalAdmission)) {
        gaAreasList = objectTypeData.generalAdmission;
      }
    }

    // Parse seats.io data
    // Primarni ključ = objectId (jer QRKarte.seatId dolazi iz seats.io object.id = objectId)
    const seatsioMap = new Map<string, { seatId: string; objectId: string; label: string; status: string; orderId: string; objectType: string }>();
    const gaMap = new Map<string, { label: string; objectId: string; numBooked: number; capacity: number }>();

    // GA zone — registruj pod objectId
    gaAreasList.forEach((ga: any) => {
      const rawObjId = ga.objectId || ga.label || "";
      const rawLabel = ga.label || ga.objectId || "";
      const normObjId = normalizeSeatId(rawObjId);
      const normLabel = normalizeSeatId(rawLabel);
      const bookedCount = (ga.numBooked || 0) + (ga.numHeld || 0);
      if (normObjId && bookedCount > 0) {
        const gaInfo = {
          label: rawLabel,
          objectId: rawObjId,
          numBooked: bookedCount,
          capacity: ga.capacity || 0,
        };
        gaMap.set(normObjId, gaInfo);
        if (normLabel && normLabel !== normObjId) gaMap.set(normLabel, gaInfo);
      }
    });

    // Regular seats — booked, held, reserved
    const gaLabels = new Set(gaMap.keys());

    // Izvuci završni broj iz labele za fuzzy matching
    const extractTrailingNumber = (s: string): string | null => {
      const match = s.match(/(\d+)\s*$/);
      return match ? match[1] : null;
    };

    for (const status of ["booked", "reservedByToken", "held", "reserved"]) {
      if (statusData[status] && Array.isArray(statusData[status])) {
        for (const obj of statusData[status]) {
          const rawObjectId = obj.objectId || obj.label || "";
          const rawLabel = obj.label || obj.objectId || "";
          const normObjId = normalizeSeatId(rawObjectId);
          const normLabel = normalizeSeatId(rawLabel);

          if (!normObjId) continue;
          if (gaLabels.has(normObjId)) continue;
          if (gaLabels.has(normLabel)) continue;

          const seatInfo = {
            seatId: rawObjectId, // primarni identifikator = objectId
            objectId: rawObjectId,
            label: rawLabel,
            status: status,
            orderId: obj.orderId || "",
            objectType: obj.objectType || "seat",
          };

          // Registruj pod objectId (primarni) i label (sekundarni)
          if (!seatsioMap.has(normObjId)) {
            seatsioMap.set(normObjId, seatInfo);
          }
          if (normLabel && normLabel !== normObjId && !seatsioMap.has(normLabel)) {
            seatsioMap.set(normLabel, seatInfo);
          }
        }
      }
    }

    // Super-normalizirani indeks seats.io za fallback matching
    // Key: superNormalize(seatId) → seatInfo
    const seatsioSuperMap = new Map<string, { seatId: string; objectId: string; label: string; status: string; orderId: string; objectType: string }>();
    for (const [, seatInfo] of seatsioMap.entries()) {
      const superKey = superNormalize(seatInfo.objectId);
      if (superKey && !seatsioSuperMap.has(superKey)) {
        seatsioSuperMap.set(superKey, seatInfo);
      }
      const superLabel = superNormalize(seatInfo.label);
      if (superLabel && superLabel !== superKey && !seatsioSuperMap.has(superLabel)) {
        seatsioSuperMap.set(superLabel, seatInfo);
      }
    }

    // Nuclear normalizirani indeks seats.io za zadnji fallback
    const seatsioNuclearMap = new Map<string, { seatId: string; objectId: string; label: string; status: string; orderId: string; objectType: string }>();
    for (const [, seatInfo] of seatsioMap.entries()) {
      const nucKey = nuclearNormalize(seatInfo.objectId);
      if (nucKey && !seatsioNuclearMap.has(nucKey)) {
        seatsioNuclearMap.set(nucKey, seatInfo);
      }
      const nucLabel = nuclearNormalize(seatInfo.label);
      if (nucLabel && nucLabel !== nucKey && !seatsioNuclearMap.has(nucLabel)) {
        seatsioNuclearMap.set(nucLabel, seatInfo);
      }
    }

    // Debug: loguj prvih 5 seats.io entrija da vidimo format
    let debugCount = 0;
    for (const [key, val] of seatsioMap.entries()) {
      if (debugCount++ >= 5) break;
      console.log(`SIO: key="${key}" objectId="${val.objectId}" label="${val.label}"`);
    }

    console.log("Seats.io: regular seats =", seatsioMap.size, ", GA zones =", gaMap.size);

    // ═══════════════════════════════════════════════════════
    // 2. FETCH QRKARTE DATA (paginirano)
    // ═══════════════════════════════════════════════════════

    const allTickets: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (page < 100) {
      const { data, error } = await supabase
        .from("QRKarte")
        .select("seatId, ticketId, customerName, \"Customer Email\", sessionId, Purchasedate, status")
        .eq("eventId", eventId)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error("QRKarte query error:", error.message);
        break;
      }

      if (data && data.length > 0) {
        allTickets.push(...data);
        page++;
        if (data.length < pageSize) break;
      } else {
        break;
      }
    }

    console.log("QRKarte tickets:", allTickets.length);

    // Debug: loguj prvih 5 QRKarte seatId-eva
    for (let di = 0; di < Math.min(5, allTickets.length); di++) {
      const t = allTickets[di];
      console.log(`QR: seatId="${t.seatId}" norm="${normalizeSeatId(t.seatId || "")}"`);
    }

    // ═══════════════════════════════════════════════════════
    // 3. FIND DUPLICATES (isto sjedište, različite sesije)
    // ═══════════════════════════════════════════════════════

    const seatGroupMap = new Map<string, any[]>();
    for (const ticket of allTickets) {
      const normalizedSeat = normalizeSeatId(ticket.seatId || "");
      if (!normalizedSeat) continue;

      if (!seatGroupMap.has(normalizedSeat)) {
        seatGroupMap.set(normalizedSeat, []);
      }
      seatGroupMap.get(normalizedSeat)!.push(ticket);
    }

    const duplicates: any[] = [];
    for (const [normalizedSeat, tickets] of seatGroupMap.entries()) {
      // Preskoči GA zone (Parter, Fan Pit, itd.) — normalno je da imaju više karata sa istim seatId
      if (gaMap.has(normalizedSeat) || gaMap.has(nuclearNormalize(tickets[0]?.seatId || ""))) continue;

      // Mora biti više od jedne sesije
      const uniqueSessions = new Set(tickets.map((t: any) => t.sessionId));
      if (uniqueSessions.size <= 1) continue;

      // Za stolove: provjeri da li su RAZLIČITI kupci (email)
      // Ako je isti kupac kupio 6 karata za isti sto — to nije duplikat
      const uniqueEmails = new Set(
        tickets.map((t: any) => (t["Customer Email"] || "").toLowerCase().trim()).filter(Boolean)
      );
      if (uniqueEmails.size <= 1) continue;

      duplicates.push({
        seatId: tickets[0].seatId, // original format
        tickets: tickets.map((t: any) => ({
          ticketId: t.ticketId,
          customerName: t.customerName || "",
          customerEmail: t["Customer Email"] || "",
          sessionId: t.sessionId || "",
          purchaseDate: t.Purchasedate || "",
          status: t.status || "",
        })),
      });
    }

    // ═══════════════════════════════════════════════════════
    // 4. COMPARE — seats.io vs QRKarte
    // ═══════════════════════════════════════════════════════

    // Karte u QRKarte bez bookinga na seats.io
    const onlyInQRKarte: any[] = [];
    // Sjedišta na seats.io bez karte u QRKarte
    const onlyInSeatsio: any[] = [];

    // Set svih normalised QRKarte seatIds
    const qrSeatIds = new Set<string>();
    // Super-normalizirani set za fallback matching (bez crtica)
    const qrSeatIdsSuperSet = new Set<string>();
    // Nuclear normalizirani set — zadnji fallback (samo slova+brojevi)
    const qrSeatIdsNuclearSet = new Set<string>();
    for (const ticket of allTickets) {
      const normalized = normalizeSeatId(ticket.seatId || "");
      if (normalized) {
        qrSeatIds.add(normalized);
        qrSeatIdsSuperSet.add(superNormalize(ticket.seatId || ""));
        qrSeatIdsNuclearSet.add(nuclearNormalize(ticket.seatId || ""));
      }
    }

    // ═══════════════════════════════════════════════════════
    // 4a. FUZZY MATCHING — za stolove/objekte gdje se label razlikuje
    // Primjer: QRKarte="VIP barski sto --40" vs seats.io="Barski sto-40"
    // Oba nakon normalizacije: "VIP BARSKI STO - 40" vs "BARSKI STO - 40"
    // Fuzzy: izvuci završni broj i provjeri da li dijele ključnu riječ (STO, LOZA, itd.)
    // ═══════════════════════════════════════════════════════

    // Pomoćna: izvuci tipsku riječ i broj iz normaliziranog seatId-a
    const parseSeatKey = (norm: string): { number: string; words: string[] } | null => {
      const num = extractTrailingNumber(norm);
      if (!num) return null;
      // Ukloni broj sa kraja i crticu, ostavi "značajne" riječi
      const withoutNum = norm.replace(/\s*-\s*\d+\s*$/, "").trim();
      const words = withoutNum.split(/\s+/).filter(w => w.length > 2 && w !== "VIP");
      return { number: num, words };
    };

    // Napravi fuzzy indeks seats.io po broju — SAMO za stolove/booth objekte, NE za obična sjedišta
    // Fuzzy match je za slučajeve poput "VIP barski sto--40" vs "Barski sto-40"
    // Za obična sjedišta (seat) fuzzy match pravi lažne matcheve jer ignoriše red/prolaz
    const seatsioByNumber = new Map<string, string[]>();
    for (const [normKey, seatInfo] of seatsioMap.entries()) {
      // Samo stolove i booth objekte, NE sjedišta
      const objType = (seatInfo.objectType || "").toLowerCase();
      if (objType === "seat") continue;

      const parsed = parseSeatKey(normKey);
      if (parsed) {
        if (!seatsioByNumber.has(parsed.number)) {
          seatsioByNumber.set(parsed.number, []);
        }
        seatsioByNumber.get(parsed.number)!.push(normKey);
      }
    }

    // Fuzzy match: za svaki QRKarte seatId koji nema direktan match, probaj po broju + zajedničkim riječima
    // Primjenjuje se SAMO na stolove/objekte — za obična sjedišta fuzzy match je opasan
    const fuzzyMatched = new Set<string>(); // normalizirani QRKarte ključevi koji su fuzzy matchovani
    const fuzzyMatchedSeatsio = new Set<string>(); // normalizirani seats.io ključevi koji su fuzzy matchovani

    for (const [normalizedSeat] of seatGroupMap.entries()) {
      if (gaMap.has(normalizedSeat)) continue;
      if (seatsioMap.has(normalizedSeat)) continue; // već direktno matchovan

      const qrParsed = parseSeatKey(normalizedSeat);
      if (!qrParsed) continue;

      const candidates = seatsioByNumber.get(qrParsed.number);
      if (!candidates) continue;

      // Nađi kandidata koji dijeli bar jednu značajnu riječ
      for (const candidate of candidates) {
        if (fuzzyMatchedSeatsio.has(candidate)) continue; // već matchovan
        const sioParsed = parseSeatKey(candidate);
        if (!sioParsed) continue;

        // Provjeri da li dijele bar jednu riječ (npr. "STO", "LOZA", "BARSKI")
        const sharedWords = qrParsed.words.filter(w => sioParsed.words.includes(w));
        if (sharedWords.length > 0) {
          fuzzyMatched.add(normalizedSeat);
          fuzzyMatchedSeatsio.add(candidate);
          console.log(`Fuzzy match: QR="${normalizedSeat}" ↔ SIO="${candidate}" (shared: ${sharedWords.join(",")})`);
          break;
        }
      }
    }

    // Nađi QRKarte bez seats.io bookinga (samo za non-GA)
    for (const [normalizedSeat, tickets] of seatGroupMap.entries()) {
      if (gaMap.has(normalizedSeat)) continue;
      if (seatsioMap.has(normalizedSeat)) continue; // direktan match
      if (fuzzyMatched.has(normalizedSeat)) continue; // fuzzy match
      // Super-normalize fallback za crtice vs razmaci
      const superKey = superNormalize(tickets[0]?.seatId || "");
      if (superKey && seatsioSuperMap.has(superKey)) continue;
      // Nuclear fallback — samo slova+brojevi
      const nucKey = nuclearNormalize(tickets[0]?.seatId || "");
      if (nucKey && seatsioNuclearMap.has(nucKey)) {
        console.log(`Nuclear match (QR→SIO): QR="${tickets[0]?.seatId}" ↔ SIO="${seatsioNuclearMap.get(nucKey)!.objectId}"`);
        continue;
      }
      for (const t of tickets) {
        onlyInQRKarte.push({
          seatId: t.seatId,
          ticketId: t.ticketId,
          customerName: t.customerName || "",
          customerEmail: t["Customer Email"] || "",
          sessionId: t.sessionId || "",
          purchaseDate: t.Purchasedate || "",
        });
      }
    }

    // Nađi seats.io sjedišta bez karte u QRKarte
    const reportedSeatsio = new Set<string>();
    for (const [normalizedSeat, seatInfo] of seatsioMap.entries()) {
      if (qrSeatIds.has(normalizedSeat)) continue; // direktan match
      if (fuzzyMatchedSeatsio.has(normalizedSeat)) continue; // fuzzy match
      // Super-normalize fallback za crtice vs razmaci
      const superKey2 = superNormalize(seatInfo.objectId);
      const superLabel2 = superNormalize(seatInfo.label);
      if (qrSeatIdsSuperSet.has(superKey2) || qrSeatIdsSuperSet.has(superLabel2)) continue;
      // Nuclear fallback — samo slova+brojevi
      const nucKey2 = nuclearNormalize(seatInfo.objectId);
      const nucLabel2 = nuclearNormalize(seatInfo.label);
      if (qrSeatIdsNuclearSet.has(nucKey2) || qrSeatIdsNuclearSet.has(nucLabel2)) {
        console.log(`Nuclear match (SIO→QR): SIO="${seatInfo.objectId}" matched in QRKarte`);
        continue;
      }

      // Dedupliciraj po objectId (isti seat može biti pod label i objectId ključem)
      const dedupKey = normalizeSeatId(seatInfo.objectId);
      if (!reportedSeatsio.has(dedupKey)) {
        reportedSeatsio.add(dedupKey);
        onlyInSeatsio.push({
          seatId: seatInfo.objectId, // prikaži objectId jer to je ono što chart koristi
          label: seatInfo.label,     // prikaži i label za referencu
          status: seatInfo.status,
          orderId: seatInfo.orderId,
          objectType: seatInfo.objectType,
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // 5. GA COMPARISON
    // ═══════════════════════════════════════════════════════

    const gaComparison: any[] = [];
    const reportedGa = new Set<string>();
    for (const [normalizedLabel, gaInfo] of gaMap.entries()) {
      const dedupKey = normalizeSeatId(gaInfo.label);
      if (reportedGa.has(dedupKey)) continue;
      reportedGa.add(dedupKey);

      // Spoji QRKarte karte sa svih aliasa za ovu GA zonu
      const gaTickets = seatGroupMap.get(normalizedLabel) || [];
      const qrCount = gaTickets.length;
      const diff = qrCount - gaInfo.numBooked;

      gaComparison.push({
        area: gaInfo.label,
        seatsioBooked: gaInfo.numBooked,
        qrKarteCount: qrCount,
        difference: diff,
        capacity: gaInfo.capacity,
      });
    }

    // ═══════════════════════════════════════════════════════
    // 6. SUMMARY
    // ═══════════════════════════════════════════════════════

    // Dedupliciraj seats.io count (isti seat može biti pod label i objectId)
    const uniqueSeatsio = new Set<string>();
    for (const [, seatInfo] of seatsioMap.entries()) {
      uniqueSeatsio.add(normalizeSeatId(seatInfo.seatId));
    }
    // GA zone dedupliciraj isto
    const uniqueGaBooked = new Set<string>();
    let totalGaBooked = 0;
    for (const [, gaInfo] of gaMap.entries()) {
      const key = normalizeSeatId(gaInfo.label);
      if (!uniqueGaBooked.has(key)) {
        uniqueGaBooked.add(key);
        totalGaBooked += gaInfo.numBooked;
      }
    }
    const totalSeatsio = uniqueSeatsio.size + totalGaBooked;
    const totalQRKarte = allTickets.length;

    const summary = {
      totalSeatsio,
      totalQRKarte,
      matched: totalQRKarte - onlyInQRKarte.length,
      onlyInQRKarteCount: onlyInQRKarte.length,
      onlyInSeatsioCount: onlyInSeatsio.length,
      duplicatesCount: duplicates.length,
      gaZones: gaComparison.length,
    };

    console.log("Summary:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({
        summary,
        duplicates,
        onlyInQRKarte,
        onlyInSeatsio,
        gaComparison,
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
