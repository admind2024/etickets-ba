import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://hvpytasddzeprgqkwlbu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHl0YXNkZHplcHJncWt3bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDMyODQsImV4cCI6MjA4MjE3OTI4NH0.R1wPgBpyO7MHs0YL_pW0XBKkX8QweJ8MuhHUpuDSuKk";
const SITE_URL = "https://etiketing.me";

const STATIC_PAGES = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/izvodjaci", changefreq: "weekly", priority: "0.8" },
  { loc: "/lokacije", changefreq: "weekly", priority: "0.8" },
  { loc: "/politika-privatnosti", changefreq: "monthly", priority: "0.3" },
  { loc: "/uslovi-koriscenja", changefreq: "monthly", priority: "0.3" },
  { loc: "/nacin-placanja", changefreq: "monthly", priority: "0.4" },
  { loc: "/kako-kupiti", changefreq: "monthly", priority: "0.5" },
  { loc: "/povrat-ulaznica", changefreq: "monthly", priority: "0.4" },
  { loc: "/faq", changefreq: "monthly", priority: "0.5" },
  { loc: "/kontakt", changefreq: "monthly", priority: "0.5" },
  { loc: "/o-nama", changefreq: "monthly", priority: "0.4" },
];

function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateUrlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${escapeXml(SITE_URL + loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function main() {
  console.log('[sitemaps] Starting sitemap generation...');
  const today = formatDate(new Date());
  const urls = [];

  // Static pages
  for (const page of STATIC_PAGES) {
    urls.push(generateUrlEntry(page.loc, today, page.changefreq, page.priority));
  }

  // Fetch ALL events - BEZ FILTERA
  try {
    console.log('[sitemaps] Fetching events...');
    const eventsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/AboutEvents?select=slug,date,hide`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    
    console.log('[sitemaps] Events response status:', eventsResponse.status);
    
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      console.log(`[sitemaps] Found ${events.length} total events`);
      
      // Filtriraj samo one koji nisu hide
      const visibleEvents = events.filter(e => e.slug && e.hide !== true);
      console.log(`[sitemaps] Visible events: ${visibleEvents.length}`);
      
      for (const event of visibleEvents) {
        const lastmod = formatDate(event.date);
        urls.push(generateUrlEntry(`/dogadjaj/${event.slug}`, lastmod, 'weekly', '0.8'));
      }
    } else {
      const errorText = await eventsResponse.text();
      console.error('[sitemaps] Events fetch failed:', eventsResponse.status, errorText);
    }
  } catch (err) {
    console.error('[sitemaps] Exception fetching events:', err.message);
  }

  // Fetch performers
  try {
    const performersResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/performers?select=slug,updated_at`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    
    if (performersResponse.ok) {
      const performers = await performersResponse.json();
      console.log(`[sitemaps] Found ${performers.length} performers`);
      
      for (const performer of performers) {
        if (performer.slug) {
          const lastmod = formatDate(performer.updated_at);
          urls.push(generateUrlEntry(`/izvodjaci/${performer.slug}`, lastmod, 'weekly', '0.7'));
        }
      }
    }
  } catch (err) {
    console.error('[sitemaps] Exception fetching performers:', err.message);
  }

  // Fetch venues
  try {
    const venuesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/venues?select=slug,updated_at`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    
    if (venuesResponse.ok) {
      const venues = await venuesResponse.json();
      console.log(`[sitemaps] Found ${venues.length} venues`);
      
      for (const venue of venues) {
        if (venue.slug) {
          const lastmod = formatDate(venue.updated_at);
          urls.push(generateUrlEntry(`/lokacije/${venue.slug}`, lastmod, 'monthly', '0.6'));
        }
      }
    }
  } catch (err) {
    console.error('[sitemaps] Exception fetching venues:', err.message);
  }

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  // Write to public folder
  const outputPath = resolve(__dirname, '../public/sitemap.xml');
  writeFileSync(outputPath, sitemap, 'utf-8');
  console.log(`[sitemaps] Generated sitemap with ${urls.length} URLs at ${outputPath}`);
}

// Allow direct execution
main().catch(console.error);