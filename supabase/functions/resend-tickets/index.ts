import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerEmail, customerName, eventName, sessionId, viewUrl, tickets, isReminder } = await req.json();

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "Missing customerEmail" }), {
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

    // Build ticket list HTML
    let ticketsHtml = "";
    if (tickets && tickets.length > 0) {
      ticketsHtml = tickets
        .map(
          (t: any, i: number) => `
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 14px; color: #333;">
            Karta ${i + 1} ${t.seatId ? `- <strong>${t.seatId}</strong>` : ""}
          </td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #eee; text-align: right;">
            <a href="${t.link}" style="color: #013dc4; text-decoration: none; font-size: 13px; font-weight: 600;">Pogledaj kartu &rarr;</a>
          </td>
        </tr>`
        )
        .join("\n");
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #013dc4; padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">e-tickets.me</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${isReminder ? "Podsjetnik za vaš događaj" : "Vaše karte su spremne"}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 8px;">Poštovani <strong>${customerName || "kupac"}</strong>,</p>
              <p style="font-size: 14px; color: #666; margin: 0 0 24px; line-height: 1.6;">
                ${isReminder
                  ? `Podsjećamo vas da uskoro počinje <strong>${eventName || "događaj"}</strong>. Ovdje su vaše karte — pripremite ih na vrijeme!`
                  : `Ovo je ponovo poslat link za vaše karte za <strong>${eventName || "događaj"}</strong>.`}
              </p>

              <!-- All tickets link -->
              <div style="background: #f0f4ff; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #333; margin: 0 0 12px; font-weight: 600;">Pogledajte sve vaše karte:</p>
                <a href="${viewUrl}" style="display: inline-block; background: #013dc4; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Otvori moje karte (${tickets?.length || 0})
                </a>
              </div>

              <!-- Individual tickets -->
              ${
                tickets && tickets.length > 1
                  ? `
              <p style="font-size: 13px; color: #666; margin: 0 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Pojedinačni linkovi:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                ${ticketsHtml}
              </table>
              `
                  : ""
              }

              <p style="font-size: 13px; color: #999; margin: 24px 0 0; line-height: 1.6;">
                QR kod na karti se aktivira 3 sata prije početka događaja. Uživajte!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999; margin: 0;">
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

    const payload = {
      from: { address: "noreply@my.e-tickets.me", name: "e-tickets" },
      to: [{ email_address: { address: customerEmail, name: customerName || "" } }],
      subject: isReminder
        ? `Podsjetnik: ${eventName || "Događaj"} - vaše karte`
        : `Vaše karte: ${eventName || "Događaj"} - ponovo poslato`,
      htmlbody: htmlBody,
      track_opens: true,
      track_clicks: false,
    };

    console.log(`📧 ${isReminder ? "Reminder" : "Resending"} tickets to ${customerEmail} for ${eventName}`);

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

    if (!response.ok) {
      throw new Error(`Email failed: ${response.status} - ${responseText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Email sent to ${customerEmail}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Resend error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
