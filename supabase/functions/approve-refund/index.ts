// supabase/functions/approve-refund/index.ts
// FINALNA VERZIJA SA ZEPTOMAIL API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // Čitaj ZEPTOMAIL_API_KEY iz secrets
  const ZEPTOMAIL_API_KEY = Deno.env.get('ZEPTOMAIL_API_KEY')
  
  console.log('🔍 ZEPTOMAIL_API_KEY:', ZEPTOMAIL_API_KEY ? 'SET' : 'MISSING')

  try {
    const { refund_id } = await req.json()
    
    if (!refund_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'refund_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing refund:', refund_id)

    // Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Dohvati zahtjev
    const { data: refund, error: fetchError } = await supabase
      .from('povrati')
      .select('*')
      .eq('ID', refund_id)
      .eq('Status', 'pending')
      .single()

    if (fetchError || !refund) {
      console.log('Refund not found or not pending:', fetchError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Zahtjev nije pronađen' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ažuriraj status
    const { error: updateError } = await supabase
      .from('povrati')
      .update({ 
        Status: 'approved',
        "Updated Date": new Date().toISOString()
      })
      .eq('ID', refund_id)

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`)
    }

    console.log('✅ Approved:', refund['Ordernumber'])

    // Pripremi podatke
    const customerEmail = refund['Email']
    const customerName = refund['Full Name'] || 'Kupac'
    const orderNumber = refund['Ordernumber'] || refund_id.slice(0, 8)
    const eventName = refund['Event Name'] || 'Događaj'
    const ticketCount = refund['Ticket Count'] || 1
    const refundAmount = parseFloat(refund['Refundamount'] || refund['Ticket Price'] || 0).toFixed(2)
    const bankAccount = refund['Bankaccount'] || 'N/A'
    const accountHolder = refund['Account Holder'] || customerName

    let customerEmailSent = false
    let accountingEmailSent = false

    // Provjeri da li je ulaznica osigurana
    let hasInsurance = false
    if (orderNumber) {
      const { data: tickets } = await supabase
        .from('QRKarte')
        .select('insurance')
        .ilike('order number', orderNumber)
        .limit(10)
      if (tickets && tickets.length > 0) {
        hasInsurance = tickets.some((t: any) => t.insurance === true || t.insurance === 'true')
      }
    }

    const insuranceMessage = hasInsurance ? `
      <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #166534; font-size: 15px;">
          🛡️ <strong>Vaše ulaznice su bile osigurane!</strong><br>
          Zahvaljujući osiguranju ulaznica, ostvarujete pravo na povrat kompletnog iznosa koji ste platili. Odlična odluka što ste osigurali svoje ulaznice!
        </p>
      </div>` : ''

    // Provjeri da li imamo API key
    if (!ZEPTOMAIL_API_KEY) {
      console.log('⚠️ ZEPTOMAIL_API_KEY not configured, skipping emails')
      return new Response(
        JSON.stringify({
          success: true,
          message: `Zahtjev ${orderNumber} je odobren`,
          emailSent: false,
          accountingEmailSent: false,
          warning: 'Email not configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // HTML template za kupca
    const customerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .amount-box { background: white; border: 2px solid #10B981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: bold; color: #10B981; }
    .details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">✅ Povrat Odobren</h1>
      <p style="margin:10px 0 0 0; opacity:0.9;">Vaš zahtjev za povrat je uspješno obrađen</p>
    </div>
    <div class="content">
      <p>Poštovani/a <strong>${customerName}</strong>,</p>
      <p>Sa zadovoljstvom Vas obavještavamo da je Vaš zahtjev za povrat sredstava <strong>ODOBREN</strong>.</p>
      
      <div class="amount-box">
        <div style="color:#6b7280; font-size:14px;">Iznos za povrat</div>
        <div class="amount">${refundAmount} EUR</div>
      </div>

      ${insuranceMessage}

      <div class="details">
        <div class="detail-row"><span style="color:#6b7280;">Broj narudžbe:</span> <strong>${orderNumber}</strong></div>
        <div class="detail-row"><span style="color:#6b7280;">Događaj:</span> <strong>${eventName}</strong></div>
        <div class="detail-row"><span style="color:#6b7280;">Broj karata:</span> <strong>${ticketCount}</strong></div>
      </div>
      
      <p><strong>⏱️ Rok isplate:</strong> Sredstva će biti uplaćena na Vaš račun u roku od <strong>3-5 radnih dana</strong>.</p>
      
      <p style="color:#6b7280; font-size:14px;">Ako imate bilo kakvih pitanja, slobodno nas kontaktirajte na support@e-tickets.me</p>
    </div>
    <div class="footer">
      <p style="margin:0;">e-tickets.me | Vaš partner za ulaznice</p>
      <p style="margin:5px 0 0 0;">support@e-tickets.me</p>
    </div>
  </div>
</body>
</html>`

    // HTML template za računovodstvo
    const accountingHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #1e40af; color: white; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f3f4f6; }
    .highlight { background: #fef3c7; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin:0;">💰 Novi Odobreni Povrat</h2>
  </div>
  
  <p>Odobren je novi zahtjev za povrat sredstava. Molimo izvršite uplatu.</p>
  
  <table>
    <tr><th>Polje</th><th>Vrijednost</th></tr>
    <tr><td>Broj narudžbe</td><td><strong>${orderNumber}</strong></td></tr>
    <tr><td>Kupac</td><td>${customerName}</td></tr>
    <tr><td>Email</td><td>${customerEmail}</td></tr>
    <tr><td>Događaj</td><td>${eventName}</td></tr>
    <tr><td>Broj karata</td><td>${ticketCount}</td></tr>
    <tr class="highlight"><td>IZNOS ZA UPLATU</td><td style="font-size:18px;">${refundAmount} EUR</td></tr>
    <tr><td>Broj računa</td><td><code>${bankAccount}</code></td></tr>
    <tr><td>Vlasnik računa</td><td>${accountHolder}</td></tr>
    <tr><td>Datum odobrenja</td><td>${new Date().toLocaleDateString('sr-ME')} ${new Date().toLocaleTimeString('sr-ME')}</td></tr>
  </table>
  
  <p style="color:#dc2626;"><strong>⚠️ Molimo izvršite uplatu u roku od 3 radna dana.</strong></p>
</body>
</html>`

    // ═══════════════════════════════════════════════════════════════
    // 1. POŠALJI EMAIL KUPCU
    // ═══════════════════════════════════════════════════════════════
    if (customerEmail) {
      try {
        console.log('📧 Sending customer email to:', customerEmail)
        
        const customerPayload = {
          from: {
            address: "noreply@my.e-tickets.me",
            name: "e-tickets Povrat"
          },
          to: [{
            email_address: {
              address: customerEmail,
              name: customerName
            }
          }],
          subject: `✅ Povrat odobren - Narudžba ${orderNumber}`,
          htmlbody: customerHtml
        }

        const customerResponse = await fetch('https://api.zeptomail.eu/v1.1/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': ZEPTOMAIL_API_KEY
          },
          body: JSON.stringify(customerPayload)
        })

        if (customerResponse.ok) {
          const result = await customerResponse.json()
          console.log('✅ Customer email SENT:', result)
          customerEmailSent = true
        } else {
          const errorText = await customerResponse.text()
          console.error('❌ Customer email failed:', customerResponse.status, errorText)
        }
      } catch (emailError) {
        console.error('❌ Customer email error:', emailError)
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. POŠALJI EMAIL RAČUNOVODSTVU
    // ═══════════════════════════════════════════════════════════════
    try {
      console.log('📧 Sending accounting email')
      
      const accountingPayload = {
        from: {
          address: "noreply@my.e-tickets.me",
          name: "e-tickets System"
        },
        to: [{
          email_address: {
            address: "dragica.milosevic@rakunat.com",
            name: "Računovodstvo"
          }
        }],
        subject: `💰 POVRAT: ${orderNumber} - ${refundAmount} EUR - ${customerName}`,
        htmlbody: accountingHtml
      }

      const accountingResponse = await fetch('https://api.zeptomail.eu/v1.1/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': ZEPTOMAIL_API_KEY
        },
        body: JSON.stringify(accountingPayload)
      })

      if (accountingResponse.ok) {
        const result = await accountingResponse.json()
        console.log('✅ Accounting email SENT:', result)
        accountingEmailSent = true
      } else {
        const errorText = await accountingResponse.text()
        console.error('❌ Accounting email failed:', accountingResponse.status, errorText)
      }
    } catch (emailError) {
      console.error('❌ Accounting email error:', emailError)
    }

    // Vraćamo uspjeh
    return new Response(
      JSON.stringify({
        success: true,
        message: `Zahtjev ${orderNumber} je odobren`,
        emailSent: customerEmailSent,
        accountingEmailSent: accountingEmailSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})