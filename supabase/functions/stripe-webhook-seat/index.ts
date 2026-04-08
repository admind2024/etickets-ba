import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// ═══════════════════════════════════════════════════════════════════════════
// 🆕 WIX BACKUP KONFIGURACIJA
// ═══════════════════════════════════════════════════════════════════════════
const WIX_BACKUP_URL = "https://www.e-tickets.me/_functions/backupTicket";
const WIX_BACKUP_KEY = "ETK-BACKUP-2025-SECURE";

// Generise 8-cifreni numericki order number iz sessionId-a
function generateOrderNumber(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const ch = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  const num = Math.abs(hash) % 100000000;
  return num.toString().padStart(8, "0");
}

async function backupToWix(tickets: any[], sessionId: string, source: string): Promise<void> {
  try {
    console.log(`🔄 Starting Wix backup for ${tickets.length} tickets...`);

    const response = await fetch(WIX_BACKUP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Backup-Key": WIX_BACKUP_KEY,
      },
      body: JSON.stringify({
        tickets,
        sessionId,
        source,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const savedCount = result.saved || tickets.length;
      console.log(`✅ Wix backup success: ${savedCount}/${tickets.length} tickets`);
    } else {
      const errorText = await response.text();
      console.error(`⚠️ Wix backup failed: ${response.status} - ${errorText}`);
    }
  } catch (error: any) {
    console.error(`⚠️ Wix backup error (non-blocking): ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNKCIJE
// ═══════════════════════════════════════════════════════════════════════════

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

function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.startsWith("0") && cleaned.length >= 9 && cleaned.length <= 10) {
    cleaned = "382" + cleaned.substring(1);
  }
  return cleaned;
}

function formatDateForDisplay(dateInput: string | null | undefined): string {
  if (!dateInput) return "TBA";

  try {
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateInput)) {
      return dateInput;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const [year, month, day] = dateInput.split('T')[0].split('-');
      return `${day}.${month}.${year}`;
    }

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateInput;
  }
}

function formatTimeForDisplay(timeInput: string | null | undefined): string {
  if (!timeInput) return "TBA";
  const match = timeInput.match(/^(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return timeInput;
}

async function shortenUrl(url: string, apiKey: string): Promise<string> {
  if (!apiKey) return url;
  try {
    const response = await fetch("https://api.tinyurl.com/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, domain: "my-etickets.com" }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.data.tiny_url;
    }
  } catch (error) {
    console.warn("TinyURL error:", error);
  }
  return url;
}

function buildGoogleCalendarUrl(
  eventName: string, venue: string, venueAddress: string, venueCity: string,
  startIso: string, endIso: string, viewUrl: string
): string {
  const formatGcal = (iso: string) => iso.replace(/[-:+]/g, "").substring(0, 15);
  const location = [venue, venueAddress, venueCity].filter(Boolean).join(", ");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventName,
    dates: `${formatGcal(startIso)}/${formatGcal(endIso)}`,
    details: `Vaše karte: ${viewUrl}`,
    location,
    ctz: "Europe/Podgorica",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildOutlookCalendarUrl(
  eventName: string, venue: string, venueAddress: string, venueCity: string,
  startIso: string, endIso: string, viewUrl: string
): string {
  const location = [venue, venueAddress, venueCity].filter(Boolean).join(", ");
  const params = new URLSearchParams({
    startdt: startIso, enddt: endIso, subject: eventName, location,
    body: `Vaše karte: ${viewUrl}`, path: "/calendar/action/compose", rru: "addevent",
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEATS.IO BOOKING - SA HOLD TOKEN
// ═══════════════════════════════════════════════════════════════════════════

async function bookSeatsInSeatsio(
  eventId: string,
  seats: any[],
  orderId: string,
  holdToken: string | null,
  seatsioKey: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    console.log("=== SEATS.IO BOOKING ===");
    console.log("Event ID:", eventId);
    console.log("Seats count:", seats.length);
    console.log("Order ID:", orderId);
    console.log("Hold Token:", holdToken || "NONE");

    if (!eventId || !seats || seats.length === 0) {
      return { success: false, message: "Missing eventId or seats" };
    }

    const seatCounts: Record<string, { count: number; objectType: string }> = {};

    seats.forEach((seat: any) => {
      const seatId = seat.id || seat.i || seat.objectId;
      const objectType = seat.objectType || seat.ot || "seat";

      if (seatId) {
        if (!seatCounts[seatId]) {
          seatCounts[seatId] = { count: 0, objectType };
        }
        seatCounts[seatId].count++;
      }
    });

    const bookingObjects: any[] = [];

    Object.entries(seatCounts).forEach(([objectId, data]) => {
      const isTable = data.objectType.toLowerCase().includes("table");
      const isGA = data.objectType.toLowerCase().includes("general");

      if (isTable || isGA || data.count > 1) {
        bookingObjects.push({ objectId, quantity: data.count });
      } else {
        bookingObjects.push(objectId);
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // POKUŠAJ 1: Booking SA holdTokenom (ako postoji)
    // ═══════════════════════════════════════════════════════════════
    const requestBody: any = {
      objects: bookingObjects,
      orderId: `order-${orderId}`,
    };

    if (holdToken) {
      requestBody.holdToken = holdToken;
    }

    console.log("🔄 Attempt 1: Booking with holdToken:", !!holdToken);

    const response = await fetch(
      `https://api-eu.seatsio.net/events/${eventId}/actions/book`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(seatsioKey + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const responseText = await response.text();

    if (response.ok) {
      console.log("✅ Seats successfully booked (attempt 1)");
      return { success: true, message: "Seats booked successfully" };
    }

    if (
      responseText.includes("already booked") ||
      responseText.includes("ALREADY_BOOKED") ||
      responseText.includes("already in that status") ||
      responseText.includes("ILLEGAL_STATUS_CHANGE")
    ) {
      console.log("ℹ️ Seats already booked (idempotent) - treating as success");
      return { success: true, message: "Seats already booked" };
    }

    // ═══════════════════════════════════════════════════════════════
    // POKUŠAJ 2: Ako je hold token istekao, probaj BEZ tokena
    // Seat.io dokumentacija: booking bez holdTokena radi ako je sjedište slobodno
    // ═══════════════════════════════════════════════════════════════
    if (holdToken && (
      responseText.includes("HOLD_TOKEN_EXPIRED") ||
      responseText.includes("TOKEN_EXPIRED") ||
      responseText.includes("holdToken") ||
      responseText.includes("not held") ||
      response.status === 400
    )) {
      console.log("⚠️ Attempt 1 failed, hold token may be expired. Retrying WITHOUT holdToken...");
      console.log("⚠️ First attempt error:", responseText.substring(0, 300));

      const retryBody: any = {
        objects: bookingObjects,
        orderId: `order-${orderId}`,
      };

      const retryResponse = await fetch(
        `https://api-eu.seatsio.net/events/${eventId}/actions/book`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(seatsioKey + ":")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(retryBody),
        }
      );

      const retryText = await retryResponse.text();

      if (retryResponse.ok) {
        console.log("✅ Seats successfully booked (attempt 2 - without holdToken)");
        return { success: true, message: "Seats booked successfully (fallback without holdToken)" };
      }

      if (
        retryText.includes("already booked") ||
        retryText.includes("ALREADY_BOOKED") ||
        retryText.includes("already in that status") ||
        retryText.includes("ILLEGAL_STATUS_CHANGE")
      ) {
        console.log("ℹ️ Seats already booked (idempotent, attempt 2) - treating as success");
        return { success: true, message: "Seats already booked" };
      }

      console.error("❌ Seats.io booking failed (both attempts):", retryText.substring(0, 500));
      return { success: false, message: "Booking failed after retry", error: retryText };
    }

    console.error("❌ Seats.io booking failed:", responseText);
    return { success: false, message: "Booking failed", error: responseText };
  } catch (error: any) {
    console.error("❌ Seats.io error:", error.message);
    return { success: false, message: error.message, error };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD DETAILS (IIN/BIN)
// ═══════════════════════════════════════════════════════════════════════════

async function getCardDetailsFromCharge(stripe: Stripe, paymentIntentId: string): Promise<any> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });

    if (!paymentIntent.latest_charge) {
      return null;
    }

    const chargeId = typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge.id;

    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["payment_method_details.card"],
    });

    if (charge?.payment_method_details?.card) {
      const card = charge.payment_method_details.card as any;

      return {
        iin: card.iin || "",
        last4: card.last4 || "",
        brand: card.brand || "",
        funding: card.funding || "",
        country: card.country || "",
        fingerprint: card.fingerprint || "",
        issuer: card.issuer || "",
        network: card.network || "",
        description: card.description || "",
      };
    }

    return null;
  } catch (error: any) {
    console.error("Error fetching card details:", error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL NOTIFIKACIJA - SA ISO DATUMIMA ZA CALENDAR SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

async function sendEmailConfirmation(
  customerEmail: string,
  customerName: string,
  customerPhone: string,
  eventDetails: {
    name: string;
    date: string;
    time: string;
    venue: string;
    venueAddress?: string;
    venueCity?: string;
    imageUrl?: string;
    pageUrl?: string;
    rawDate?: string;
    rawTime?: string;
  },
  tickets: any[],
  totalAmount: number,
  currency: string,
  sessionId: string,
  viewUrl: string,
  zohoApiKey: string,
  cardDetails?: { brand?: string; last4?: string; country?: string; issuer?: string } | null,
  invoiceUrl?: string
) {
  if (!zohoApiKey) {
    console.log("Email skipped - missing Zoho API key");
    return false;
  }

  const subtotal = tickets.reduce((sum, t) => sum + parseFloat(t.price || 0), 0);
  const serviceFee = tickets.reduce((sum, t) => sum + parseFloat(t.serviceFee || 0), 0);
  const ticketCount = tickets.length;
  const orderId = generateOrderNumber(sessionId);

  // ═══════════════════════════════════════════════════════════════
  // ISO DATUMI ZA KALENDAR
  // ═══════════════════════════════════════════════════════════════
  let eventDatetimeIso = "", eventEndDatetimeIso = "", hasCalendarDates = false;
  try {
    const dateStr = eventDetails.rawDate || eventDetails.date || "";
    const timeStr = eventDetails.rawTime || eventDetails.time || "20:00";
    let year: number, month: number, day: number;
    if (dateStr.includes(".")) {
      const p = dateStr.split("."); day = parseInt(p[0]); month = parseInt(p[1]) - 1; year = parseInt(p[2]);
    } else if (dateStr.includes("-")) {
      const p = dateStr.split("-"); year = parseInt(p[0]); month = parseInt(p[1]) - 1; day = parseInt(p[2]);
    } else { throw new Error("Unknown date format"); }
    const tp = timeStr.split(":"); const hours = parseInt(tp[0]) || 20; const minutes = parseInt(tp[1]) || 0;
    const startDate = new Date(year!, month!, day!, hours, minutes);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    const fmtIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:00+01:00`;
    eventDatetimeIso = fmtIso(startDate); eventEndDatetimeIso = fmtIso(endDate);
    hasCalendarDates = true;
    console.log("📅 ISO dates generated:", eventDatetimeIso, "->", eventEndDatetimeIso);
  } catch (dateError: any) {
    console.warn("⚠️ Could not parse date for ISO format:", dateError.message);
  }

  const eventName = eventDetails.name || "Događaj";
  const eventDate = eventDetails.date || "TBA";
  const eventTime = eventDetails.time || "TBA";
  const eventVenue = eventDetails.venue || "TBA";
  const venueAddress = eventDetails.venueAddress || "";
  const venueCity = eventDetails.venueCity || "Podgorica";

  // ═══════════════════════════════════════════════════════════════
  // TICKET STUBS HTML
  // ═══════════════════════════════════════════════════════════════
  const ticketStubsHtml = tickets.map((t: any, i: number) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(t.qrCodeRaw || "ticket")}`;
    return `
<tr>
  <td style="padding: 0 28px 10px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="dm-card" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06);">
      <tr>
        <td width="5" style="background: linear-gradient(180deg, #1e3a8a, #2d55c7); width: 5px;"></td>
        <td style="padding: 16px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td valign="top">
                <p class="dm-blue-accent" style="margin: 0 0 2px 0; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #1e3a8a; text-transform: uppercase;">Ulaznica #${String(i + 1).padStart(2, "0")}</p>
                <p class="dm-text-primary" style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #1a1a2e;">${t.seatId || "Karta"}</p>
                <p class="dm-text-mono" style="margin: 0; font-size: 11px; color: #999; font-family: monospace;">${t.ticketId || ""}</p>
              </td>
              <td width="100" align="right" valign="top">
                <img src="${qrUrl}" alt="QR" width="96" height="96" style="border-radius: 4px; display: block;" />
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
  }).join("\n");

  // Calendar links
  let calendarHtml = "";
  if (hasCalendarDates) {
    const gcalUrl = buildGoogleCalendarUrl(eventName, eventVenue, venueAddress, venueCity, eventDatetimeIso, eventEndDatetimeIso, viewUrl);
    const outlookUrl = buildOutlookCalendarUrl(eventName, eventVenue, venueAddress, venueCity, eventDatetimeIso, eventEndDatetimeIso, viewUrl);
    calendarHtml = `
<tr>
  <td style="padding: 16px 28px 4px 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="50%" style="padding-right: 5px;">
          <a href="${gcalUrl}" target="_blank" style="display: block; padding: 11px 0; background-color: #1e3a8a; border-radius: 8px; font-size: 12px; font-weight: 600; color: #ffffff; text-decoration: none; text-align: center;">
            <img src="https://img.icons8.com/ios/14/ffffff/calendar--v1.png" alt="" width="12" height="12" style="vertical-align: middle; margin-right: 4px;"/>Google Calendar</a>
        </td>
        <td width="50%" style="padding-left: 5px;">
          <a href="${outlookUrl}" target="_blank" style="display: block; padding: 11px 0; background-color: #ffffff; border: 1.5px solid #1e3a8a; border-radius: 8px; font-size: 12px; font-weight: 600; color: #1e3a8a; text-decoration: none; text-align: center;">
            <img src="https://img.icons8.com/ios/14/1e3a8a/calendar--v1.png" alt="" width="12" height="12" style="vertical-align: middle; margin-right: 4px;"/>Outlook / Apple</a>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
  }

  // Price section
  const priceHtml = `
<tr>
  <td style="padding: 20px 28px 0 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="dm-card" style="background-color: #ffffff; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06);">
      <tr>
        <td style="padding: 18px 20px;">
          <p class="dm-text-muted" style="margin: 0 0 14px 0; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: #999; text-transform: uppercase;">Rekapitulacija</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td class="dm-text-secondary" style="font-size: 13px; color: #666; padding-bottom: 8px;">${ticketCount} ulaznice</td>
              <td align="right" class="dm-text-primary" style="font-size: 13px; color: #333; font-weight: 500; padding-bottom: 8px;">${subtotal.toFixed(2)}€</td>
            </tr>
            <tr>
              <td class="dm-text-secondary" style="font-size: 13px; color: #666; padding-bottom: 12px;">Naknada za obradu</td>
              <td align="right" class="dm-text-primary" style="font-size: 13px; color: #333; font-weight: 500; padding-bottom: 12px;">${serviceFee.toFixed(2)}€</td>
            </tr>
            <tr>
              <td colspan="2" class="dm-divider" style="border-top: 1px solid #f0ede8; padding-top: 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td class="dm-text-primary" style="font-size: 14px; font-weight: 600; color: #1a1a2e;">Ukupno plaćeno</td>
                    <td align="right" class="dm-price-value" style="font-size: 20px; font-weight: 700; color: #1a1a2e;">${totalAmount.toFixed(2)}€</td>
                  </tr>
                </table>
              </td>
            </tr>${cardDetails?.last4 ? `
            <tr>
              <td colspan="2" style="padding-top: 10px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td class="dm-text-secondary" style="font-size: 12px; color: #888;">Plaćeno karticom</td>
                    <td align="right" class="dm-text-secondary" style="font-size: 12px; color: #888;">${(cardDetails.brand || "Card").charAt(0).toUpperCase() + (cardDetails.brand || "card").slice(1)} •••• ${cardDetails.last4}</td>
                  </tr>
                </table>
              </td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;

  // ═══════════════════════════════════════════════════════════════
  // KOMPLETNI HTML - PREMIUM DIZAJN (identičan resend-tickets)
  // ═══════════════════════════════════════════════════════════════
  const htmlBody = `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Vaše karte - ${eventName}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "EventReservation",
  "reservationNumber": "${orderId}",
  "reservationStatus": "http://schema.org/ReservationConfirmed",
  "underName": { "@type": "Person", "name": "${customerName || ""}", "email": "${customerEmail}" },
  "reservationFor": {
    "@type": "Event",
    "name": "${eventName}",
    "startDate": "${eventDatetimeIso}",
    "endDate": "${eventEndDatetimeIso}",
    "location": {
      "@type": "Place",
      "name": "${eventVenue}",
      "address": { "@type": "PostalAddress", "streetAddress": "${venueAddress}", "addressLocality": "${venueCity}", "addressRegion": "${venueCity}", "postalCode": "81000", "addressCountry": "ME" }
    }
  },
  "numSeats": "${ticketCount}",
  "ticketNumber": "${orderId}",
  "ticketPrintUrl": "${viewUrl}",
  "modifyReservationUrl": "${viewUrl}",
  "checkinUrl": "${viewUrl}",
  "potentialAction": { "@type": "ViewAction", "url": "${viewUrl}", "name": "Prikaži ulaznice" },
  "price": "${totalAmount.toFixed(2)}",
  "priceCurrency": "EUR"
}
</script>
<style type="text/css">
:root{color-scheme:light dark;supported-color-schemes:light dark}
body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
body{margin:0!important;padding:0!important;width:100%!important}
@media (prefers-color-scheme:dark){
body,.dm-body{background-color:#1a1a2e!important}
.dm-content{background-color:#252540!important}
.dm-card{background-color:#2a2a45!important;border-color:rgba(255,255,255,0.1)!important}
.dm-text-primary{color:#e0e0e0!important}
.dm-text-secondary{color:#bbb!important}
.dm-text-muted{color:#aaa!important}
.dm-text-mono{color:#ccc!important}
.dm-divider{border-color:#3a3a55!important}
.dm-info{background-color:rgba(30,58,138,0.2)!important}
.dm-fiscal{background-color:rgba(22,101,52,0.15)!important}
.dm-fiscal p,.dm-fiscal a{color:#86efac!important}
.dm-refund{background-color:rgba(133,77,14,0.15)!important}
.dm-refund p,.dm-refund a{color:#fcd34d!important}
.dm-label{color:rgba(255,255,255,0.5)!important}
.dm-price-value{color:#e0e0e0!important}
.dm-header-dark{background-color:#1a1a2e!important}
.dm-blue-accent{color:#93b4ff!important}
.dm-link{color:#93b4ff!important}
.dm-footer-border{border-color:#3a3a55!important}
}
</style>
</head>
<body class="dm-body" style="margin:0;padding:0;background-color:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

<!-- Preview text -->
<div style="display:none;font-size:1px;color:#f0ede8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  Vaše karte za ${eventName} · ${eventDate} · ${eventTime} · ${eventVenue}
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="dm-body" style="background-color:#f0ede8;">
<tr>
<td align="center" style="padding: 32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">

<!-- DARK HEADER -->
<tr>
<td style="background-color:#1a1a2e;border-radius:16px 16px 0 0;padding:32px 28px 28px 28px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
    <tr>
      <td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="34" height="34" style="background-color:#1e3a8a;border-radius:8px;" align="center">
              <span style="color:#fff;font-size:16px;font-weight:700;line-height:34px;">e</span>
            </td>
            <td style="padding-left:10px;">
              <span style="color:#ffffff;font-size:16px;font-weight:600;letter-spacing:-0.01em;">e-tickets</span>
            </td>
          </tr>
        </table>
      </td>
      <td align="right">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background-color:rgba(30,58,138,0.15);border:1px solid rgba(30,58,138,0.3);border-radius:16px;padding:4px 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="6" height="6" style="background-color:#4ade80;border-radius:3px;"></td>
                  <td style="padding-left:6px;font-size:11px;color:rgba(255,255,255,0.9);font-weight:500;">Plaćanje potvrđeno</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 8px 0;font-size:11px;font-weight:500;letter-spacing:0.12em;color:rgba(255,255,255,0.5);text-transform:uppercase;">
    Potvrda rezervacije · #${orderId}
  </p>
  <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;">
    ${eventName}
  </h1>
</td>
</tr>

<!-- EVENT INFO BAR -->
<tr>
<td style="background-color:#1e3a8a;padding:0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td style="padding:12px 28px;border-right:1px solid rgba(255,255,255,0.2);" width="33%">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="16" valign="middle"><img src="https://img.icons8.com/ios/16/ffffff/calendar--v1.png" alt="" width="14" height="14" style="display:block;"/></td>
          <td style="padding-left:6px;font-size:13px;color:#ffffff;font-weight:600;" valign="middle">${eventDate}</td>
        </tr></table>
      </td>
      <td style="padding:12px 20px;border-right:1px solid rgba(255,255,255,0.2);" width="33%">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="16" valign="middle"><img src="https://img.icons8.com/ios/16/ffffff/clock--v1.png" alt="" width="14" height="14" style="display:block;"/></td>
          <td style="padding-left:6px;font-size:13px;color:#ffffff;font-weight:600;" valign="middle">${eventTime}</td>
        </tr></table>
      </td>
      <td style="padding:12px 20px;" width="34%">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="16" valign="middle"><img src="https://img.icons8.com/ios/16/ffffff/marker--v1.png" alt="" width="14" height="14" style="display:block;"/></td>
          <td style="padding-left:6px;font-size:13px;color:#ffffff;font-weight:600;" valign="middle">${eventVenue}</td>
        </tr></table>
      </td>
    </tr>
  </table>
</td>
</tr>

<!-- MAIN CONTENT -->
<tr>
<td class="dm-content" style="background-color:#f8f6f2;padding:0;border-radius:0 0 16px 16px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

    <!-- Greeting -->
    <tr>
      <td style="padding:28px 28px 8px 28px;">
        <p class="dm-text-primary" style="margin:0;font-size:15px;color:#444;line-height:1.6;">
          Dragi/a <strong class="dm-text-primary" style="color:#1a1a2e;">${customerName || "kupac"}</strong>,
        </p>
        <p class="dm-text-secondary" style="margin:8px 0 0;font-size:14px;color:#666;line-height:1.6;">
          Vaše ulaznice su spremne. Sačuvajte ih ili ih pokažite na ulazu.
        </p>
      </td>
    </tr>

    <!-- Tickets label -->
    <tr>
      <td style="padding:20px 28px 10px 28px;">
        <p class="dm-text-muted" style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.14em;color:#999;text-transform:uppercase;">Vaše ulaznice</p>
      </td>
    </tr>

    <!-- Ticket stubs -->
    ${ticketStubsHtml}

    <!-- CTA Button -->
    <tr>
      <td style="padding:14px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center" style="background-color:#1e3a8a;border-radius:10px;">
              <a href="${viewUrl}" target="_blank" style="display:block;padding:15px 0;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;text-align:center;">Prikaži sve ulaznice →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Calendar buttons -->
    ${calendarHtml}

    <!-- Price summary -->
    ${priceHtml}


    <!-- Fiscal notice -->
    <tr>
      <td style="padding:12px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="dm-fiscal" style="background-color:#f0fdf4;border-radius:8px;">
          <tr>
            <td style="padding:12px 14px;">
              <p class="dm-fiscal" style="margin:0;font-size:12px;color:#166534;line-height:1.5;">
                ${invoiceUrl
                  ? `<span style="font-weight:600;">✓ Vaše karte su fiskalizovane.</span> <a href="${invoiceUrl}" style="color:#166534;font-weight:600;text-decoration:underline;">Pogledajte fiskalni račun</a>`
                  : `<span style="font-weight:600;">✓ Vaše karte su fiskalizovane.</span> Ako niste dobili račun, kontaktirajte nas na <a href="mailto:support@e-tickets.me" style="color:#166534;font-weight:600;text-decoration:underline;">support@e-tickets.me</a>`
                }
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Refund notice -->
    <tr>
      <td style="padding:10px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="dm-refund" style="background-color:#fefce8;border-radius:8px;">
          <tr>
            <td style="padding:10px 14px;">
              <p class="dm-refund" style="margin:0;font-size:11px;color:#854d0e;line-height:1.4;"><strong>Povrat novca:</strong> pri otkazivanju ili odlaganju preko 120 dana. <a href="https://etiketing.me/povrat-ulaznica" style="color:#a16207;text-decoration:underline;font-weight:500;">Više</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td class="dm-footer-border" style="padding:24px 28px 6px 28px;border-top:1px solid #e5e0d8;margin-top:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <p class="dm-text-muted" style="margin:0 0 2px 0;font-size:11px;color:#aaa;">Datum kupovine</p>
              <p class="dm-text-secondary" style="margin:0;font-size:12px;color:#666;font-weight:500;">${new Date().toLocaleDateString("sr-ME")}</p>
            </td>
            <td align="right">
              <p class="dm-text-muted" style="margin:0 0 2px 0;font-size:11px;color:#aaa;">Pitanja i podrška</p>
              <a href="mailto:support@e-tickets.me" class="dm-link" style="font-size:12px;color:#1e3a8a;font-weight:500;text-decoration:none;">support@e-tickets.me</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Copyright -->
    <tr>
      <td style="padding:16px 28px 24px 28px;" align="center">
        <p class="dm-text-muted" style="margin:0;font-size:10px;color:#ccc;letter-spacing:0.05em;">
          © ${new Date().getFullYear()} etiketing.me · RAKUNAT DOO · Nikšić, Montenegro
        </p>
      </td>
    </tr>

  </table>
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>`;

  const payload = {
    from: { address: "noreply@my.e-tickets.me", name: "e-tickets" },
    to: [
      { email_address: { address: customerEmail, name: customerName || "" } },
      { email_address: { address: "tickets@e-tickets.me", name: "e-tickets Archive" } },
    ],
    subject: `🎫 Vaše karte: ${eventName}`,
    htmlbody: htmlBody,
    track_opens: true,
    track_clicks: false,
  };

  try {
    console.log("📧 Sending inline HTML email...");
    console.log("   To:", customerEmail);
    console.log("   Event:", eventName);

    const response = await fetch("https://api.zeptomail.eu/v1.1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: zohoApiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("📧 Email response:", response.status, responseText.substring(0, 200));

    return response.ok;
  } catch (error) {
    console.error("❌ Email error:", error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSE EVENT DETAILS - SA SVIM FALLBACK OPCIJAMA
// ═══════════════════════════════════════════════════════════════════════════

interface EventDetails {
  name: string;
  date: string;
  time: string;
  venue: string;
}

async function parseEventDetails(
  metadata: Record<string, string>,
  eventId: string | undefined,
  supabase: any
): Promise<EventDetails> {
  let eventDetails: EventDetails = {
    name: "",
    date: "",
    time: "",
    venue: "",
  };

  console.log("🔍 Parsing event details from metadata...");
  console.log("  Available metadata keys:", Object.keys(metadata));

  if (metadata.event_name) {
    console.log("  ✓ Found direct metadata fields (event_name)");
    eventDetails.name = metadata.event_name;
    eventDetails.date = metadata.event_date || "";
    eventDetails.time = metadata.event_time || "";
    eventDetails.venue = metadata.event_venue || metadata.venue || "";
  }
  else if (metadata.event_details) {
    console.log("  ✓ Found event_details JSON");
    try {
      const parsed = JSON.parse(metadata.event_details);
      eventDetails.name = parsed.name || parsed.n || parsed.eventName || "";
      eventDetails.date = parsed.date || parsed.d || parsed.eventDate || "";
      eventDetails.time = parsed.time || parsed.t || parsed.eventTime || "";
      eventDetails.venue = parsed.venue || parsed.v || parsed.location || "";
    } catch (e) {
      console.error("  ❌ Error parsing event_details JSON:", e);
    }
  }
  else if (metadata.name) {
    console.log("  ✓ Found short metadata fields (name)");
    eventDetails.name = metadata.name;
    eventDetails.date = metadata.date || "";
    eventDetails.time = metadata.time || "";
    eventDetails.venue = metadata.venue || "";
  }

  if (!eventDetails.name && eventId) {
    console.log("  ⚠️ Event details still empty, fetching from database...");

    try {
      const { data: seatEvent } = await supabase
        .from("SeatEvents")
        .select("name, eventName, date, time, venue, Lokacija")
        .or(`eventKey.eq.${eventId},eventId.eq.${eventId}`)
        .single();

      if (seatEvent) {
        console.log("  ✓ Found in SeatEvents");
        eventDetails.name = seatEvent.name || seatEvent.eventName || "";
        eventDetails.date = seatEvent.date || "";
        eventDetails.time = seatEvent.time || "";
        eventDetails.venue = seatEvent.venue || seatEvent.Lokacija || "";
      } else {
        const { data: simpleEvent } = await supabase
          .from("SimpleEvents")
          .select("name, eventName, date, time, venue")
          .or(`eventKey.eq.${eventId},eventId.eq.${eventId}`)
          .single();

        if (simpleEvent) {
          console.log("  ✓ Found in SimpleEvents");
          eventDetails.name = simpleEvent.name || simpleEvent.eventName || "";
          eventDetails.date = simpleEvent.date || "";
          eventDetails.time = simpleEvent.time || "";
          eventDetails.venue = simpleEvent.venue || "";
        }
      }
    } catch (dbError: any) {
      console.error("  ❌ Database fetch error:", dbError.message);
    }
  }

  eventDetails.date = formatDateForDisplay(eventDetails.date);
  eventDetails.time = formatTimeForDisplay(eventDetails.time);

  if (!eventDetails.name) eventDetails.name = "Događaj";
  if (!eventDetails.date) eventDetails.date = "TBA";
  if (!eventDetails.time) eventDetails.time = "TBA";
  if (!eventDetails.venue) eventDetails.venue = "TBA";

  console.log("  ✅ Final event details:", JSON.stringify(eventDetails));

  return eventDetails;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧾 FISKALIZACIJA HELPER
// ═══════════════════════════════════════════════════════════════════════════

async function triggerFiscalization(
  supabaseUrl: string,
  supabaseServiceKey: string,
  sessionId: string,
  eventId: string,
  salesChannel: string = "Online"
): Promise<{ success: boolean; invoiceUrl?: string; skipped?: boolean; reason?: string; error?: string }> {
  try {
    console.log("🧾 Pokretanje fiskalizacije...");
    console.log("   Session:", sessionId);
    console.log("   Event:", eventId);
    console.log("   Channel:", salesChannel);

    const fiscalizeResponse = await fetch(`${supabaseUrl}/functions/v1/fiscalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        sessionId: sessionId,
        eventId: eventId,
        salesChannel: salesChannel,
      }),
    });

    const fiscalizeResult = await fiscalizeResponse.json();

    if (fiscalizeResult.success) {
      console.log("✅ Fiskalizacija uspješna:", fiscalizeResult.invoiceUrl);
      return {
        success: true,
        invoiceUrl: fiscalizeResult.invoiceUrl
      };
    } else if (fiscalizeResult.skipped) {
      console.log("⏭️ Fiskalizacija preskočena:", fiscalizeResult.reason);
      return {
        success: false,
        skipped: true,
        reason: fiscalizeResult.reason
      };
    } else if (fiscalizeResult.alreadyExists) {
      console.log("ℹ️ Fiskalni račun već postoji:", fiscalizeResult.invoiceUrl);
      return {
        success: true,
        invoiceUrl: fiscalizeResult.invoiceUrl
      };
    } else {
      console.log("⚠️ Fiskalizacija neuspješna:", fiscalizeResult.error);
      return {
        success: false,
        error: fiscalizeResult.error
      };
    }
  } catch (fiscalError: any) {
    console.error("❌ Fiscalize error:", fiscalError.message);
    return {
      success: false,
      error: fiscalError.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_SEAT")!;
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_SEAT")!;
    const seatsioKey = Deno.env.get("SEATS_IO_SECRET_KEY") || "";
    const hmacSecret = Deno.env.get("HMAC_SECRET_KEY") || "ETK-9f38d1a2-cc49-4e3b-b182-7f94c2d9f6aa-2025";
    const zohoApiKey = Deno.env.get("ZOHO_API_KEY") || "";
    // ZEPTO_TEMPLATE_TICKET više nije potreban - koristimo inline HTML
    const messaggioApiKey = Deno.env.get("MESSAGGIO_API_KEY") || "";
    const messaggioSenderCode = Deno.env.get("MESSAGGIO_SENDER_CODE") || "";
    const tinyUrlKey = Deno.env.get("TINYURL_API_KEY") || "";
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://etiketing.me";
    const wixBackupEnabled = Deno.env.get("WIX_BACKUP_ENABLED") !== "false";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("No Stripe signature");
      return new Response("No signature", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║       STRIPE WEBHOOK SEAT - SUPABASE                      ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
    console.log("Event type:", event.type);
    console.log("Event ID:", event.id);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("Session ID:", session.id);
      console.log("Payment status:", session.payment_status);

      // ═══════════════════════════════════════════════════════════════
      // 🛡️ GUARD: Samo "seat" sesije — match sesije ignorišemo
      // ═══════════════════════════════════════════════════════════════
      const eventType = session.metadata?.event_type;
      if (eventType === "match") {
        console.log("⏭️ Skipping match session — handled by stripe-webhook-match");
        return new Response(JSON.stringify({ received: true, skipped: true, reason: "match session" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // 🛡️ GUARD: Donacije ignorišemo — obrađuje stripe-webhook-memorijal
      // ═══════════════════════════════════════════════════════════════
      if (session.metadata?.donation_type) {
        console.log("⏭️ Skipping donation session — handled by stripe-webhook-memorijal");
        return new Response(JSON.stringify({ received: true, skipped: true, reason: "donation session" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (session.payment_status !== "paid") {
        console.log("Payment not completed, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // 🔒 FIX: ODMAH ZAUZMI WEBHOOK - PRIJE SVEGA OSTALOG
      // Kolona je "stripeEventId" (ne "webhookId"!)
      // Tabela ima UNIQUE constraint na "stripeEventId"
      // ═══════════════════════════════════════════════════════════════
      const { data: existingWebhook } = await supabase
        .from("ProcessedWebhooks")
        .select("id")
        .eq("stripeEventId", event.id)
        .maybeSingle();

      if (existingWebhook) {
        console.log("⚠️ Already processed:", event.id);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // 🔒 ODMAH upiši da je webhook u obradi - PRIJE kreiranja karata!
      // Ovo je ključna promjena koja sprečava duplikate.
      // Ako drugi webhook poziv dođe dok ovaj radi, UNIQUE constraint
      // na "stripeEventId" će ga blokirati.
      const { error: lockError } = await supabase
        .from("ProcessedWebhooks")
        .insert({
          stripeEventId: event.id,
          sessionId: session.id,
          status: "processing",
        });

      if (lockError) {
        // Ako insert failuje zbog UNIQUE constrainta, to znači da je
        // drugi webhook poziv upravo upisao isti zapis = duplikat
        if (lockError.code === "23505") {
          console.log("⚠️ Webhook already being processed (concurrent):", event.id);
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        console.error("❌ Error locking webhook:", lockError.message);
        // Nastavi ipak - bolje duplikat nego izgubljena kupovina
      }

      // 🔒 DODATNA ZAŠTITA: Provjeri da li za ovu Stripe sesiju već postoje karte
      const { data: existingTickets } = await supabase
        .from("QRKarte")
        .select("id")
        .eq("sessionId", session.id)
        .limit(1);

      if (existingTickets && existingTickets.length > 0) {
        console.log("⚠️ Tickets already exist for session:", session.id);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const metadata = session.metadata || {};
      const eventId = metadata.event_id || metadata.eventId || "";
      const holdToken = metadata.hold_token || metadata.holdToken || null;

      console.log("Event ID:", eventId);
      console.log("Hold token:", holdToken || "NONE");
      console.log("Metadata:", JSON.stringify(metadata));

      // ═══════════════════════════════════════════════════════════════
      // PARSE EVENT DETAILS SA FALLBACK
      // ═══════════════════════════════════════════════════════════════
      const eventDetails = await parseEventDetails(metadata, eventId, supabase);

      // ═══════════════════════════════════════════════════════════════
      // PARSE SEATS FROM CHUNKS
      // ═══════════════════════════════════════════════════════════════
      let seats: any[] = [];
      const seatsChunks = parseInt(metadata.seats_chunks || "0");

      if (seatsChunks > 0) {
        let seatsJson = "";
        for (let i = 0; i < seatsChunks; i++) {
          seatsJson += metadata[`seats_${i}`] || "";
        }
        try {
          seats = JSON.parse(seatsJson);
          console.log("✅ Parsed seats:", seats.length);
        } catch (e) {
          console.error("❌ Error parsing seats JSON:", e);
        }
      } else if (metadata.seats) {
        try {
          seats = JSON.parse(metadata.seats);
          console.log("✅ Parsed seats from single field:", seats.length);
        } catch (e) {
          console.error("❌ Error parsing seats:", e);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // CUSTOMER DATA
      // ═══════════════════════════════════════════════════════════════
      let customerPhone = session.customer_details?.phone || "";
      let customerGender = "";
      let customerCity = session.customer_details?.address?.city || "";
      let customerZip = session.customer_details?.address?.postal_code || "";
      let customerAddress = session.customer_details?.address?.line1 || "";

      if (session.custom_fields) {
        const polField = session.custom_fields.find((f: any) => f.key === "pol");
        customerGender = polField?.dropdown?.value || "";
      }

      const customerEmail = session.customer_details?.email || "";
      const customerName = session.customer_details?.name || "";
      const customerCountry = session.customer_details?.address?.country || "";
      const termsAccepted = session.consent?.terms_of_service === "accepted";

      // Fallback: read from metadata if Stripe session doesn't have them
      if (!customerPhone) customerPhone = metadata.customer_phone || "";
      if (!customerGender) customerGender = metadata.customer_gender || "";
      if (!customerCity) customerCity = metadata.customer_city || "";
      if (!customerZip) customerZip = metadata.customer_zip || "";
      if (!customerAddress) customerAddress = metadata.customer_address || "";
      if (!customerCountry) customerAddress = metadata.customer_country || "";

      console.log("Customer:", customerEmail, customerPhone, customerCity, customerZip, customerAddress);

      // ═══════════════════════════════════════════════════════════════
      // 1️⃣ BOOK SEATS IN SEATS.IO
      // ⚠️ Ako booking ne uspije, NE kreiraj karte!
      // Inače sjedište ostaje slobodno na seats.io i drugi kupac ga može kupiti.
      // ═══════════════════════════════════════════════════════════════
      console.log("1️⃣ Booking seats in Seats.io...");

      // Produlji hold token prije bookinga (max +30 min) da ne istekne tokom procesiranja
      if (holdToken && seatsioKey) {
        try {
          console.log("🔒 Extending hold token before booking...");
          const extendResponse = await fetch(
            `https://api-eu.seatsio.net/hold-tokens/${holdToken}`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(seatsioKey + ":")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ expiresInMinutes: 30 }),
            }
          );
          if (extendResponse.ok) {
            console.log("✅ Hold token extended by 30 minutes");
          } else {
            const extErr = await extendResponse.text();
            console.log("⚠️ Could not extend hold token (may be expired):", extErr.substring(0, 200));
          }
        } catch (extError: any) {
          console.log("⚠️ Hold token extend error (non-blocking):", extError.message);
        }
      }

      // Skip Seats.io booking for festival/simple events (no seat map)
      const skipSeatsio = eventType === "festival" || eventType === "simple" || !holdToken;

      if (seatsioKey && eventId && seats.length > 0 && !skipSeatsio) {
        let booked = false;
        let lastError = "";
        const maxRetries = 5;
        const orderId = generateOrderNumber(session.id);

        // Pokušaj 1: sa holdTokenom (standardni flow)
        const bookingResult = await bookSeatsInSeatsio(
          eventId,
          seats,
          orderId,
          holdToken,
          seatsioKey
        );

        console.log("Booking result:", bookingResult.message);

        if (bookingResult.success) {
          booked = true;
        } else {
          lastError = bookingResult.message;
          console.error("⚠️ Initial booking failed:", lastError);

          // Retry petlja: pokušaj bez holdTokena do maxRetries puta
          for (let attempt = 2; attempt <= maxRetries; attempt++) {
            const waitMs = attempt * 2000; // 4s, 6s, 8s, 10s
            console.log(`🔄 Retry ${attempt}/${maxRetries} — čekam ${waitMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));

            const retryResult = await bookSeatsInSeatsio(
              eventId,
              seats,
              orderId,
              null, // bez holdTokena
              seatsioKey
            );

            if (retryResult.success) {
              console.log(`✅ Booking succeeded on retry ${attempt}: ${retryResult.message}`);
              booked = true;
              break;
            }

            lastError = retryResult.message;
            console.error(`⚠️ Retry ${attempt} failed: ${lastError}`);
          }
        }

        if (!booked) {
          console.error("❌ SEATS.IO BOOKING FAILED nakon svih pokušaja - NE KREIRAM KARTE!");
          console.error("❌ Zadnja greška:", lastError);

          await supabase
            .from("ProcessedWebhooks")
            .update({
              status: "failed_booking",
              errorMessage: `Seats.io booking failed nakon ${maxRetries} pokušaja: ${lastError}`
            })
            .eq("stripeEventId", event.id);

          return new Response(JSON.stringify({
            received: true,
            error: "Seats.io booking failed",
            details: `Failed after ${maxRetries} attempts: ${lastError}`,
            sessionId: session.id,
            eventId: event.id,
          }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      } else {
        if (skipSeatsio) {
          console.log("ℹ️ Seats.io booking skipped — event type:", eventType || "no-hold-token");
        } else {
          console.log("ℹ️ Seats.io booking skipped - missing config or no seats");
          if (seatsioKey && eventId) {
            console.warn("⚠️ seatsioKey and eventId present but seats empty — possible parsing issue");
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // GET CARD DETAILS
      // ═══════════════════════════════════════════════════════════════
      let cardDetails: any = null;
      if (session.payment_intent) {
        const paymentIntentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id;

        cardDetails = await getCardDetailsFromCharge(stripe, paymentIntentId);
      }

      // ═══════════════════════════════════════════════════════════════
      // 2️⃣ CREATE TICKETS IN DATABASE
      // ═══════════════════════════════════════════════════════════════
      console.log("2️⃣ Creating tickets in database...");

      const totalAmount = (session.amount_total || 0) / 100;
      const currency = session.currency?.toUpperCase() || "EUR";
      const now = new Date();
      const purchaseDate = now.toISOString().split("T")[0];
      const purchaseTime = now.toLocaleTimeString("en-GB", {
        timeZone: "Europe/Podgorica",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const viewUrl = `${appBaseUrl}/tickets?sessionId=${session.id}`;
      console.log("✅ View URL:", viewUrl);

      const createdTickets: any[] = [];

      const calculateServiceFee = (price: number): number => {
        return price * 0.05 + 0.30;
      };

      // 🔒 FIX: Batch insert umjesto jednu po jednu kartu
      // Ovo je brže i atomičnije
      const ticketDataArray: Record<string, any>[] = [];

      for (const seat of seats) {
        const seatId = seat.id || seat.i || "";
        const ticketId = generateUniqueTicketId();
        const { qrCodeRaw, qrCodeUrl } = await generateSignedQRCode(eventId, ticketId, hmacSecret);

        const seatPrice = parseFloat(seat.p || seat.price || 0);
        const seatServiceFee = calculateServiceFee(seatPrice);
        const hasInsurance = metadata.has_insurance === "true";
        const seatInsurancePrice = hasInsurance ? Math.round(seatPrice * 0.07 * 100) / 100 : 0;
        const seatTotalPrice = seatPrice + seatServiceFee + seatInsurancePrice;

        ticketDataArray.push({
          ticketId: ticketId,
          "order number": generateOrderNumber(session.id),
          sessionId: session.id,

          eventName: eventDetails.name,
          eventId: eventId,
          eventDate: eventDetails.date,
          eventTime: eventDetails.time,
          Lokacija: eventDetails.venue,

          seatId: seatId,
          category: seat.c || seat.category || "",
          sectionLabel: seat.sl || seat.sectionLabel || "",
          categoryKey: seat.ck || seat.categoryKey || "",
          categoryLabel: seat.cl || seat.categoryLabel || "",
          entrance: seat.e || seat.entrance || "",
          View: seat.view || seat.v || "",
          viewQuality: seat.vq || seat.viewQuality || "",

          price: seatPrice.toString(),
          serviceFee: seatServiceFee.toFixed(2),
          totalPrice: seatTotalPrice.toFixed(2),
          Valuta: currency,

          customerName: customerName,
          "Customer Email": customerEmail,
          customerPhone: customerPhone,
          customerGender: customerGender,
          city: customerCity,
          zip: customerZip,
          address: customerAddress,
          country: customerCountry,

          qrCodeRaw: qrCodeRaw,
          "QR Code": qrCodeUrl,

          status: "active",
          isUsed: false,
          validationCount: 0,

          Purchasedate: purchaseDate,
          purchaseTime: purchaseTime,
          salesChannel: "Online",

          termsOfServiceAccepted: termsAccepted,
          insurance: hasInsurance,
          insurancePrice: seatInsurancePrice > 0 ? seatInsurancePrice.toFixed(2) : null,

          cardIIN: cardDetails?.iin || "",
          cardBin: cardDetails?.iin || "",
          cardLast4: cardDetails?.last4 || "",
          cardBrand: cardDetails?.brand || "",
          cardFunding: cardDetails?.funding || "",
          cardCountry: cardDetails?.country || "",
          cardFingerprint: cardDetails?.fingerprint || "",
          cardIssuer: cardDetails?.issuer || "",
          cardNetwork: cardDetails?.network || "",
          cardDescription: cardDetails?.description || "",
        });
      }

      // 🔒 BATCH INSERT - jedan upit umjesto N upita
      if (ticketDataArray.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from("QRKarte")
          .insert(ticketDataArray)
          .select();

        if (insertError) {
          console.error("❌ Error batch inserting tickets:", insertError.message);
          // Fallback: probaj jednu po jednu
          for (const ticketData of ticketDataArray) {
            const { data, error } = await supabase.from("QRKarte").insert(ticketData).select();
            if (error) {
              console.error("❌ Error saving ticket:", ticketData.ticketId, error.message);
            } else if (data && data[0]) {
              createdTickets.push({ ...ticketData, id: data[0].id });
            }
          }
        } else if (insertedData) {
          console.log("✅ All tickets inserted in batch:", insertedData.length);
          insertedData.forEach((row: any, i: number) => {
            createdTickets.push({ ...ticketDataArray[i], id: row.id });
          });
        }
      }

      console.log("Total tickets created:", createdTickets.length);

      // ═══════════════════════════════════════════════════════════════
      // 3️⃣ 🧾 FISKALIZACIJA
      // ═══════════════════════════════════════════════════════════════
      console.log("3️⃣ Fiskalizacija...");

      const fiscalResult = await triggerFiscalization(
        supabaseUrl,
        supabaseServiceKey,
        session.id,
        eventId,
        "Online"
      );

      if (fiscalResult.success) {
        console.log("✅ Fiskalizacija završena:", fiscalResult.invoiceUrl);
      } else if (fiscalResult.skipped) {
        console.log("⏭️ Fiskalizacija preskočena:", fiscalResult.reason);
      } else {
        console.log("⚠️ Fiskalizacija nije uspjela:", fiscalResult.error);
      }

      // ═══════════════════════════════════════════════════════════════
      // 4️⃣ 📊 ANALYTICS - SAČUVAJ KONVERZIJU
      // ═══════════════════════════════════════════════════════════════
      console.log("4️⃣ Saving analytics conversion...");

      try {
        const analyticsVisitorId = metadata.visitor_id || metadata.analytics_visitor_id || null;
        const analyticsSessionId = metadata.analytics_session_id || null;
        const analyticsUtmSource = metadata.utm_source || 'direct';
        const analyticsUtmMedium = metadata.utm_medium || 'none';
        const analyticsUtmCampaign = metadata.utm_campaign || null;
        const analyticsUtmContent = metadata.utm_content || null;
        const analyticsGclid = metadata.gclid || null;
        const analyticsFbclid = metadata.fbclid || null;
        const analyticsLandingPage = metadata.landing_page || null;

        const conversionData = {
          visitor_id: analyticsVisitorId,
          session_id: analyticsSessionId,

          stripe_session_id: session.id,
          stripe_payment_intent: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent as any)?.id || null,
          stripe_customer_id: typeof session.customer === 'string'
            ? session.customer
            : (session.customer as any)?.id || null,
          stripe_customer_email: customerEmail,

          amount: totalAmount,
          currency: currency,

          utm_source: analyticsUtmSource,
          utm_medium: analyticsUtmMedium,
          utm_campaign: analyticsUtmCampaign,
          utm_content: analyticsUtmContent,
          gclid: analyticsGclid,
          fbclid: analyticsFbclid,
          landing_page: analyticsLandingPage,

          event_id: eventId || null,
          event_name: eventDetails.name || null,
          ticket_type: seats.length > 0 ? (seats[0].c || seats[0].category || null) : null,
          quantity: createdTickets.length,
        };

        const { error: conversionError } = await supabase
          .from("analytics_conversions")
          .insert(conversionData);

        if (conversionError) {
          console.error("❌ Analytics conversion error:", conversionError.message);
        } else {
          console.log("✅ Analytics conversion saved");
          console.log("   Source:", analyticsUtmSource, "/", analyticsUtmMedium);
          console.log("   Amount:", totalAmount, currency);
          console.log("   Visitor:", analyticsVisitorId || "unknown");
        }

        if (analyticsVisitorId) {
          const { data: visitor } = await supabase
            .from("analytics_visitors")
            .select("id, conversion_count, total_revenue")
            .eq("visitor_id", analyticsVisitorId)
            .single();

          if (visitor) {
            await supabase
              .from("analytics_visitors")
              .update({
                converted: true,
                conversion_count: (visitor.conversion_count || 0) + 1,
                total_revenue: (parseFloat(visitor.total_revenue) || 0) + totalAmount,
                updated_at: new Date().toISOString(),
              })
              .eq("visitor_id", analyticsVisitorId);

            console.log("✅ Visitor marked as converted");
          }
        }

        const today = new Date().toISOString().split('T')[0];

        const { data: dailyStats } = await supabase
          .from("analytics_daily_stats")
          .select("id, conversions, revenue")
          .eq("date", today)
          .eq("utm_source", analyticsUtmSource)
          .eq("utm_medium", analyticsUtmMedium)
          .single();

        if (dailyStats) {
          await supabase
            .from("analytics_daily_stats")
            .update({
              conversions: (dailyStats.conversions || 0) + 1,
              revenue: (parseFloat(dailyStats.revenue as any) || 0) + totalAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", dailyStats.id);
        } else {
          await supabase
            .from("analytics_daily_stats")
            .insert({
              date: today,
              utm_source: analyticsUtmSource,
              utm_medium: analyticsUtmMedium,
              conversions: 1,
              revenue: totalAmount,
            });
        }

        console.log("✅ Daily stats updated");

      } catch (analyticsError: any) {
        console.error("⚠️ Analytics error (non-blocking):", analyticsError.message);
      }

      // ═══════════════════════════════════════════════════════════════
      // 5️⃣ WIX BACKUP
      // ═══════════════════════════════════════════════════════════════
      console.log("5️⃣ Wix backup...");

      if (wixBackupEnabled && createdTickets.length > 0) {
        backupToWix(createdTickets, session.id, "stripe-webhook-seat").catch(e => {
          console.error("Wix backup failed (non-blocking):", e.message);
        });
      } else {
        console.log("ℹ️ Wix backup skipped");
      }

      // ═══════════════════════════════════════════════════════════════
      // 6️⃣ EMAIL NOTIFIKACIJA
      // ═══════════════════════════════════════════════════════════════
      console.log("6️⃣ Email notification...");

      if (customerEmail && zohoApiKey) {
        console.log("📧 Sending email to:", customerEmail);
        await sendEmailConfirmation(
          customerEmail,
          customerName,
          customerPhone,
          {
            ...eventDetails,
            rawDate: metadata.event_date || metadata.date || "",
            rawTime: metadata.event_time || metadata.time || "",
            venueAddress: metadata.venue_address || "",
            venueCity: metadata.venue_city || "Podgorica",
            imageUrl: metadata.event_image || "",
            pageUrl: metadata.event_url || "",
          },
          createdTickets,
          totalAmount,
          currency,
          session.id,
          viewUrl,
          zohoApiKey,
          cardDetails,
          fiscalResult?.invoiceUrl
        );
      } else {
        console.log("ℹ️ Email skipped - missing config or email");
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 7️⃣ WHATSAPP NOTIFIKACIJA
      // ═══════════════════════════════════════════════════════════════════════
      console.log("7️⃣ WhatsApp notification...");

      let whatsappSent = false;
      let messageId: string | null = null;
      let failureReason: string | null = null;

      const formattedPhone = formatPhoneNumber(customerPhone);
      console.log("  Raw phone:", customerPhone);
      console.log("  Formatted phone:", formattedPhone);

      const hasValidPhone = formattedPhone && formattedPhone.length >= 10;

      if (hasValidPhone && messaggioApiKey && messaggioSenderCode) {
        try {
          console.log("  📱 Šaljem WhatsApp na:", formattedPhone);

          const shortUrl = await shortenUrl(viewUrl, tinyUrlKey);
          const ticketCount = createdTickets.length;
          const ticketLinksText = ticketCount === 1
            ? `Vaša karta: ${shortUrl}`
            : `Vaših ${ticketCount} karata: ${shortUrl}`;

          const dlrCallbackUrl = `${supabaseUrl}/functions/v1/messaggio-webhook`;
          console.log("  📡 DLR Callback URL:", dlrCallbackUrl);

          const whatsappPayload = {
            recipients: [{ phone: formattedPhone }],
            channels: ["whatsapp"],
            options: {
              ttl: 120,
              external_id: `etickets_${session.id.slice(-12)}`,
              dlr_callback_url: dlrCallbackUrl
            },
            whatsapp: {
              from: messaggioSenderCode,
              content: [{
                type: "template",
                template: {
                  id: "potvrda_kupovine_3",
                  language: "en",
                  body: {
                    parameters: [
                      { text: eventDetails.name },
                      { text: eventDetails.date },
                      { text: eventDetails.time },
                      { text: eventDetails.venue },
                      { text: `${totalAmount.toFixed(2)} ${currency}` },
                      { text: ticketLinksText },
                    ],
                  },
                },
              }],
            },
          };

          console.log("  WhatsApp payload:", JSON.stringify(whatsappPayload, null, 2));

          const whatsappResponse = await fetch("https://msg.messaggio.com/api/v1/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Messaggio-Login": messaggioApiKey
            },
            body: JSON.stringify(whatsappPayload),
          });

          const whatsappResult = await whatsappResponse.json();
          console.log("  WhatsApp API response:", JSON.stringify(whatsappResult));

          messageId = whatsappResult.messages?.[0]?.message_id || null;
          whatsappSent = whatsappResponse.ok && !!messageId;

          if (whatsappSent) {
            console.log("  ✅ WhatsApp poslan! Message ID:", messageId);
          } else {
            failureReason = whatsappResult.messages?.[0]?.error?.detail ||
                           whatsappResult.error?.detail ||
                           JSON.stringify(whatsappResult);
            console.log("  ⚠️ WhatsApp API odbio:", failureReason);
          }

        } catch (whatsappError: any) {
          console.error("  ❌ WhatsApp error:", whatsappError.message);
          failureReason = `Network error: ${whatsappError.message}`;
        }
      } else {
        if (!hasValidPhone) {
          failureReason = "No valid phone number";
        } else {
          failureReason = "WhatsApp API not configured";
        }
        console.log("  ℹ️ WhatsApp skipped:", failureReason);
      }

      try {
        const logEntry = {
          messageId: messageId,
          sessionId: session.id,
          type: "template",
          status: whatsappSent ? "sent" : (hasValidPhone ? "failed" : "skipped"),
          deliveryStatus: whatsappSent ? "pending" : "failed",
          phoneNumber: formattedPhone || customerPhone || "N/A",
          customerName: customerName || "",
          customerEmail: customerEmail || "",
          eventName: eventDetails.name,
          eventId: eventId,
          templateUsed: hasValidPhone ? "potvrda_kupovine_3" : null,
          ticketUrl: viewUrl,
          ticketCount: createdTickets.length,
          totalAmount: totalAmount.toFixed(2),
          currency: currency,
          hasWhatsApp: whatsappSent || null,
          failureReason: failureReason,
          sentAt: whatsappSent ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
        };

        const { error: logError } = await supabase.from("WhatsAppLogs").insert(logEntry);

        if (logError) {
          console.error("  ❌ WhatsApp log error:", logError);
        } else {
          console.log("  ✅ WhatsApp logged to Supabase");
        }
      } catch (logErr: any) {
        console.error("  ⚠️ WhatsApp logging failed:", logErr.message);
      }

      // ═══════════════════════════════════════════════════════════════
      // 8️⃣ SMS NOTIFIKACIJA - SAMO ZA CRNOGORSKE BROJEVE (382)
      // ═══════════════════════════════════════════════════════════════
      console.log("8️⃣ SMS notification...");

      let smsSent = false;
      let smsMessageId: string | null = null;

      const isMontenegrinNumber = formattedPhone && formattedPhone.startsWith("382");

      if (isMontenegrinNumber && !whatsappSent) {
        try {
          console.log("  📲 Pozivam send-sms Edge funkciju za:", formattedPhone);

          const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              phoneNumber: formattedPhone,
              type: "confirmation",
              eventName: eventDetails.name,
              eventDate: eventDetails.date,
              eventTime: eventDetails.time,
              venue: eventDetails.venue,
              sessionId: session.id,
              viewUrl: viewUrl,
              ticketCount: createdTickets.length,
              totalAmount: totalAmount.toFixed(2),
              currency: currency,
            }),
          });

          const smsResult = await smsResponse.json();

          if (smsResult.success) {
            smsSent = true;
            smsMessageId = smsResult.messageId;
            console.log("  ✅ SMS poslan, ID:", smsMessageId);
          } else {
            console.log("  ⚠️ SMS nije poslan:", smsResult.error);
          }

        } catch (smsError: any) {
          console.error("  ❌ SMS error:", smsError.message);
        }
      } else {
        console.log("  ℹ️ SMS preskočen - nije crnogorski broj:", formattedPhone);
      }

      console.log(`📊 Notification results: WhatsApp=${whatsappSent}, SMS=${smsSent}`);

      // ═══════════════════════════════════════════════════════════════
      // ✅ Ažuriraj status na "completed"
      // ═══════════════════════════════════════════════════════════════
      await supabase
        .from("ProcessedWebhooks")
        .update({ status: "completed" })
        .eq("stripeEventId", event.id);

      console.log("╔═══════════════════════════════════════════════════════════╗");
      console.log("║       ✅ WEBHOOK PROCESSING COMPLETE                      ║");
      console.log("╚═══════════════════════════════════════════════════════════╝");
      console.log("Summary:");
      console.log("  - Tickets created:", createdTickets.length);
      console.log("  - Fiscalization:", fiscalResult.success ? "✅" : (fiscalResult.skipped ? "⏭️" : "❌"));
      console.log("  - Email:", customerEmail ? "✅" : "⏭️");
      console.log("  - WhatsApp:", whatsappSent ? "✅" : "⏭️");
      console.log("  - SMS:", smsSent ? "✅" : "⏭️");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎪 FESTIVAL: payment_intent.amount_capturable_updated
    // Festival koristi PaymentIntent sa capture_method: "manual"
    // Kad kupac potvrdi, Stripe šalje ovaj event — mi capture-amo i kreiramo karte
    // ═══════════════════════════════════════════════════════════════════════
    if (event.type === "payment_intent.amount_capturable_updated") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const metadata = pi.metadata || {};

      console.log("╔═══════════════════════════════════════════════════════════╗");
      console.log("║       🎪 FESTIVAL PAYMENT INTENT HANDLER                  ║");
      console.log("╚═══════════════════════════════════════════════════════════╝");
      console.log("PaymentIntent ID:", pi.id);
      console.log("Amount:", pi.amount, "cents");
      console.log("Metadata:", JSON.stringify(metadata));

      // 🛡️ GUARD: Samo festival events
      if (metadata.event_type !== "festival") {
        console.log("⏭️ Skipping non-festival payment_intent:", metadata.event_type);
        return new Response(JSON.stringify({ received: true, skipped: true, reason: "not festival" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // 🔒 DUPLIKAT ZAŠTITA
      // ═══════════════════════════════════════════════════════════════
      const { data: existingWebhook } = await supabase
        .from("ProcessedWebhooks")
        .select("id")
        .eq("stripeEventId", event.id)
        .maybeSingle();

      if (existingWebhook) {
        console.log("⚠️ Already processed:", event.id);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const { error: lockError } = await supabase
        .from("ProcessedWebhooks")
        .insert({
          stripeEventId: event.id,
          sessionId: pi.id,
          status: "processing",
        });

      if (lockError) {
        if (lockError.code === "23505") {
          console.log("⚠️ Webhook already being processed (concurrent):", event.id);
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        console.error("❌ Error locking webhook:", lockError.message);
      }

      // Provjeri da li karte već postoje
      const { data: existingTickets } = await supabase
        .from("QRKarte")
        .select("id")
        .eq("sessionId", pi.id)
        .limit(1);

      if (existingTickets && existingTickets.length > 0) {
        console.log("⚠️ Tickets already exist for PI:", pi.id);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // 1️⃣ CAPTURE PAYMENT
      // ═══════════════════════════════════════════════════════════════
      console.log("1️⃣ Capturing payment...");
      try {
        const capturedPI = await stripe.paymentIntents.capture(pi.id);
        console.log("✅ Payment captured! Status:", capturedPI.status);
      } catch (captureError: any) {
        console.error("❌ CAPTURE FAILED:", captureError.message);
        await supabase
          .from("ProcessedWebhooks")
          .update({ status: "failed_capture", errorMessage: captureError.message })
          .eq("stripeEventId", event.id);
        return new Response(JSON.stringify({
          received: true,
          error: "Payment capture failed",
          details: captureError.message,
        }), {
          headers: { "Content-Type": "application/json" },
          status: 500,
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // 2️⃣ PARSE EVENT & TICKET DATA
      // ═══════════════════════════════════════════════════════════════
      let eventId = metadata.event_id || "";
      const eventDetails = await parseEventDetails(metadata, eventId, supabase);

      // Resolve real eventId from AboutEvents
      if (eventId) {
        try {
          let aboutEvent = null;
          const { data: byEventId } = await supabase
            .from("AboutEvents")
            .select("eventId, eventKey, slug")
            .eq("eventId", eventId)
            .single();
          if (byEventId) {
            aboutEvent = byEventId;
          } else {
            const { data: bySlug } = await supabase
              .from("AboutEvents")
              .select("eventId, eventKey, slug")
              .eq("slug", eventId)
              .single();
            if (bySlug) {
              aboutEvent = bySlug;
            } else {
              const { data: byId } = await supabase
                .from("AboutEvents")
                .select("eventId, eventKey, slug")
                .eq("id", eventId)
                .single();
              if (byId) aboutEvent = byId;
            }
          }
          if (aboutEvent) {
            const resolvedId = aboutEvent.eventKey || aboutEvent.eventId || eventId;
            if (resolvedId !== eventId) {
              console.log(`✅ Resolved eventId: ${eventId} → ${resolvedId}`);
              eventId = resolvedId;
            }
          }
        } catch (e: any) {
          console.error("⚠️ Could not resolve eventId:", e.message);
        }
      }

      // Parse tickets from chunks (seats_0, seats_1, ...)
      let festivalTickets: any[] = [];
      const seatsChunks = parseInt(metadata.seats_chunks || "0");
      if (seatsChunks > 0) {
        let seatsJson = "";
        for (let i = 0; i < seatsChunks; i++) {
          seatsJson += metadata[`seats_${i}`] || "";
        }
        try {
          festivalTickets = JSON.parse(seatsJson);
          console.log("✅ Parsed festival tickets:", festivalTickets.length);
        } catch (e) {
          console.error("❌ Error parsing tickets JSON:", e);
        }
      }

      // Fallback: ticket_count
      if (festivalTickets.length === 0) {
        const ticketCount = parseInt(metadata.ticket_count || "0");
        if (ticketCount > 0) {
          console.log("⚠️ No ticket chunks found, creating from ticket_count:", ticketCount);
          for (let i = 0; i < ticketCount; i++) {
            festivalTickets.push({ c: metadata.event_name || "Karta", p: 0, i: `ticket-${i + 1}` });
          }
        }
      }

      console.log("Total festival tickets to create:", festivalTickets.length);

      // ═══════════════════════════════════════════════════════════════
      // CUSTOMER DATA (from metadata — PaymentIntent has no customer_details)
      // ═══════════════════════════════════════════════════════════════
      const customerName = metadata.customer_name || "";
      const customerEmail = metadata.customer_email || "";
      const customerPhone = metadata.customer_phone || "";
      const customerAddress = metadata.customer_address || "";
      const customerCity = metadata.customer_city || "";
      const customerZip = metadata.customer_zip || "";
      const customerCountry = metadata.customer_country || "";

      console.log("Customer:", customerEmail, customerPhone, customerCity);

      // ═══════════════════════════════════════════════════════════════
      // 3️⃣ GET CARD DETAILS (after capture)
      // ═══════════════════════════════════════════════════════════════
      const cardDetails = await getCardDetailsFromCharge(stripe, pi.id);

      // ═══════════════════════════════════════════════════════════════
      // 4️⃣ CREATE TICKETS IN DATABASE
      // ═══════════════════════════════════════════════════════════════
      console.log("4️⃣ Creating festival tickets in database...");

      const totalAmount = pi.amount / 100;
      const currency = (pi.currency || "eur").toUpperCase();
      const now = new Date();
      const purchaseDate = now.toISOString().split("T")[0];
      const purchaseTime = now.toLocaleTimeString("en-GB", {
        timeZone: "Europe/Podgorica",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });

      const viewUrl = `${appBaseUrl}/tickets?sessionId=${pi.id}`;
      console.log("✅ View URL:", viewUrl);

      const createdTickets: any[] = [];
      const calculateServiceFee = (price: number): number => price * 0.05 + 0.30;
      const ticketDataArray: Record<string, any>[] = [];

      for (const ticket of festivalTickets) {
        const ticketCategory = ticket.c || "Standardna";
        const ticketPrice = parseFloat(ticket.p || 0);
        const ticketId = generateUniqueTicketId();
        const { qrCodeRaw, qrCodeUrl } = await generateSignedQRCode(eventId, ticketId, hmacSecret);

        const seatServiceFee = calculateServiceFee(ticketPrice);
        const hasInsurance = metadata.has_insurance === "true";
        const seatInsurancePrice = hasInsurance ? Math.round(ticketPrice * 0.07 * 100) / 100 : 0;
        const seatTotalPrice = ticketPrice + seatServiceFee + seatInsurancePrice;

        ticketDataArray.push({
          ticketId,
          "order number": generateOrderNumber(pi.id),
          sessionId: pi.id,

          eventName: eventDetails.name,
          eventId,
          eventDate: eventDetails.date,
          eventTime: eventDetails.time,
          Lokacija: eventDetails.venue,

          seatId: "",
          category: ticketCategory,
          sectionLabel: ticketCategory,
          categoryKey: "",
          categoryLabel: ticketCategory,
          entrance: "",
          View: "",
          viewQuality: "",

          price: ticketPrice.toString(),
          serviceFee: seatServiceFee.toFixed(2),
          totalPrice: seatTotalPrice.toFixed(2),
          Valuta: currency,

          customerName,
          "Customer Email": customerEmail,
          customerPhone,
          customerGender: "",
          city: customerCity,
          zip: customerZip,
          address: customerAddress,
          country: customerCountry,

          qrCodeRaw,
          "QR Code": qrCodeUrl,

          status: "active",
          isUsed: false,
          validationCount: 0,

          Purchasedate: purchaseDate,
          purchaseTime,
          salesChannel: "Online",

          termsOfServiceAccepted: true,
          insurance: metadata.has_insurance === "true",
          insurancePrice: seatInsurancePrice > 0 ? seatInsurancePrice.toFixed(2) : null,

          cardIIN: cardDetails?.iin || "",
          cardBin: cardDetails?.iin || "",
          cardLast4: cardDetails?.last4 || "",
          cardBrand: cardDetails?.brand || "",
          cardFunding: cardDetails?.funding || "",
          cardCountry: cardDetails?.country || "",
          cardFingerprint: cardDetails?.fingerprint || "",
          cardIssuer: cardDetails?.issuer || "",
          cardNetwork: cardDetails?.network || "",
          cardDescription: cardDetails?.description || "",
        });
      }

      // BATCH INSERT
      if (ticketDataArray.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from("QRKarte")
          .insert(ticketDataArray)
          .select();

        if (insertError) {
          console.error("❌ Error batch inserting tickets:", insertError.message);
          for (const ticketData of ticketDataArray) {
            const { data, error } = await supabase.from("QRKarte").insert(ticketData).select();
            if (error) {
              console.error("❌ Error saving ticket:", ticketData.ticketId, error.message);
            } else if (data && data[0]) {
              createdTickets.push({ ...ticketData, id: data[0].id });
            }
          }
        } else if (insertedData) {
          console.log("✅ All festival tickets inserted:", insertedData.length);
          insertedData.forEach((row: any, i: number) => {
            createdTickets.push({ ...ticketDataArray[i], id: row.id });
          });
        }
      }

      console.log("Total festival tickets created:", createdTickets.length);

      // ═══════════════════════════════════════════════════════════════
      // 5️⃣ FISKALIZACIJA
      // ═══════════════════════════════════════════════════════════════
      console.log("5️⃣ Fiskalizacija...");
      const fiscalResult = await triggerFiscalization(
        supabaseUrl, supabaseServiceKey, pi.id, eventId, "Online"
      );
      if (fiscalResult.success) {
        console.log("✅ Fiskalizacija završena:", fiscalResult.invoiceUrl);
      } else if (fiscalResult.skipped) {
        console.log("⏭️ Fiskalizacija preskočena:", fiscalResult.reason);
      } else {
        console.log("⚠️ Fiskalizacija nije uspjela:", fiscalResult.error);
      }

      // ═══════════════════════════════════════════════════════════════
      // 6️⃣ ANALYTICS
      // ═══════════════════════════════════════════════════════════════
      console.log("6️⃣ Saving analytics...");
      try {
        const analyticsUtmSource = metadata.utm_source || "direct";
        const analyticsUtmMedium = metadata.utm_medium || "none";

        const conversionData = {
          visitor_id: metadata.visitor_id || null,
          session_id: metadata.analytics_session_id || null,
          stripe_session_id: pi.id,
          stripe_payment_intent: pi.id,
          stripe_customer_id: null,
          stripe_customer_email: customerEmail,
          amount: totalAmount,
          currency,
          utm_source: analyticsUtmSource,
          utm_medium: analyticsUtmMedium,
          utm_campaign: metadata.utm_campaign || null,
          utm_content: metadata.utm_content || null,
          gclid: metadata.gclid || null,
          fbclid: metadata.fbclid || null,
          landing_page: metadata.landing_page || null,
          event_id: eventId || null,
          event_name: eventDetails.name || null,
          ticket_type: festivalTickets.length > 0 ? (festivalTickets[0].c || null) : null,
          quantity: createdTickets.length,
        };

        const { error: conversionError } = await supabase
          .from("analytics_conversions")
          .insert(conversionData);

        if (conversionError) {
          console.error("❌ Analytics conversion error:", conversionError.message);
        } else {
          console.log("✅ Analytics conversion saved");
        }

        if (metadata.visitor_id) {
          const { data: visitor } = await supabase
            .from("analytics_visitors")
            .select("id, conversion_count, total_revenue")
            .eq("visitor_id", metadata.visitor_id)
            .single();

          if (visitor) {
            await supabase
              .from("analytics_visitors")
              .update({
                converted: true,
                conversion_count: (visitor.conversion_count || 0) + 1,
                total_revenue: (parseFloat(visitor.total_revenue) || 0) + totalAmount,
                updated_at: new Date().toISOString(),
              })
              .eq("visitor_id", metadata.visitor_id);
          }
        }

        const today = new Date().toISOString().split("T")[0];
        const { data: dailyStats } = await supabase
          .from("analytics_daily_stats")
          .select("id, conversions, revenue")
          .eq("date", today)
          .eq("utm_source", analyticsUtmSource)
          .eq("utm_medium", analyticsUtmMedium)
          .single();

        if (dailyStats) {
          await supabase
            .from("analytics_daily_stats")
            .update({
              conversions: (dailyStats.conversions || 0) + 1,
              revenue: (parseFloat(dailyStats.revenue as any) || 0) + totalAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", dailyStats.id);
        } else {
          await supabase
            .from("analytics_daily_stats")
            .insert({
              date: today, utm_source: analyticsUtmSource, utm_medium: analyticsUtmMedium,
              conversions: 1, revenue: totalAmount,
            });
        }
        console.log("✅ Daily stats updated");
      } catch (analyticsError: any) {
        console.error("⚠️ Analytics error (non-blocking):", analyticsError.message);
      }

      // ═══════════════════════════════════════════════════════════════
      // 7️⃣ EMAIL NOTIFIKACIJA
      // ═══════════════════════════════════════════════════════════════
      console.log("7️⃣ Email notification...");
      if (customerEmail && zohoApiKey) {
        console.log("📧 Sending email to:", customerEmail);
        await sendEmailConfirmation(
          customerEmail, customerName, customerPhone,
          {
            ...eventDetails,
            rawDate: metadata.event_date || "",
            rawTime: metadata.event_time || "",
            venueAddress: metadata.venue_address || "",
            venueCity: metadata.venue_city || "Podgorica",
            imageUrl: metadata.event_image || "",
            pageUrl: metadata.event_url || "",
          },
          createdTickets, totalAmount, currency, pi.id, viewUrl, zohoApiKey, cardDetails,
          fiscalResult?.invoiceUrl
        );
      } else {
        console.log("ℹ️ Email skipped - missing config or email");
      }

      // ═══════════════════════════════════════════════════════════════
      // 8️⃣ WHATSAPP NOTIFIKACIJA
      // ═══════════════════════════════════════════════════════════════
      console.log("8️⃣ WhatsApp notification...");

      let whatsappSent = false;
      let messageId: string | null = null;
      let failureReason: string | null = null;

      const formattedPhone = formatPhoneNumber(customerPhone);
      const hasValidPhone = formattedPhone && formattedPhone.length >= 10;

      if (hasValidPhone && messaggioApiKey && messaggioSenderCode) {
        try {
          const shortUrl = await shortenUrl(viewUrl, tinyUrlKey);
          const ticketCount = createdTickets.length;
          const ticketLinksText = ticketCount === 1
            ? `Vaša karta: ${shortUrl}`
            : `Vaših ${ticketCount} karata: ${shortUrl}`;

          const dlrCallbackUrl = `${supabaseUrl}/functions/v1/messaggio-webhook`;

          const whatsappPayload = {
            recipients: [{ phone: formattedPhone }],
            channels: ["whatsapp"],
            options: {
              ttl: 120,
              external_id: `etickets_${pi.id.slice(-12)}`,
              dlr_callback_url: dlrCallbackUrl,
            },
            whatsapp: {
              from: messaggioSenderCode,
              content: [{
                type: "template",
                template: {
                  id: "potvrda_kupovine_3",
                  language: "en",
                  body: {
                    parameters: [
                      { text: eventDetails.name },
                      { text: eventDetails.date },
                      { text: eventDetails.time },
                      { text: eventDetails.venue },
                      { text: `${totalAmount.toFixed(2)} ${currency}` },
                      { text: ticketLinksText },
                    ],
                  },
                },
              }],
            },
          };

          const whatsappResponse = await fetch("https://msg.messaggio.com/api/v1/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Messaggio-Login": messaggioApiKey },
            body: JSON.stringify(whatsappPayload),
          });

          const whatsappResult = await whatsappResponse.json();
          messageId = whatsappResult.messages?.[0]?.message_id || null;
          whatsappSent = whatsappResponse.ok && !!messageId;

          if (whatsappSent) {
            console.log("✅ WhatsApp poslan! Message ID:", messageId);
          } else {
            failureReason = whatsappResult.messages?.[0]?.error?.detail || JSON.stringify(whatsappResult);
            console.log("⚠️ WhatsApp API odbio:", failureReason);
          }
        } catch (whatsappError: any) {
          console.error("❌ WhatsApp error:", whatsappError.message);
          failureReason = `Network error: ${whatsappError.message}`;
        }
      } else {
        failureReason = !hasValidPhone ? "No valid phone number" : "WhatsApp API not configured";
        console.log("ℹ️ WhatsApp skipped:", failureReason);
      }

      try {
        await supabase.from("WhatsAppLogs").insert({
          messageId, sessionId: pi.id, type: "template",
          status: whatsappSent ? "sent" : (hasValidPhone ? "failed" : "skipped"),
          deliveryStatus: whatsappSent ? "pending" : "failed",
          phoneNumber: formattedPhone || customerPhone || "N/A",
          customerName: customerName || "", customerEmail: customerEmail || "",
          eventName: eventDetails.name, eventId,
          templateUsed: hasValidPhone ? "potvrda_kupovine_3" : null,
          ticketUrl: viewUrl, ticketCount: createdTickets.length,
          totalAmount: totalAmount.toFixed(2), currency,
          hasWhatsApp: whatsappSent || null, failureReason,
          sentAt: whatsappSent ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
        });
      } catch (logErr: any) {
        console.error("⚠️ WhatsApp logging failed:", logErr.message);
      }

      // ═══════════════════════════════════════════════════════════════
      // 9️⃣ SMS - SAMO CRNOGORSKI BROJEVI
      // ═══════════════════════════════════════════════════════════════
      console.log("9️⃣ SMS notification...");

      let smsSent = false;
      const isMontenegrinNumber = formattedPhone && formattedPhone.startsWith("382");

      if (isMontenegrinNumber && !whatsappSent) {
        try {
          const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              phoneNumber: formattedPhone, type: "confirmation",
              eventName: eventDetails.name, eventDate: eventDetails.date,
              eventTime: eventDetails.time, venue: eventDetails.venue,
              sessionId: pi.id, viewUrl,
              ticketCount: createdTickets.length,
              totalAmount: totalAmount.toFixed(2), currency,
            }),
          });
          const smsResult = await smsResponse.json();
          if (smsResult.success) {
            smsSent = true;
            console.log("✅ SMS poslan, ID:", smsResult.messageId);
          } else {
            console.log("⚠️ SMS nije poslan:", smsResult.error);
          }
        } catch (smsError: any) {
          console.error("❌ SMS error:", smsError.message);
        }
      } else {
        console.log("ℹ️ SMS preskočen:", !isMontenegrinNumber ? "nije crnogorski broj" : "WhatsApp već poslan");
      }

      // ═══════════════════════════════════════════════════════════════
      // ✅ COMPLETE
      // ═══════════════════════════════════════════════════════════════
      await supabase
        .from("ProcessedWebhooks")
        .update({ status: "completed" })
        .eq("stripeEventId", event.id);

      console.log("╔═══════════════════════════════════════════════════════════╗");
      console.log("║       ✅ FESTIVAL WEBHOOK PROCESSING COMPLETE              ║");
      console.log("╚═══════════════════════════════════════════════════════════╝");
      console.log("Summary:");
      console.log("  - Tickets created:", createdTickets.length);
      console.log("  - Payment captured: ✅");
      console.log("  - Fiscalization:", fiscalResult.success ? "✅" : (fiscalResult.skipped ? "⏭️" : "❌"));
      console.log("  - Email:", customerEmail ? "✅" : "⏭️");
      console.log("  - WhatsApp:", whatsappSent ? "✅" : "⏭️");
      console.log("  - SMS:", smsSent ? "✅" : "⏭️");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
