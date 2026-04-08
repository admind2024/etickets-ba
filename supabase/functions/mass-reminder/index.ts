import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DELAY_MS = 1000;
const TICKET_BASE_URL = "https://etiketing.me/tickets";
const FSCG_BASE_URL = "https://etiketing.me/fscg-karta";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface TicketInfo {
  ticketId: string;
  seatId: string;
  entrance: string;
  link: string;
}

interface Recipient {
  customerEmail: string;
  customerName: string;
  eventName: string;
  sessionId: string;
  viewUrl: string;
  tickets: TicketInfo[];
}

interface Filters {
  events?: string[];
  search?: string;
}

function buildHtml(r: Recipient): string {
  const ticketCount = r.tickets?.length || 0;

  // Ticket rows sa ulazom
  let ticketsHtml = "";
  if (r.tickets && r.tickets.length > 0) {
    ticketsHtml = r.tickets
      .map(
        (t, i) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; vertical-align: top;">
            <div style="font-size: 14px; color: #1a1a2e; font-weight: 600;">
              ${t.seatId || `Karta ${i + 1}`}
            </div>
            ${t.entrance ? `<div style="display: inline-block; margin-top: 6px; padding: 3px 10px; background: #fee2e2; color: #dc2626; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px;">🚪 ${t.entrance}</div>` : ""}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; vertical-align: middle;">
            <a href="${t.link}" style="display: inline-block; padding: 6px 14px; background: #013dc4; color: #fff; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 600;">Pogledaj &rarr;</a>
          </td>
        </tr>`
      )
      .join("\n");
  }

  // Skupi jedinstvene ulaze
  const uniqueEntrances = [...new Set(r.tickets.map((t) => t.entrance).filter(Boolean))];
  const entranceNotice = uniqueEntrances.length > 0
    ? `
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px; padding: 16px 18px; margin-bottom: 24px;">
        <p style="font-size: 15px; color: #991b1b; margin: 0; font-weight: 700;">
          🚨 OBAVEZNO: Pratite označeni ulaz!
        </p>
        <p style="font-size: 14px; color: #7f1d1d; margin: 8px 0 0; line-height: 1.6;">
          Vaše karte su za ${uniqueEntrances.length === 1
            ? `<strong>${uniqueEntrances[0]}</strong>`
            : uniqueEntrances.map((e) => `<strong>${e}</strong>`).join(", ")
          }. Sa vašom kartom možete ući <strong>ISKLJUČIVO</strong> na ulaz koji je označen na karti. Pristup preko drugih ulaza <strong>nije moguć</strong>.
        </p>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #013dc4 0%, #0052ff 100%); padding: 36px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">e-tickets.me</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 15px; font-weight: 500;">🎫 Podsjetnik za vaš događaj</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 40px;">
              <p style="font-size: 17px; color: #1a1a2e; margin: 0 0 6px; font-weight: 600;">Poštovani ${r.customerName || "kupac"},</p>
              <p style="font-size: 14px; color: #555; margin: 0 0 24px; line-height: 1.7;">
                Podsjećamo vas da uskoro počinje <strong style="color: #1a1a2e;">${r.eventName || "događaj"}</strong>. Pripremite vaše karte na vrijeme!
              </p>

              <!-- Entrance warning -->
              ${entranceNotice}

              <!-- Main CTA button -->
              <div style="background: #f0f4ff; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #333; margin: 0 0 14px; font-weight: 600;">Vaše karte su spremne:</p>
                <a href="${r.viewUrl}" style="display: inline-block; background: #013dc4; color: #ffffff; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(1,61,196,0.3);">
                  Otvori ${ticketCount === 1 ? "moju kartu" : `mojih ${ticketCount} karata`}
                </a>
              </div>

              <!-- Individual tickets -->
              ${
                ticketCount > 0
                  ? `
              <p style="font-size: 12px; color: #888; margin: 0 0 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">Vaše karte (${ticketCount}):</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
                ${ticketsHtml}
              </table>
              `
                  : ""
              }

              <p style="font-size: 13px; color: #999; margin: 24px 0 0; line-height: 1.6; border-top: 1px solid #f0f0f0; padding-top: 16px;">
                ℹ️ QR kod na karti se aktivira 3 sata prije početka događaja. Vidimo se!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fb; padding: 20px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #aaa; margin: 0;">
                e-tickets.me | Podrška: info@e-tickets.me
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Dohvati karte iz baze, grupiši po sessionId i vrati batch primaoca
async function fetchRecipientsFromDB(
  filters: Filters,
  batchSize: number,
  offset: number
): Promise<{ recipients: Recipient[]; total: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let query = supabase
    .from("QRKarte")
    .select("ticketId, customerName, \"Customer Email\", eventName, sessionId, seatId, entrance, document_type")
    .not("Customer Email", "is", null)
    .neq("Customer Email", "");

  if (filters.events && filters.events.length > 0) {
    if (filters.events.length === 1) {
      query = query.eq("eventName", filters.events[0]);
    } else {
      query = query.in("eventName", filters.events);
    }
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    query = query.or(
      `customerName.ilike.%${term}%,Customer Email.ilike.%${term}%,customerPhone.ilike.%${term}%,ticketId.ilike.%${term}%,eventName.ilike.%${term}%`
    );
  }

  const { data, error } = await query.order("created_at", { ascending: true }).limit(10000);
  if (error) throw new Error(`DB error: ${error.message}`);
  if (!data || data.length === 0) throw new Error("Nema karata za slanje");

  // Grupiši po sessionId (unikatne sesije)
  const groups = new Map<string, any[]>();
  for (const k of data) {
    const email = k["Customer Email"];
    if (!email) continue;
    // Ključ je sessionId ako postoji, inače email+event kao fallback
    const sid = k.sessionId && !k.sessionId.startsWith("clone_") ? k.sessionId : "";
    const key = sid || `fallback_${email}_${k.eventName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(k);
  }

  const allRecipients: Recipient[] = [];
  for (const [, tickets] of groups) {
    const rep = tickets[0];
    const sid = tickets.find((t: any) => t.sessionId && !t.sessionId.startsWith("clone_"))?.sessionId || rep.sessionId;
    const isFscg = !!rep.document_type;
    const baseUrl = isFscg ? FSCG_BASE_URL : TICKET_BASE_URL;
    const viewUrl = sid && !sid.startsWith("clone_")
      ? `${baseUrl}?sessionId=${sid}`
      : `${baseUrl}?ticketId=${rep.ticketId}`;
    allRecipients.push({
      customerEmail: rep["Customer Email"],
      customerName: rep.customerName || "",
      eventName: rep.eventName || "",
      sessionId: sid || "",
      viewUrl,
      tickets: tickets.map((t: any) => ({
        ticketId: t.ticketId,
        seatId: t.seatId || "",
        entrance: t.entrance || "",
        link: `${isFscg ? FSCG_BASE_URL : TICKET_BASE_URL}?ticketId=${t.ticketId}`,
      })),
    });
  }

  const total = allRecipients.length;
  const batch = allRecipients.slice(offset, offset + batchSize);

  return { recipients: batch, total };
}

async function sendEmail(r: Recipient, zohoApiKey: string): Promise<boolean> {
  const htmlBody = buildHtml(r);
  const ticketCount = r.tickets?.length || 0;
  const payload = {
    from: { address: "noreply@my.e-tickets.me", name: "e-tickets" },
    to: [{ email_address: { address: r.customerEmail, name: r.customerName || "" } }],
    subject: `Podsjetnik: ${r.eventName || "Događaj"} — ${ticketCount === 1 ? "vaša karta" : `vaše ${ticketCount} karte`}`,
    htmlbody: htmlBody,
    track_opens: true,
    track_clicks: false,
  };

  const response = await fetch("https://api.zeptomail.eu/v1.1/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: zohoApiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`  ❌ ${r.customerEmail}: ${response.status} ${errText.substring(0, 100)}`);
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { recipients: directRecipients, filters, batchSize = 25, offset = 0 } = body as {
      recipients?: Recipient[];
      filters?: Filters;
      batchSize?: number;
      offset?: number;
    };

    let recipients: Recipient[];
    let totalGrouped = 0;

    if (filters) {
      console.log(`📧 Mass reminder from DB, batch=${batchSize}, offset=${offset}`);
      const result = await fetchRecipientsFromDB(filters, batchSize, offset);
      recipients = result.recipients;
      totalGrouped = result.total;
    } else if (directRecipients && directRecipients.length > 0) {
      recipients = directRecipients;
      totalGrouped = directRecipients.length;
    } else {
      return new Response(JSON.stringify({ error: "No recipients or filters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zohoApiKey = Deno.env.get("ZOHO_API_KEY");
    if (!zohoApiKey) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📧 Sending batch: ${recipients.length} recipients (total: ${totalGrouped})`);

    let sent = 0;
    let errors = 0;
    const failed: string[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      if (!r.customerEmail) {
        errors++;
        continue;
      }

      try {
        const ok = await sendEmail(r, zohoApiKey);
        if (ok) {
          sent++;
          console.log(`  ✅ ${i + 1}/${recipients.length} -> ${r.customerEmail} (${r.tickets.length} tickets)`);
        } else {
          errors++;
          failed.push(r.customerEmail);
        }
      } catch (e: any) {
        console.error(`  ❌ ${r.customerEmail}: ${e.message}`);
        errors++;
        failed.push(r.customerEmail);
      }

      if (i < recipients.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    console.log(`📧 Batch done: ${sent} sent, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, sent, errors, failed, total: totalGrouped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Mass reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
