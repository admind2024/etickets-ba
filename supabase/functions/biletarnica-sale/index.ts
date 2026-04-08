// supabase/functions/biletarnica-sale/index.ts
// ═══════════════════════════════════════════════════════════════════════════
// BILETARNICA SALE - Edge funkcija za prodaju karata sa biletarnice
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `biletarnica_${timestamp}_${random}`;
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
  if (cleaned.startsWith("6") && cleaned.length === 8) {
    cleaned = "382" + cleaned;
  }
  return cleaned;
}

function formatDateForDisplay(dateInput: string | null | undefined): string {
  if (!dateInput) return "TBA";
  try {
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateInput)) {
      return dateInput;
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

// ═══════════════════════════════════════════════════════════════════════════
// SEATS.IO BOOKING
// ═══════════════════════════════════════════════════════════════════════════

async function bookSeatsInSeatsio(
  eventId: string,
  seats: any[],
  tables: any[] | undefined,
  orderId: string,
  seatsioKey: string
): Promise<{ success: boolean; message: string; error?: any }> {
  try {
    console.log("=== SEATS.IO BOOKING ===");
    console.log("Event ID:", eventId);
    console.log("Seats count:", seats.length);
    console.log("Tables from payload:", JSON.stringify(tables));
    console.log("Order ID:", orderId);

    if (!eventId || !seats || seats.length === 0) {
      return { success: false, message: "Missing eventId or seats" };
    }

    const bookingObjects: any[] = [];

    // Koristi "tables" array ako postoji (frontend ga šalje sa ispravnim objectId i quantity)
    // Za variable occupancy tabele format je: { objectId: "R13", quantity: 6 }
    const tableIds = new Set<string>();
    if (tables && tables.length > 0) {
      tables.forEach((table: any) => {
        bookingObjects.push({ objectId: table.objectId, quantity: table.quantity });
        tableIds.add(table.objectId);
      });
    }

    // Dodaj obična sjedišta (koja nisu dio variable occupancy tabela)
    seats.forEach((seat: any) => {
      // Koristi objectId (originalni seats.io ID), ne seat.id (koji može biti "tableId::1")
      const seatObjectId = seat.objectId || seat.id.split("::")[0];
      const objectType = seat.objectType || "seat";
      const isTableSeat = seat.isTableSeat || false;

      // Preskoči ako je ovo sjedište već pokriveno kroz tables array
      if (tableIds.has(seatObjectId)) return;

      // Za GA objekte, grupiši po objectId sa quantity
      const isGA = objectType.toLowerCase().includes("general");
      if (isGA) {
        const existing = bookingObjects.find(
          (o: any) => typeof o === "object" && o.objectId === seatObjectId
        );
        if (existing) {
          existing.quantity++;
        } else {
          bookingObjects.push({ objectId: seatObjectId, quantity: 1 });
        }
      } else if (!isTableSeat) {
        // Obično sjedište - samo string ID
        if (!bookingObjects.includes(seatObjectId)) {
          bookingObjects.push(seatObjectId);
        }
      }
    });

    console.log("Final booking objects:", JSON.stringify(bookingObjects));

    const requestBody = {
      objects: bookingObjects,
      orderId: `biletarnica-${orderId}`,
    };

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
      console.log("Seats successfully booked");
      return { success: true, message: "Seats booked successfully" };
    }

    if (responseText.includes("already booked") || responseText.includes("ALREADY_BOOKED")) {
      console.log("Seats already booked (idempotent)");
      return { success: true, message: "Seats already booked" };
    }

    console.error("Seats.io booking failed:", responseText);
    return { success: false, message: "Booking failed", error: responseText };
  } catch (error: any) {
    console.error("Seats.io error:", error.message);
    return { success: false, message: error.message, error };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FISKALIZACIJA
// ═══════════════════════════════════════════════════════════════════════════

async function triggerFiscalization(
  supabaseUrl: string,
  supabaseServiceKey: string,
  sessionId: string,
  eventId: string,
  salesChannel: string,
  paymentChannel: string
): Promise<{ success: boolean; invoiceUrl?: string; skipped?: boolean; reason?: string; error?: string }> {
  try {
    console.log("Pokretanje fiskalizacije...");
    console.log("   Session:", sessionId);
    console.log("   Event:", eventId);
    console.log("   Sales Channel:", salesChannel);
    console.log("   Payment Channel:", paymentChannel);

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
        paymentMethod: paymentChannel,
        force: true, // Kasir je eksplicitno trazio fiskalizaciju - zaobidji provjeru kanala/baze
      }),
    });

    const fiscalizeResult = await fiscalizeResponse.json();

    if (fiscalizeResult.success) {
      console.log("Fiskalizacija uspjesna:", fiscalizeResult.invoiceUrl);
      return { success: true, invoiceUrl: fiscalizeResult.invoiceUrl };
    } else if (fiscalizeResult.skipped) {
      console.log("Fiskalizacija preskocena:", fiscalizeResult.reason);
      return { success: false, skipped: true, reason: fiscalizeResult.reason };
    } else if (fiscalizeResult.alreadyExists) {
      console.log("Fiskalni racun vec postoji:", fiscalizeResult.invoiceUrl);
      return { success: true, invoiceUrl: fiscalizeResult.invoiceUrl };
    } else {
      console.log("Fiskalizacija neuspjesna:", fiscalizeResult.error);
      return { success: false, error: fiscalizeResult.error };
    }
  } catch (fiscalError: any) {
    console.error("Fiscalize error:", fiscalError.message);
    return { success: false, error: fiscalError.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP NOTIFIKACIJA
// ═══════════════════════════════════════════════════════════════════════════

async function sendWhatsAppNotification(
  phone: string,
  eventDetails: { name: string; date: string; time: string; venue: string },
  totalAmount: string,
  currency: string,
  ticketUrl: string,
  ticketCount: number,
  messaggioApiKey: string,
  messaggioSenderCode: string,
  tinyUrlKey: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!phone || !messaggioApiKey || !messaggioSenderCode) {
      return { success: false, error: "Missing phone or Messaggio config" };
    }

    console.log("Sending WhatsApp to:", phone);

    const shortUrl = await shortenUrl(ticketUrl, tinyUrlKey);
    const ticketLinksText = ticketCount === 1
      ? `Vasa karta: ${shortUrl}`
      : `Vasih ${ticketCount} karata: ${shortUrl}`;

    const whatsappPayload = {
      recipients: [{ phone }],
      channels: ["whatsapp"],
      options: {
        ttl: 120,
        external_id: `biletarnica_${Date.now()}`,
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
                { text: `${totalAmount} ${currency}` },
                { text: ticketLinksText },
              ],
            },
          },
        }],
      },
    };

    const response = await fetch("https://msg.messaggio.com/api/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Messaggio-Login": messaggioApiKey,
      },
      body: JSON.stringify(whatsappPayload),
    });

    const result = await response.json();
    const messageId = result.messages?.[0]?.message_id || null;

    if (response.ok && messageId) {
      console.log("WhatsApp sent! Message ID:", messageId);
      return { success: true, messageId };
    } else {
      const error = result.messages?.[0]?.error?.detail || result.error?.detail || JSON.stringify(result);
      console.log("WhatsApp failed:", error);
      return { success: false, error };
    }
  } catch (error: any) {
    console.error("WhatsApp error:", error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SMS NOTIFIKACIJA
// ═══════════════════════════════════════════════════════════════════════════

async function sendSmsNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  phone: string,
  eventDetails: { name: string; date: string; time: string; venue: string },
  sessionId: string,
  viewUrl: string,
  ticketCount: number,
  totalAmount: string,
  currency: string,
  fiscalInvoiceUrl?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!phone.startsWith("382")) {
      console.log("SMS skipped - not Montenegrin number:", phone);
      return { success: false, error: "Not Montenegrin number" };
    }

    console.log("Sending SMS to:", phone);
    if (fiscalInvoiceUrl) {
      console.log("Including fiscal invoice URL in SMS:", fiscalInvoiceUrl);
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        phoneNumber: phone,
        type: "confirmation",
        eventName: eventDetails.name,
        eventDate: eventDetails.date,
        eventTime: eventDetails.time,
        venue: eventDetails.venue,
        sessionId: sessionId,
        viewUrl: viewUrl,
        ticketCount: ticketCount,
        totalAmount: totalAmount,
        currency: currency,
        fiscalInvoiceUrl: fiscalInvoiceUrl || null,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log("SMS sent! Message ID:", result.messageId);
      return { success: true, messageId: result.messageId };
    } else {
      console.log("SMS failed:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error("SMS error:", error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// KALENDAR LINKOVI
// ═══════════════════════════════════════════════════════════════════════════

function buildCalendarDates(dateStr: string, timeStr: string): { startIso: string; endIso: string } | null {
  try {
    let year: number, month: number, day: number;
    if (dateStr.includes(".")) {
      const p = dateStr.split("."); day = parseInt(p[0]); month = parseInt(p[1]) - 1; year = parseInt(p[2]);
    } else if (dateStr.includes("-")) {
      const p = dateStr.split("-"); year = parseInt(p[0]); month = parseInt(p[1]) - 1; day = parseInt(p[2]);
    } else { return null; }
    const tp = timeStr.split(":"); const hours = parseInt(tp[0]) || 20; const minutes = parseInt(tp[1]) || 0;
    const startDate = new Date(year!, month!, day!, hours, minutes);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    const fmtIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:00+01:00`;
    return { startIso: fmtIso(startDate), endIso: fmtIso(endDate) };
  } catch { return null; }
}

function buildGoogleCalendarUrl(eventName: string, venue: string, startIso: string, endIso: string, viewUrl: string): string {
  const formatGcal = (iso: string) => iso.replace(/[-:+]/g, "").substring(0, 15);
  const params = new URLSearchParams({
    action: "TEMPLATE", text: eventName,
    dates: `${formatGcal(startIso)}/${formatGcal(endIso)}`,
    details: `Vaše karte: ${viewUrl}`, location: venue, ctz: "Europe/Podgorica",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildOutlookCalendarUrl(eventName: string, venue: string, startIso: string, endIso: string, viewUrl: string): string {
  const params = new URLSearchParams({
    startdt: startIso, enddt: endIso, subject: eventName, location: venue,
    body: `Vaše karte: ${viewUrl}`, path: "/calendar/action/compose", rru: "addevent",
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL NOTIFIKACIJA (Zoho Zeptomail - isti dizajn kao novie)
// ═══════════════════════════════════════════════════════════════════════════

async function sendEmailConfirmation(
  customerEmail: string,
  customerName: string,
  eventDetails: { name: string; date: string; time: string; venue: string },
  tickets: any[],
  totalAmount: string,
  currency: string,
  sessionId: string,
  viewUrl: string,
  zohoApiKey: string,
  isFscg: boolean,
  invoiceUrl?: string
): Promise<boolean> {
  if (!zohoApiKey) {
    console.log("Email skipped - missing Zoho API key");
    return false;
  }

  const ticketCount = tickets.length;
  const orderId = sessionId.slice(-8);
  const eventName = eventDetails.name || "Događaj";
  const eventDate = eventDetails.date || "TBA";
  const eventTime = eventDetails.time || "TBA";
  const eventVenue = eventDetails.venue || "TBA";

  // Kalendar linkovi
  let calendarHtml = "";
  const calDates = buildCalendarDates(eventDate, eventTime);
  if (calDates) {
    const gcalUrl = buildGoogleCalendarUrl(eventName, eventVenue, calDates.startIso, calDates.endIso, viewUrl);
    const outlookUrl = buildOutlookCalendarUrl(eventName, eventVenue, calDates.startIso, calDates.endIso, viewUrl);
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

  // Ticket stubs HTML
  const ticketStubsHtml = tickets.map((t: any, i: number) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(t.ticketId || t.qrCodeRaw || "ticket")}`;
    const ticketViewUrl = isFscg
      ? `${viewUrl.split("?")[0]}?ticketId=${t.ticketId}`
      : viewUrl;
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
              <td width="80" align="right" valign="top">
                <img src="${qrUrl}" alt="QR" width="64" height="64" style="border-radius: 4px; display: block;" />
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
  }).join("\n");

  const htmlBody = `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>Vaše karte - ${eventName}</title>
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
.dm-fiscal{background-color:rgba(22,101,52,0.15)!important}
.dm-fiscal p,.dm-fiscal a{color:#86efac!important}
.dm-blue-accent{color:#93b4ff!important}
.dm-link{color:#93b4ff!important}
.dm-footer-border{border-color:#3a3a55!important}
.dm-price-value{color:#e0e0e0!important}
}
</style>
</head>
<body class="dm-body" style="margin:0;padding:0;background-color:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

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
                  <td style="padding-left:6px;font-size:11px;color:rgba(255,255,255,0.9);font-weight:500;">Kupovina potvrđena</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 8px 0;font-size:11px;font-weight:500;letter-spacing:0.12em;color:rgba(255,255,255,0.5);text-transform:uppercase;">
    Potvrda kupovine · #${orderId}
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
    <tr>
      <td style="padding: 20px 28px 0 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="dm-card" style="background-color: #ffffff; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 18px 20px;">
              <p class="dm-text-muted" style="margin: 0 0 14px 0; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: #999; text-transform: uppercase;">Rekapitulacija</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="dm-text-secondary" style="font-size: 13px; color: #666; padding-bottom: 8px;">${ticketCount} ${ticketCount === 1 ? "ulaznica" : "ulaznice"}</td>
                  <td align="right" class="dm-text-primary" style="font-size: 13px; color: #333; font-weight: 500; padding-bottom: 8px;">${totalAmount} ${currency}</td>
                </tr>
                <tr>
                  <td colspan="2" class="dm-divider" style="border-top: 1px solid #f0ede8; padding-top: 12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td class="dm-text-primary" style="font-size: 14px; font-weight: 600; color: #1a1a2e;">Ukupno</td>
                        <td align="right" class="dm-price-value" style="font-size: 20px; font-weight: 700; color: #1a1a2e;">${totalAmount} ${currency}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

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
          © ${new Date().getFullYear()} etiketing.me · RAKUNAT DOO · Podgorica, Montenegro
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
    console.log("📧 Sending email via Zoho Zeptomail...");
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
  } catch (error: any) {
    console.error("❌ Email error:", error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const seatsioKey = Deno.env.get("SEATS_IO_SECRET_KEY") || "";
    const hmacSecret = Deno.env.get("HMAC_SECRET_KEY") || "ETK-9f38d1a2-cc49-4e3b-b182-7f94c2d9f6aa-2025";
    const messaggioApiKey = Deno.env.get("MESSAGGIO_API_KEY") || "";
    const messaggioSenderCode = Deno.env.get("MESSAGGIO_SENDER_CODE") || "";
    const tinyUrlKey = Deno.env.get("TINYURL_API_KEY") || "";
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://etiketing.me";
    const zohoApiKey = Deno.env.get("ZOHO_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    console.log("BILETARNICA SALE - SUPABASE EDGE");
    console.log("Request body:", JSON.stringify(body, null, 2));

    const {
      eventId,
      seats,
      tables,
      pricing,
      eventDetails,
      customerDetails,
      salesChannel,
      paymentChannel,
      enableFiscalization,
      isFscgEvent: isFscg,
      sessionId: providedSessionId,
    } = body;

    if (!eventId || !seats || seats.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing eventId or seats" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!customerDetails?.email || !customerDetails?.phone) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing customer email or phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionId = providedSessionId || generateSessionId();
    const orderId = sessionId.slice(-8);

    console.log("Event ID:", eventId);
    console.log("Session ID:", sessionId);
    console.log("Order ID:", orderId);
    console.log("Seats count:", seats.length);
    console.log("Sales Channel:", salesChannel);
    console.log("Payment Channel:", paymentChannel);
    console.log("Fiscalization:", enableFiscalization ? "YES" : "NO");

    // 1 - BOOK SEATS IN SEATS.IO
    console.log("\n1 - Booking seats in Seats.io...");

    if (seatsioKey && eventId) {
      const bookingResult = await bookSeatsInSeatsio(eventId, seats, tables, orderId, seatsioKey);
      console.log("Booking result:", bookingResult.message);

      if (!bookingResult.success && !bookingResult.message.includes("already booked")) {
        return new Response(
          JSON.stringify({ success: false, message: "Seats booking failed: " + bookingResult.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log("Seats.io booking skipped - missing config");
    }

    // 2 - CREATE TICKETS IN DATABASE
    console.log("\n2 - Creating tickets in database...");

    const now = new Date();
    const purchaseDate = now.toISOString().split("T")[0];
    const purchaseTime = now.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Podgorica",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const formattedPhone = formatPhoneNumber(customerDetails.phone);
    const formattedDate = formatDateForDisplay(eventDetails.date);
    const formattedTime = formatTimeForDisplay(eventDetails.time);

    const viewUrl = isFscg
      ? `${appBaseUrl}/fscg-karta?sessionId=${sessionId}`
      : `${appBaseUrl}/tickets?sessionId=${sessionId}`;
    console.log("View URL:", viewUrl);
    console.log("FSCG Event:", isFscg ? "YES" : "NO");

    const createdTickets: any[] = [];
    const currency = eventDetails.currency || "EUR";

    const subtotal = pricing?.subtotal || seats.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
    const finalPrice = pricing?.finalPrice || subtotal;
    const pricePerTicket = finalPrice / seats.length;

    for (const seat of seats) {
      const ticketId = generateUniqueTicketId();
      const { qrCodeRaw, qrCodeUrl } = await generateSignedQRCode(eventId, ticketId, hmacSecret);

      const ticketData: Record<string, any> = {
        ticketId: ticketId,
        "order number": orderId,
        sessionId: sessionId,

        eventName: eventDetails.name,
        eventId: eventId,
        eventDate: formattedDate,
        eventTime: formattedTime,
        Lokacija: eventDetails.venue,

        seatId: seat.objectId || seat.id.split("::")[0],
        category: seat.category || "",
        sectionLabel: seat.sectionLabel || "",
        categoryKey: seat.categoryKey || "",
        categoryLabel: seat.categoryLabel || seat.category || "",
        entrance: seat.entrance || "",
        View: seat.view || "",
        viewQuality: seat.viewQuality || "",

        originalPrice: seat.originalPrice ? Number(seat.originalPrice).toFixed(2) : null,
        price: seat.price ? Number(seat.price).toFixed(2) : pricePerTicket.toFixed(2),
        serviceFee: "0.00",
        totalPrice: seat.price ? Number(seat.price).toFixed(2) : pricePerTicket.toFixed(2),
        Valuta: currency,

        hasDiscount: (pricing?.discountValue > 0 || pricing?.manualPriceEnabled) ? true : false,
        discountType: pricing?.discountType || null,
        discountValue: pricing?.discountValue > 0 ? pricing.discountValue : null,

        customerName: customerDetails.name || "Biletarnica",
        "Customer Email": customerDetails.email,
        customerPhone: formattedPhone,
        customerGender: customerDetails.gender || "",

        qrCodeRaw: qrCodeRaw,
        "QR Code": qrCodeUrl,

        status: "active",
        isUsed: false,
        validationCount: 0,

        Purchasedate: purchaseDate,
        purchaseTime: purchaseTime,
        salesChannel: salesChannel || "Gotovina",

        // FSCG polja
        ...(isFscg && customerDetails.documentNumber ? {
          document_number: customerDetails.documentNumber,
          document_type: customerDetails.documentType || null, // "licna" ili "pasos"
        } : {}),
      };

      console.log("Saving ticket:", ticketId, "for seat:", seat.id);

      const { data, error } = await supabase.from("QRKarte").insert(ticketData).select();

      if (error) {
        console.error("Error saving ticket:", error.message);
      } else {
        console.log("Ticket saved:", ticketId);
        if (data && data[0]) {
          createdTickets.push({ ...ticketData, id: data[0].id });
        } else {
          createdTickets.push(ticketData);
        }
      }
    }

    console.log("Total tickets created:", createdTickets.length);

    if (createdTickets.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Failed to create tickets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3 - FISKALIZACIJA (sa timeout-om da ne blokira response predugo)
    let fiscalResult: any = { skipped: true, reason: "Not enabled" };

    if (enableFiscalization) {
      console.log("\n3 - Fiskalizacija...");

      // Timeout od 15 sekundi - ako Tiramisu ne odgovori, nastavi bez fiskalizacije
      const fiscalWithTimeout = Promise.race([
        triggerFiscalization(
          supabaseUrl,
          supabaseServiceKey,
          sessionId,
          eventId,
          salesChannel || "Gotovina",
          paymentChannel || "Gotovina"
        ),
        new Promise<{ success: false; error: string }>((resolve) =>
          setTimeout(() => resolve({ success: false, error: "Fiscalization timeout (15s)" }), 15000)
        ),
      ]);

      fiscalResult = await fiscalWithTimeout;

      if (fiscalResult.success) {
        console.log("Fiskalizacija zavrsena:", fiscalResult.invoiceUrl);
      } else if (fiscalResult.skipped) {
        console.log("Fiskalizacija preskocena:", fiscalResult.reason);
      } else {
        console.log("Fiskalizacija nije uspjela:", fiscalResult.error);
      }
    } else {
      console.log("\n3 - Fiskalizacija preskocena (nije ukljucena)");
    }

    // 4 - WHATSAPP NOTIFIKACIJA
    console.log("\n4 - WhatsApp notification...");

    let whatsappResult: any = { success: false, error: "Not sent" };

    if (formattedPhone && messaggioApiKey && messaggioSenderCode) {
      whatsappResult = await sendWhatsAppNotification(
        formattedPhone,
        { name: eventDetails.name, date: formattedDate, time: formattedTime, venue: eventDetails.venue },
        finalPrice.toFixed(2),
        currency,
        viewUrl,
        createdTickets.length,
        messaggioApiKey,
        messaggioSenderCode,
        tinyUrlKey
      );

      try {
        await supabase.from("WhatsAppLogs").insert({
          messageId: whatsappResult.messageId || null,
          sessionId: sessionId,
          type: "template",
          status: whatsappResult.success ? "sent" : "failed",
          deliveryStatus: whatsappResult.success ? "pending" : "failed",
          phoneNumber: formattedPhone,
          customerName: customerDetails.name || "Biletarnica",
          customerEmail: customerDetails.email,
          eventName: eventDetails.name,
          eventId: eventId,
          templateUsed: "potvrda_kupovine_3",
          ticketUrl: viewUrl,
          ticketCount: createdTickets.length,
          totalAmount: finalPrice.toFixed(2),
          currency: currency,
          failureReason: whatsappResult.error || null,
          sentAt: whatsappResult.success ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
          source: "biletarnica",
        });
      } catch (logError: any) {
        console.error("WhatsApp log error:", logError.message);
      }
    } else {
      console.log("WhatsApp skipped - missing phone or config");
    }

    // 5 - SMS NOTIFIKACIJA
    console.log("\n5 - SMS notification...");

    let smsResult: any = { success: false, error: "Not sent" };

    if (formattedPhone && formattedPhone.startsWith("382")) {
      smsResult = await sendSmsNotification(
        supabaseUrl,
        supabaseServiceKey,
        formattedPhone,
        { name: eventDetails.name, date: formattedDate, time: formattedTime, venue: eventDetails.venue },
        sessionId,
        viewUrl,
        createdTickets.length,
        finalPrice.toFixed(2),
        currency,
        fiscalResult.invoiceUrl || undefined
      );
    } else {
      console.log("SMS skipped - not Montenegrin number");
    }

    // 6 - EMAIL NOTIFIKACIJA
    console.log("\n6 - Email notification...");

    let emailResult = false;

    if (customerDetails.email && zohoApiKey) {
      emailResult = await sendEmailConfirmation(
        customerDetails.email,
        customerDetails.name || "Biletarnica",
        { name: eventDetails.name, date: formattedDate, time: formattedTime, venue: eventDetails.venue },
        createdTickets,
        finalPrice.toFixed(2),
        currency,
        sessionId,
        viewUrl,
        zohoApiKey,
        isFscg || false,
        fiscalResult?.invoiceUrl || undefined
      );
    } else {
      console.log("Email skipped - missing email or Zoho config");
    }

    // RETURN SUCCESS
    console.log("\nBILETARNICA SALE COMPLETE");
    console.log("Summary:");
    console.log("  - Session ID:", sessionId);
    console.log("  - Tickets created:", createdTickets.length);
    console.log("  - View URL:", viewUrl);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: sessionId,
        orderId: orderId,
        ticketsCreated: createdTickets.length,
        viewUrl: viewUrl,
        fiscalization: {
          success: fiscalResult.success || false,
          invoiceUrl: fiscalResult.invoiceUrl || null,
          skipped: fiscalResult.skipped || false,
        },
        notifications: {
          whatsapp: whatsappResult.success,
          sms: smsResult.success,
          email: emailResult,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Biletarnica sale error:", error.message);
    console.error("Stack:", error.stack);

    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
