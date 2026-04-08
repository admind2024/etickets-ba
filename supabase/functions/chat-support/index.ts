import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════
// FUZZY MATCHING HELPERS
// ═══════════════════════════════════════

/** Ukloni dijakritike i lowercase */
const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/č/g, "c").replace(/ć/g, "c")
    .replace(/ž/g, "z").replace(/š/g, "s")
    .replace(/đ/g, "dj").replace(/dž/g, "dz")
    .trim();

/** Levenshtein edit distance */
const levenshtein = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
};

/** Fuzzy match za imena - tolerancija na dijakritike, typo, fali slovo */
const fuzzyNameMatch = (name1: string, name2: string): boolean => {
  const n1 = normalizeText(name1);
  const n2 = normalizeText(name2);
  if (n1 === n2) return true;

  const parts1 = n1.split(/\s+/).filter((p) => p.length > 0);
  const parts2 = n2.split(/\s+/).filter((p) => p.length > 0);
  if (parts1.length === 0 || parts2.length === 0) return false;

  let matchedParts = 0;
  const used = new Set<number>();

  for (const p1 of parts1) {
    for (let j = 0; j < parts2.length; j++) {
      if (used.has(j)) continue;
      const p2 = parts2[j];
      const maxLen = Math.max(p1.length, p2.length);
      const threshold = maxLen <= 4 ? 1 : 2;
      if (levenshtein(p1, p2) <= threshold) {
        matchedParts++;
        used.add(j);
        break;
      }
    }
  }

  const required = Math.min(parts1.length, parts2.length);
  return matchedParts >= required;
};

/** Fuzzy match za nazive eventova */
const fuzzyEventMatch = (event1: string, event2: string): boolean => {
  const n1 = normalizeText(event1);
  const n2 = normalizeText(event2);
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Keyword match - barem pola keywords mora da se poklopi
  const kw1 = n1.split(/\s+/).filter((w) => w.length > 2);
  const kw2 = n2.split(/\s+/).filter((w) => w.length > 2);
  if (kw1.length === 0 || kw2.length === 0) return false;

  let kwMatches = 0;
  for (const w1 of kw1) {
    for (const w2 of kw2) {
      const threshold = Math.max(w1.length, w2.length) <= 4 ? 1 : 2;
      if (levenshtein(w1, w2) <= threshold) {
        kwMatches++;
        break;
      }
    }
  }

  return kwMatches >= Math.ceil(Math.min(kw1.length, kw2.length) / 2);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, conversation_history = [] } = await req.json();
    console.log(">>> Message:", message);

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─────────────────────────────────────────────
    // 1. Dohvati SVE podatke PARALELNO
    // ─────────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];

    const [
      { data: events },
      { data: performers },
      { data: performersI18n },
      { data: venues },
      { data: venuesI18n },
      { data: knowledge },
    ] = await Promise.all([
      supabase.from("AboutEvents").select("*").gte("date", today).ilike("status", "%active%").order("date"),
      supabase.from("performers").select("id, name, slug, biography, image, type"),
      supabase.from("performer_i18n").select("performer_id, lang, name, biography").eq("lang", "me"),
      supabase.from("venues").select("id, name, slug, city, address, capacity, description, image, latitude, longitude, google_maps_url"),
      supabase.from("venue_i18n").select("venue_id, lang, name, description").eq("lang", "me"),
      supabase.from("knowledge_base").select("question, answer"),
    ]);

    console.log(">>> Loaded: events:", events?.length || 0, "performers:", performers?.length || 0, "venues:", venues?.length || 0, "knowledge:", knowledge?.length || 0);

    const performerMap: Record<string, any> = {};
    performers?.forEach((p) => {
      performerMap[p.id] = { ...p };
    });
    performersI18n?.forEach((pi) => {
      if (performerMap[pi.performer_id]) {
        performerMap[pi.performer_id].biography =
          pi.biography || performerMap[pi.performer_id].biography;
        performerMap[pi.performer_id].displayName =
          pi.name || performerMap[pi.performer_id].name;
      }
    });

    const venueMap: Record<string, any> = {};
    venues?.forEach((v) => {
      venueMap[v.id] = { ...v };
    });
    venuesI18n?.forEach((vi) => {
      if (venueMap[vi.venue_id]) {
        venueMap[vi.venue_id].description =
          vi.description || venueMap[vi.venue_id].description;
        venueMap[vi.venue_id].displayName =
          vi.name || venueMap[vi.venue_id].name;
      }
    });

    // ─────────────────────────────────────────────
    // Formatiraj evente za AI
    // ─────────────────────────────────────────────
    const eventsInfo =
      events
        ?.map((e, i) => {
          let priceInfo = "";
          try {
            const desc = JSON.parse(e.description || "[]");
            priceInfo = desc.map((d: any) => `${d.category}: ${d.price}€`).join(", ");
          } catch {
            priceInfo = e.categories || "Cijene na upitu";
          }

          let faqInfo = "";
          try {
            const faq = JSON.parse(e.faq || "[]");
            if (faq.length > 0) {
              faqInfo = faq.map((f: any) => `P: ${f.question} O: ${f.answer}`).join(" | ");
            }
          } catch {
            faqInfo = "";
          }

          const performerId = e.performer_id;
          const performerData = performerId ? performerMap[performerId] : null;
          let performerInfo = "";
          if (performerData) {
            performerInfo = `
- Izvođač: ${performerData.displayName || performerData.name || e.performer || ""}
- Tip: ${performerData.type || "Nije navedeno"}
- Biografija: ${performerData.biography || e.biografija || "Nije navedeno"}`;
          } else {
            performerInfo = `
- Izvođač: ${e.performer || "Nije navedeno"}
- Biografija: ${e.biografija || "Nije navedeno"}`;
          }

          const venueId = e.venue_id;
          const venueData = venueId ? venueMap[venueId] : null;
          let venueInfo = "";
          if (venueData) {
            venueInfo = `
- Lokacija: ${venueData.displayName || venueData.name || e.venue || ""}
- Adresa: ${venueData.address || "Nije navedeno"}
- Grad: ${venueData.city || ""}
- Kapacitet: ${venueData.capacity || "Nije navedeno"}
- Opis lokacije: ${venueData.description || ""}
- Parking: ${e.parking_info || "Nije navedeno"}
- Google Maps: ${venueData.google_maps_url || "Nije navedeno"}`;
          } else {
            venueInfo = `
- Lokacija: ${e.venue || "Nije navedeno"}
- Parking: ${e.parking_info || "Nije navedeno"}`;
          }

          return `
EVENT ${i + 1}: ${e.name}
- Datum: ${e.date} u ${e.event_time}
- Cijene: ${priceInfo}
- Info: ${e.info || ""}
${performerInfo}
${venueInfo}
- Organizator: ${e.organizer || ""}
- Organizator telefon: ${e.organizer_phone || "Nije navedeno"}
- Organizator email: ${e.organizer_email || "Nije navedeno"}
- Organizator sajt: ${e.organizer_url || "Nije navedeno"}
- 🔗 Link za kupovinu: ${e.link || ""}
${faqInfo ? `- FAQ: ${faqInfo}` : ""}
`;
        })
        .join("\n---\n") || "Nema aktivnih događaja";

    const eventsList =
      events?.map((e, i) => `${i + 1}. ${e.name} (${e.date}) → ${e.link || "Nema linka"}`).join("\n") || "";

    const allPerformersInfo =
      Object.values(performerMap)
        .slice(0, 20)
        .map(
          (p: any) =>
            `${p.displayName || p.name} (${p.type || "izvođač"}): ${(p.biography || "").substring(0, 200)}...`
        )
        .join("\n") || "";

    const allVenuesInfo =
      Object.values(venueMap)
        .map(
          (v: any) =>
            `${v.displayName || v.name} (${v.city || ""}): ${v.address || ""}. Kapacitet: ${v.capacity || "N/A"}. Maps: ${v.google_maps_url || "N/A"}`
        )
        .join("\n") || "";

    const knowledgeText =
      knowledge?.map((k) => `P: ${k.question}\nO: ${k.answer}`).join("\n\n") || "";

    // ─────────────────────────────────────────────
    // 5. DETEKCIJA TIPA ZAHTJEVA
    // ─────────────────────────────────────────────
    const allText =
      conversation_history.map((m: any) => m.content).join(" ") + " " + message;
    const textLower = allText.toLowerCase();
    const msgLower = message.toLowerCase();

    // ═══ FORMA DETEKCIJA ═══
    // Poruka iz forme ima specifičan format: "Pronađi karte. Event: X, Ime: Y, Email: Z, Telefon: W"
    const isFormMessage = /pronađi\s+karte\.\s+event:/i.test(message) ||
                          /Tražim karte za:/i.test(message);

    // ═══ TICKET SEARCH DETEKCIJA ═══
    // Detektuj da li korisnik traži SVOJE KARTE (privatna pretraga)
    const ticketSearchIndicators = [
      /nisam\s+dobi/i,
      /moje\s+karte/i,
      /gdje\s+su\s+.*karte/i,
      /pronađi\s+.*karte/i,
      /pronadji\s+.*karte/i,
      /tražim\s+karte/i,
      /trazim\s+karte/i,
      /nemam\s+karte/i,
      /nije\s+stigl/i,
      /nema\s+kart/i,
      /poslji.*ponovo/i,
      /pošalji.*ponovo/i,
      /nisam\s+primio/i,
      /nisam\s+primila/i,
      /preuzmi.*karte/i,
    ];

    // Da li je u toku pretraga karata (iz historije razgovora)
    // FIX: dodate zagrade za ispravan operator precedence
    const isInTicketSearchFlow = conversation_history.some(
      (m: any) =>
        m.role === "assistant" &&
        (m.content.includes("Pronađi moje karte") ||
          (m.content.includes("email") && m.content.includes("verifikacij")) ||
          m.content.includes("Popunite podatke") ||
          m.content.includes("pronašao sam karte") ||
          m.content.includes("Pronašao sam karte") ||
          m.content.includes("Radi sigurnosti") ||
          m.content.includes("potvrdite") ||
          m.content.includes("ne poklapaju") ||
          m.content.includes("nema karata") ||
          m.content.includes("kontaktirajte support"))
    );

    // Korisnik je u ticket search flow ako:
    // 1. Poruka dolazi iz forme (najjasniji signal)
    // 2. Trenutna poruka matcha ticket search pattern
    // 3. AI je prethodno tražio verifikacione podatke
    const isTicketSearch =
      isFormMessage ||
      ticketSearchIndicators.some((pattern) => pattern.test(msgLower)) ||
      isInTicketSearchFlow;

    console.log(">>> Request type - isFormMessage:", isFormMessage, "isTicketSearch:", isTicketSearch);

    // ─────────────────────────────────────────────
    // 6. VERIFIKACIJA - samo ako je PRETRAGA KARATA
    // ─────────────────────────────────────────────
    let ticketsInfo = "";
    let verificationStatus = "";
    // Čuvamo izvučene podatke za system prompt
    let extractedEmail = "";
    let extractedName = "";
    let extractedPhone = "";
    let extractedEvent = "";

    if (isTicketSearch) {
      // ═══ IZVUCI PODATKE ═══

      // Email
      const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w+/i);
      extractedEmail = emailMatch ? emailMatch[0].toLowerCase() : "";

      // Telefon
      const phoneMatch = allText.match(
        /(\+?\d{3}[\s-]?\d{2,3}[\s-]?\d{3,4}[\s-]?\d{2,4}|\d{9,15})/
      );
      extractedPhone = phoneMatch ? phoneMatch[0].replace(/[\s-]/g, "") : "";

      // Ime - više patterna, uključujući format iz forme
      const namePatterns = [
        // Format iz forme: "Ime: Marko Markovic"
        /Ime:\s*([A-ZČĆŽŠĐa-zčćžšđ]+(?:\s+[A-ZČĆŽŠĐa-zčćžšđ]+)+)/i,
        // "ime je / zovem se / ja sam"
        /(?:ime(?:\s+mi)?\s+je|zovem\s+se|ja\s+sam)\s+([A-ZČĆŽŠĐa-zčćžšđ]+(?:\s+[A-ZČĆŽŠĐa-zčćžšđ]+)?)/i,
        // Slobodan Ime Prezime pattern (samo kad počinje velikim slovom)
        /([A-ZČĆŽŠĐ][a-zčćžšđ]+\s+[A-ZČĆŽŠĐ][a-zčćžšđ]+)/,
      ];

      for (const pattern of namePatterns) {
        const match = allText.match(pattern);
        if (match) {
          const candidate = match[1].trim();
          // Izbjegni lažne matcheve - ime ne smije biti naziv eventa ili lokacije
          const candidateNorm = normalizeText(candidate);
          const isEventName = events?.some(e => {
            const evNorm = normalizeText(e.name);
            return evNorm.includes(candidateNorm) || candidateNorm.includes(evNorm);
          });
          if (!isEventName && candidate.length > 3) {
            extractedName = candidate;
            break;
          }
        }
      }

      // Event - traži nazive iz liste evenata (sa normalizacijom dijakritika)
      const textNorm = normalizeText(allText);
      for (const ev of (events || [])) {
        const evNameNorm = normalizeText(ev.name);
        const keywords = evNameNorm.split(/\s+/).filter((w: string) => w.length > 3);
        if (
          textNorm.includes(evNameNorm) ||
          keywords.some((kw: string) => textNorm.includes(kw))
        ) {
          extractedEvent = ev.name;
          break;
        }
      }

      // Fallback: ako event nije u aktivnoj listi, izvuci raw tekst iz forme
      if (!extractedEvent) {
        const eventFormMatch = allText.match(/Event:\s*([^,\n]+)/i);
        if (eventFormMatch) {
          const rawEvent = eventFormMatch[1].trim();
          if (rawEvent.length > 2 && !/nepoznat|unknown|nije/i.test(rawEvent)) {
            extractedEvent = rawEvent;
          }
        }
      }

      console.log(">>> Extracted data:", {
        extractedName,
        extractedEmail,
        extractedPhone,
        extractedEvent,
      });

      // ═══ PRETRAGA KARATA U BAZI ═══
      // Normalizuj telefon: ukloni razmake, crtice, + i vodeće 0 ili 382
      const normalizePhone = (p: string): string => {
        let clean = p.replace(/[\s\-\+\(\)]/g, "");
        // 068123456 → 68123456
        if (clean.startsWith("0") && clean.length >= 9) clean = clean.substring(1);
        // 38268123456 → 68123456
        if (clean.startsWith("382") && clean.length >= 11) clean = clean.substring(3);
        return clean;
      };

      let tickets: any[] | null = null;

      if (extractedEmail) {
        console.log(">>> Searching tickets for email:", extractedEmail);

        const { data } = await supabase
          .from("QRKarte")
          .select(
            'sessionId, customerName, customerPhone, eventName, eventDate, eventTime, "Lokacija", "Customer Email", seatId'
          )
          .ilike('"Customer Email"', extractedEmail)
          .eq("status", "active")
          .gte("eventDate", today)
          .limit(20);

        tickets = data;
        console.log(">>> Tickets found by email:", tickets?.length || 0);
      }

      // Ako email ne nađe ništa, probaj po telefonu
      if ((!tickets || tickets.length === 0) && extractedPhone) {
        const cleanPhone = normalizePhone(extractedPhone);
        // Traži po zadnjih 6+ cifara telefona
        const phoneSuffix = cleanPhone.length >= 6 ? cleanPhone.slice(-Math.min(cleanPhone.length, 9)) : cleanPhone;
        console.log(">>> Searching tickets by phone suffix:", phoneSuffix);

        const { data } = await supabase
          .from("QRKarte")
          .select(
            'sessionId, customerName, customerPhone, eventName, eventDate, eventTime, "Lokacija", "Customer Email", seatId'
          )
          .ilike("customerPhone", `%${phoneSuffix}%`)
          .eq("status", "active")
          .gte("eventDate", today)
          .limit(20);

        tickets = data;
        console.log(">>> Tickets found by phone:", tickets?.length || 0);
      }

      // Ako ni telefon ne nađe, probaj po imenu + eventu
      if ((!tickets || tickets.length === 0) && extractedName) {
        const nameParts = extractedName.trim().split(/\s+/);
        const nameQuery = nameParts.map((p: string) => `customerName.ilike.%${p}%`).join(",");
        console.log(">>> Searching tickets by name:", nameQuery);

        let query = supabase
          .from("QRKarte")
          .select(
            'sessionId, customerName, customerPhone, eventName, eventDate, eventTime, "Lokacija", "Customer Email", seatId'
          )
          .or(nameQuery)
          .eq("status", "active")
          .gte("eventDate", today);

        if (extractedEvent) {
          query = query.ilike("eventName", `%${extractedEvent}%`);
        }

        const { data } = await query.limit(20);
        tickets = data;
        console.log(">>> Tickets found by name:", tickets?.length || 0);
      }

      if (tickets && tickets.length > 0) {
          const grouped: Record<string, typeof tickets> = {};
          tickets.forEach((t) => {
            if (!grouped[t.sessionId]) grouped[t.sessionId] = [];
            grouped[t.sessionId].push(t);
          });

          const verifiedGroups: string[] = [];
          const partialGroups: {
            sessionId: string;
            matches: number;
            mismatches: string[];
          }[] = [];

          for (const [sessionId, tix] of Object.entries(grouped)) {
            const ticket = tix[0];
            let matchCount = 0;
            const mismatches: string[] = [];

            // 1. Email - eksplicitna provjera (NE auto-grant)
            if (extractedEmail) {
              const ticketEmail = (ticket["Customer Email"] || "").toLowerCase().trim();
              if (ticketEmail === extractedEmail.toLowerCase().trim()) {
                matchCount++;
              } else {
                mismatches.push("email");
              }
            }

            // 2. Ime - fuzzy match sa dijakritikama i Levenshtein tolerancijom
            if (extractedName) {
              if (fuzzyNameMatch(extractedName, ticket.customerName || "")) {
                matchCount++;
              } else {
                mismatches.push("ime");
              }
            }

            // 3. Telefon - normalizovano poređenje (zadnjih 6+ cifara)
            if (extractedPhone) {
              const ticketPhoneNorm = normalizePhone(ticket.customerPhone || "");
              const extractedPhoneNorm = normalizePhone(extractedPhone);

              const phoneMatches =
                ticketPhoneNorm === extractedPhoneNorm ||
                (ticketPhoneNorm.length >= 6 && extractedPhoneNorm.length >= 6 &&
                  ticketPhoneNorm.slice(-6) === extractedPhoneNorm.slice(-6)) ||
                ticketPhoneNorm.includes(extractedPhoneNorm) ||
                extractedPhoneNorm.includes(ticketPhoneNorm);

              if (phoneMatches) {
                matchCount++;
              } else {
                mismatches.push("telefon");
              }
            }

            // 4. Event - fuzzy match sa normalizacijom
            if (extractedEvent) {
              if (fuzzyEventMatch(extractedEvent, ticket.eventName || "")) {
                matchCount++;
              } else {
                mismatches.push("event");
              }
            }

            console.log(
              `>>> Session ${sessionId}: ${matchCount} matches, mismatches:`,
              mismatches
            );

            if (matchCount >= 3) {
              verifiedGroups.push(sessionId);
            } else {
              partialGroups.push({ sessionId, matches: matchCount, mismatches });
            }
          }

          if (verifiedGroups.length > 0) {
            ticketsInfo = `
=== ✅ VERIFIKOVANE KARTE (${verifiedGroups.length} narudžbina) ===
Korisnik je dao dovoljno podataka za verifikaciju.

${verifiedGroups
  .map((sid) => {
    const tix = grouped[sid];
    const t = tix[0];
    return `✅ VERIFIKOVANO - MOŽEŠ DATI LINK!
Kupac: ${t.customerName}
Telefon: ${t.customerPhone}
Event: ${t.eventName}, ${t.eventDate} ${t.eventTime}
Lokacija: ${t["Lokacija"]}
Sjedišta: ${tix.map((x) => x.seatId).join(", ")}
Broj karata: ${tix.length}
🔗 LINK: https://etiketing.me/tickets?sessionId=${sid}`;
  })
  .join("\n---\n")}`;

            verificationStatus = "VERIFIED";
          }

          if (partialGroups.length > 0 && verifiedGroups.length === 0) {
            const providedData = [];
            if (extractedEmail) providedData.push("email");
            if (extractedName) providedData.push("ime");
            if (extractedPhone) providedData.push("telefon");
            if (extractedEvent) providedData.push("event");

            const missingData = [];
            if (!extractedName) missingData.push("ime i prezime");
            if (!extractedPhone) missingData.push("broj telefona");
            if (!extractedEvent) missingData.push("naziv eventa");

            ticketsInfo = `
=== ⚠️ PRONAĐENE KARTE - POTREBNA DODATNA VERIFIKACIJA ===
Pronađeno je ${tickets.length} karata za email ${extractedEmail}.

KORISNIK JE DAO: ${providedData.join(", ")}
NEDOSTAJE ZA VERIFIKACIJU: ${missingData.join(", ")}

⚠️ NE DAVAJ LINK DOK SE NE POTVRDE BAREM 3 OD 4 PODATKA!

Podaci na karti (ZA TVOJU REFERENCU, NE PRIKAZUJ KORISNIKU):
${partialGroups
  .map((pg) => {
    const tix = grouped[pg.sessionId];
    const t = tix[0];
    return `- Ime: ${t.customerName}, Tel: ${t.customerPhone}, Event: ${t.eventName}
  Poklapanja: ${pg.matches}/4, Neslaganja: ${pg.mismatches.join("; ")}`;
  })
  .join("\n")}

TRAŽI OD KORISNIKA DODATNE PODATKE!`;

            verificationStatus = "NEEDS_MORE_DATA";
          }
        } else {
          const searchedBy = extractedEmail ? `email ${extractedEmail}` : extractedPhone ? `telefon ${extractedPhone}` : extractedName ? `ime ${extractedName}` : "date podatke";
          ticketsInfo = `=== ❌ NEMA KARATA za ${searchedBy} ===
Molim provjerite da li ste unijeli ispravne podatke.`;
          verificationStatus = "NOT_FOUND";
        }

      if (!tickets || tickets.length === 0) {
        if (!extractedEmail && !extractedPhone && !extractedName) {
          ticketsInfo = `=== ℹ️ NEMA PODATAKA ZA PRETRAGU ===
Korisnik nije dao ni email, ni telefon, ni ime. Traži barem jedan podatak.`;
          verificationStatus = "NO_DATA";
        }
      }
    }

    // ─────────────────────────────────────────────
    // 7. SYSTEM PROMPT
    // ─────────────────────────────────────────────
    const systemPrompt = `Ti si ljubazni AI asistent za etickets korisničku podršku.

═══════════════════════════════════════
OSNOVNA PRAVILA
═══════════════════════════════════════
- Odgovaraj KRATKO i JASNO na srpskom/crnogorskom
- Budi ljubazan i strpljiv
- Ako ne znaš odgovor, uputi na support@e-tickets.me
- Nikad ne izmišljaj informacije
- BREND: etickets | SAJT: etiketing.me
- KONTAKT: support@e-tickets.me (09-17h radnim danima)

═══════════════════════════════════════
✍️ FORMAT ODGOVORA - OBAVEZNO POŠTUJ
═══════════════════════════════════════
Koristi emoji bullet points za strukturirane odgovore. Primjer:

📅 **4. april 2026.** u 21:00
📍 **Bemax Arena**, Podgorica
🎤 **Tea Tairović** - prvi samostalni koncert u CG
💰 Karte od **15€** (tribina) do **60€** (barski sto)

PRAVILA FORMATIRANJA:
- Koristi **bold** za ključne podatke (ime, datum, lokaciju, cijenu)
- Koristi emoji na početku svake linije za vizualnu preglednost
- NE nabrajaj SVE kategorije cijena - daj samo raspon (od X€ do Y€)
- NE piši dugačke paragrafe - koristi kratke bullet pointe
- Link za kupovinu UVIJEK stavi na kraj poruke (biće prikazan kao dugme)
- Ako event ima puno cijena, navedi samo najnižu i najvišu
- Maksimum 5-6 linija po odgovoru za info o eventu

═══════════════════════════════════════
🔍 FUZZY MATCHING - PREPOZNAJ ŠTA KORISNIK MISLI
═══════════════════════════════════════
Korisnici često pišu neformalno, sa greškama, skraćenicama ili nadimcima.
UVIJEK pokušaj da prepoznaš na koji event/izvođača misle, čak i ako napišu:
- Skraćeno ime: "tea", "teu", "emi", "aca" → prepoznaj izvođača iz liste
- Tipfelere: "emnia", "jahivoc", "luaks" → Tea Tairović, Emina Jahović, Aca Lukas...
- Samo prezime: "Tairović", "Jahović" → pronađi po prezimenu
- Nadimak ili sleng: "koncert u pg" → Podgorica, "sutra svirka" → event sutra
- Bez dijakritika: "Tairovic" = "Tairović", "Jahovic" = "Jahović"
- Djelimični nazivi: "nova godina" → novogodišnji event, "festival" → bilo koji festival

NIKAD ne reci "nemamo taj event" ako postoji BILO KAKVA sličnost sa nekim eventom iz liste!
Ako nisi siguran, PITAJ: "Da li mislite na [naziv eventa]?" umjesto da kažeš da ne postoji.

═══════════════════════════════════════
⚡ KRITIČNO: RAZLIKUJ TIPOVE ZAHTJEVA
═══════════════════════════════════════

TIP 1: JAVNE INFORMACIJE (daj ODMAH, bez ikakve verifikacije!)
─────────────────────────────────────
Ovo su informacije koje su javno dostupne SVIMA:
- Link za kupovinu karata za event → daj link ODMAH
- Cijene ulaznica → daj cijene ODMAH
- Datum, vrijeme, lokacija eventa → daj ODMAH
- Lista aktivnih događaja → daj ODMAH
- Informacije o izvođaču/lokaciji → daj ODMAH
- Kako kupiti karte (uputstvo) → daj ODMAH
- Načini plaćanja → daj ODMAH
- Povrat novca / refund politika → daj ODMAH
- Osiguranje ulaznica → daj ODMAH
- Link sajta → daj ODMAH
- Parking, organizator, FAQ → daj ODMAH

🟢 Za javne informacije NIKAD ne traži email, ime, telefon!
🟢 Linkove za kupovinu daj slobodno — to su JAVNI linkovi!

TIP 2: PRIVATNE KARTE (zahtijeva verifikaciju!)
─────────────────────────────────────
Samo kad korisnik traži SVOJE LIČNE KARTE koje je već kupio:
- "Nisam dobio karte"
- "Gdje su moje karte?"
- "Pronađi moje karte"
- "Pošalji mi karte ponovo"

⚠️ SAMO ZA PRIVATNE KARTE traži verifikaciju (3 od 4 podatka):
1. Email
2. Ime i prezime
3. Broj telefona
4. Naziv eventa

═══════════════════════════════════════
AKTIVNI DOGAĐAJI (KOMPLETNI DETALJI)
═══════════════════════════════════════
${eventsInfo}

═══════════════════════════════════════
LISTA DOGAĐAJA SA LINKOVIMA
═══════════════════════════════════════
${eventsList}

═══════════════════════════════════════
SVI IZVOĐAČI
═══════════════════════════════════════
${allPerformersInfo}

═══════════════════════════════════════
SVE LOKACIJE
═══════════════════════════════════════
${allVenuesInfo}

═══════════════════════════════════════
BAZA ZNANJA (FAQ)
═══════════════════════════════════════
${knowledgeText}

${isTicketSearch ? `
═══════════════════════════════════════
🔒 STATUS VERIFIKACIJE KARATA
═══════════════════════════════════════
${ticketsInfo}

KORISNIK JE DO SAD DAO:
- Email: ${extractedEmail || "NIJE DAT"}
- Ime: ${extractedName || "NIJE DATO"}
- Telefon: ${extractedPhone || "NIJE DAT"}
- Event: ${extractedEvent || "NIJE DAT"}

STATUS: ${verificationStatus}

KAKO POSTUPITI:
- Ako je STATUS = "VERIFIED" → Daj SAMO link iz sekcije VERIFIKOVANE KARTE (link sa sessionId). Reci korisniku da klikne na link.
- Ako je STATUS = "NEEDS_MORE_DATA" → Traži podatke koji nedostaju. NE daj nikakav link!
- Ako je STATUS = "NOT_FOUND" → Reci da nema karata za date podatke, pitaj da provjere
- Ako je STATUS = "NO_DATA" → Traži barem email, telefon ili ime i prezime

⛔ KRITIČNO - STROGA PRAVILA ZA PRETRAGU KARATA:
1. NIKAD ne daj link za kupovinu (etiketing.me/event/...) kad korisnik traži SVOJE KARTE!
   Korisnik traži karte koje je VEĆ KUPIO - ne treba mu link za novu kupovinu!
2. JEDINI link koji smiješ dati je link iz VERIFIKOVANE KARTE sekcije (sa ?sessionId=)
3. Ako STATUS NIJE "VERIFIED", NE daj NIJEDAN link za karte - čak ni ako korisnik insistira!
4. Ako korisnik kaže "tačni su", "podaci su dobri" ili slično, ali STATUS nije VERIFIED,
   NEMOJ promijeniti svoj odgovor! Reci: "Razumijem, ali sistem nije mogao potvrditi podatke.
   Molim vas kontaktirajte support@e-tickets.me za pomoć."
5. Ti NE odlučuješ da li se podaci poklapaju - to radi SISTEM VERIFIKACIJE.
   Ako sistem kaže NEEDS_MORE_DATA ili NOT_FOUND, poštuj to BEZ IZUZETKA.

PRIMJERI ZA PRIVATNE KARTE:

Ako korisnik da samo email:
"Pronašao sam karte za taj email. Radi sigurnosti, molim vas potvrdite još neke podatke:
- Vaše ime i prezime?
- Broj telefona korišten pri kupovini?
- Za koji event su karte?"

Ako su 3+ podatka tačna (STATUS = VERIFIED):
"Odlično, podaci se poklapaju! Evo linka za vaše karte: [LINK SA sessionId]"

Ako se podaci NE poklapaju (STATUS = NEEDS_MORE_DATA ili NOT_FOUND):
"Podaci koje ste dali se ne poklapaju sa kupovinom. Molim provjerite i pokušajte ponovo, ili kontaktirajte support@e-tickets.me"

Ako korisnik insistira da su podaci tačni ali verifikacija nije prošla:
"Razumijem, ali nažalost ne mogu potvrditi te podatke u sistemu. Molim vas kontaktirajte support@e-tickets.me i naš tim će vam pomoći."
` : ""}

═══════════════════════════════════════
GLAVNI MENI (početak razgovora)
═══════════════════════════════════════
"Zdravo! 👋 Kako vam mogu pomoći?

1️⃣ Nisam dobio/la karte
2️⃣ Kako kupiti kartu
3️⃣ Povrat novca
4️⃣ Nešto drugo"

═══════════════════════════════════════
PRIMJERI ZA JAVNE INFORMACIJE
═══════════════════════════════════════

Korisnik: "karte za teu"
✅ TAČNO:
"🎤 **Tea Tairović** - prvi samostalni koncert u CG!
📅 **4. april 2026.** u 21:00
📍 **Bemax Arena**, Podgorica
💰 Karte od **15€** do **60€**

Karte možete kupiti ovdje:
https://etiketing.me/event/tea-tairovic"

❌ POGREŠNO: Nabrajanje svih 14 kategorija cijena u jednoj poruci

Korisnik: "Kako da prijavim osiguranje?"
✅ TAČNO: "Za prijavu osiguranja posjetite https://etiketing.me/povrat-ulaznica ili kontaktirajte support@e-tickets.me"

VAŽNO: Kad daješ link za kupovinu, koristi link iz podataka o eventu. Link stavi na kraju poruke, sam u svom redu.`;

    console.log(">>> Calling OpenAI, isTicketSearch:", isTicketSearch, "isFormMessage:", isFormMessage);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversation_history.slice(-8),
          { role: "user", content: message },
        ],
        max_tokens: 800,
        temperature: 0.4,
      }),
    });

    console.log(">>> OpenAI status:", response.status);

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Greška. Kontaktirajte support@e-tickets.me";

    console.log(">>> Reply:", reply.substring(0, 100));

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(">>> ERROR:", error);
    return new Response(
      JSON.stringify({ reply: "Greška. Kontaktirajte support@e-tickets.me" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});