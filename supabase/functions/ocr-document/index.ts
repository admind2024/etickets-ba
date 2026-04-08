import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64, imageUrl, documentType, strict = true } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const docTypeLabel =
      documentType === "passport" ? "pasoš (passport)" : "lična karta (ID card)";

    const imageContent = imageBase64
      ? { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" as const } }
      : { type: "image_url" as const, image_url: { url: imageUrl!, detail: "high" as const } };

    // Legacy system prompt for strict CG-only verification (used in secondary message)
    const cgVerificationPrompt = documentType === "passport"
      ? `MONTENEGRIN PASSPORT VERIFICATION:
A genuine Montenegrin passport has: "CRNA GORA"/"MONTENEGRO" text, golden double-headed eagle coat of arms with lion on chest shield, country code "MNE" in MRZ, burgundy/dark red cover.
Montenegrin passport numbers: 9 ALL-DIGIT characters. Character disambiguation: I/l→1, O→0, S→5, B→8, Z→2.`
      : `MONTENEGRIN ID CARD VERIFICATION:
A genuine Montenegrin ID card has: "CRNA GORA / MONTENEGRO" + "LIČNA KARTA / IDENTITY CARD" text, golden double-headed eagle with lion on chest shield, red+gold flag colors, fields in Montenegrin.
Compare coats of arms: Montenegro=golden eagle+LION, Serbia=white eagle+CROSS with 4 C's, Albania=black eagle+NO shield.
Montenegrin ID numbers: 9 alphanumeric characters (e.g. T25G55752). Do NOT return the 6-digit CAN number.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: strict
              ? `You are a document verification and OCR assistant. Analyze the provided document image and extract ALL personal data fields.

CRITICAL — IMAGE ORIENTATION:
The document image may be rotated 90°, 180°, or 270° (sideways or upside down). Many users photograph ID cards in portrait mode, resulting in a sideways image.
You MUST detect if the image is NOT in the correct landscape orientation.
- If the image is rotated (90°, 180°, or 270° — i.e. text is sideways, upside down, or the document appears in portrait), set "imageRotated": true and return null for ALL data fields EXCEPT "detectedDocumentType" — you MUST still identify what type of document this is even if rotated.
- If the image is in the correct natural LANDSCAPE orientation (text reads left-to-right, photo on the left), set "imageRotated": false and proceed with extraction.

SCREENSHOT DETECTION:
If the image appears to be a SCREENSHOT of a document (not a direct photo), set "isScreenshot": true and return null for all data fields.

DOCUMENT TYPE AUTO-DETECTION (HIGHEST PRIORITY — ALWAYS DETECT THIS):
The user selected "${docTypeLabel}" but may have chosen incorrectly. You MUST ALWAYS detect and report the actual document type. This field must NEVER be null.
- ID card (any country) → detectedDocumentType = "id_card"
- Passport (any country) → detectedDocumentType = "passport"
- Driver's license (any country) → detectedDocumentType = "drivers_license"
- Any other document → detectedDocumentType = "other"
ONLY "id_card" and "passport" are accepted.

HOW TO DISTINGUISH A DRIVER'S LICENSE FROM AN ID CARD:
A driver's license has: vehicle categories (A, B, C, D, E), "DRIVING LICENCE"/"VOZAČKA DOZVOLA"/"PERMIS DE CONDUIRE" text, driving-specific fields. Even if it has a photo, it is NOT an ID card.

SPECIAL CHARACTERS:
Documents may use Latin script with diacritical characters (Č, Ć, Ž, Š, Đ, ü, ö, ä, ñ, etc.). Read them EXACTLY as written.

Your tasks:
0. ALWAYS detect the actual document type (id_card, passport, drivers_license, other).
1. Determine if this is the FRONT or BACK side. BACK side = MRZ zone, address, barcode, NO photo → set "isBackSide": true, return null for all fields EXCEPT "detectedDocumentType".
2. Determine the COUNTRY that issued this document.
3. Determine if this is a Montenegrin document (Crna Gora / Montenegro / MNE). Check for: "CRNA GORA"/"MONTENEGRO" text, golden double-headed eagle coat of arms with lion on chest shield, "MNE" in MRZ/nationality.
4. Extract document number, expiry date, surname, given names, sex.

${cgVerificationPrompt}

MONTENEGRIN ID CARD (Lična Karta) FRONT layout:
- "Crna Gora / Montenegro" + "Lična Karta / Identity card", photo on left, fields: Prezime/Surname, Ime/Given names, Pol/Sex, Državljanstvo/Nationality (MNE), Datum rođenja/Date of birth (DD.MM.YYYY), Datum važenja/Date of expiry (DD.MM.YYYY), Broj lične karte/ID serial number (9 alphanumeric like T25G55752). CAN number (6 digits) at bottom is NOT the document number.

MONTENEGRIN PASSPORT (Pasoš) layout:
- "Crna Gora · Montenegro · Monténégro", Broj pasoša/Passport no (alphanumeric like A42PF8212), Prezime/Surname, Ime/Given names, Pol/Sex, Datum važenja/Date of expiry (DD.MM.YYYY), MRZ starts with "P<MNE...".

Return ONLY a JSON object with these fields:
- "imageRotated": boolean
- "isBackSide": boolean
- "isMontenegrin": boolean — true if from Montenegro
- "detectedCountry": string — country name in English
- "detectedDocumentType": "id_card" | "passport" | "drivers_license" | "other"
- "documentNumber": string | null
- "expiryDate": string | null — format DD.MM.YYYY
- "surname": string | null — uppercase as on document
- "givenNames": string | null — uppercase as on document
- "sex": string | null — "M" or "F"
- "confidence": "high" | "medium" | "low"

Return ONLY valid JSON, no markdown, no explanation.`

              // ═══ RELAXED MODE — Universal document reader (all countries) ═══
              : `You are a universal document OCR assistant. You can read ID cards and passports from ANY country in the world. Extract personal data fields using standardized English field names.

CRITICAL — IMAGE ORIENTATION:
If the document image is rotated (90°, 180°, or 270°), set "imageRotated": true and return null for ALL data fields EXCEPT "detectedDocumentType". Do NOT read text from rotated images.

SCREENSHOT DETECTION:
If the image is a screenshot (phone status bar, browser UI, app elements visible), set "isScreenshot": true and return null for all data fields.

DOCUMENT TYPE AUTO-DETECTION (HIGHEST PRIORITY — ALWAYS DETECT THIS):
You MUST ALWAYS detect and report the actual document type. This field must NEVER be null.
- National ID card (any country: "Identity Card", "Carte d'identité", "Personalausweis", "Lična karta", "Documento di identità", "DNI", etc.) → "id_card"
- Passport (any country: "Passport", "Passeport", "Reisepass", "Pasoš", "Pasaporte", etc.) → "passport"
- Driver's license (any country: "Driving Licence", "Permis de conduire", "Führerschein", "Vozačka dozvola", "Licencia de conducir", etc.) → "drivers_license"
- Any other document (health card, student card, bank card, etc.) → "other"
ONLY "id_card" and "passport" are accepted. Reject all others.

A driver's license always has vehicle categories (A, B, C, D, E) and driving-specific fields. Do NOT confuse it with an ID card.

FRONT vs BACK SIDE:
- FRONT: person's PHOTO, name fields, document title
- BACK: MRZ zone, address, barcode, NO photo
If BACK side, set "isBackSide": true, return null for all fields EXCEPT "detectedDocumentType".

FIELD EXTRACTION (use English standardized names):
Extract these fields from the document, regardless of the language they are printed in:
- "surname": The family name / last name (look for: Surname, Nom, Nachname, Prezime, Cognome, Apellido, etc.)
- "givenNames": First name(s) / given name(s) (look for: Given names, Prénom, Vorname, Ime, Nome, Nombre, etc.)
- "sex": Gender (look for: Sex, Sexe, Geschlecht, Pol, Sesso, Sexo, etc.) — normalize to "M" or "F"
- "documentNumber": The document's unique number/serial (look for: Document number, Numéro, Nummer, Broj dokumenta, Numero, etc.)
- "expiryDate": When the document expires (look for: Date of expiry, Date d'expiration, Gültig bis, Važi do, Scadenza, Fecha de caducidad, etc.) — ALWAYS normalize to DD.MM.YYYY format regardless of original format
- "detectedCountry": The issuing country in English (detect from coat of arms, country name, MRZ country code, nationality field)

SPECIAL CHARACTERS:
Read ALL characters exactly as printed, including diacritical marks: Č, Ć, Ž, Š, Đ, ü, ö, ä, ñ, ß, ø, å, etc. Do NOT simplify them.

DATE FORMAT NORMALIZATION:
Convert any date format to DD.MM.YYYY:
- "27/12/2029" → "27.12.2029"
- "2029-12-27" → "27.12.2029"
- "Dec 27, 2029" → "27.12.2029"
- "27.12.2029." → "27.12.2029"

Return ONLY a JSON object with these fields:
- "imageRotated": boolean
- "isBackSide": boolean
- "isMontenegrin": null (not checked in universal mode)
- "detectedCountry": string — issuing country name in English
- "detectedDocumentType": "id_card" | "passport" | "drivers_license" | "other"
- "documentNumber": string | null
- "expiryDate": string | null — ALWAYS in DD.MM.YYYY format
- "surname": string | null — uppercase as on document
- "givenNames": string | null — uppercase as on document
- "sex": string | null — "M" or "F"
- "confidence": "high" | "medium" | "low"

Return ONLY valid JSON, no markdown, no explanation.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: strict
                ? `Analyze this document (user selected: ${docTypeLabel}, but verify the actual type). Extract ALL fields: actual document type, country, document number (NOT the CAN number), expiry date, surname, given names, and sex. IMPORTANT: If the image appears rotated or sideways, mentally rotate it to landscape orientation before reading any text.`
                : `Analyze this document from ANY country. Extract ALL fields using English standardized names: document type, issuing country, document number, expiry date (normalize to DD.MM.YYYY), surname, given names, and sex. Verify the actual document type regardless of what the user selected (${docTypeLabel}).`
              },
              imageContent,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return new Response(
        JSON.stringify({ success: false, error: "OCR service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    console.log("OCR raw result:", content);

    let parsed: {
      documentNumber: string | null;
      expiryDate?: string | null;
      surname?: string | null;
      givenNames?: string | null;
      sex?: string | null;
      confidence: string;
      isMontenegrin?: boolean;
      detectedCountry?: string;
      detectedDocumentType?: string;
      isBackSide?: boolean;
      imageRotated?: boolean;
    };
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse OCR response:", content);
      return new Response(
        JSON.stringify({ success: false, error: "Could not parse OCR result" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageRotated: parsed.imageRotated ?? false,
        isBackSide: parsed.isBackSide ?? false,
        documentNumber: parsed.documentNumber,
        expiryDate: parsed.expiryDate ?? null,
        surname: parsed.surname ?? null,
        givenNames: parsed.givenNames ?? null,
        sex: parsed.sex ?? null,
        confidence: parsed.confidence,
        isMontenegrin: parsed.isMontenegrin ?? null,
        detectedCountry: parsed.detectedCountry ?? null,
        detectedDocumentType: parsed.detectedDocumentType ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("OCR function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
