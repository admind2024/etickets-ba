import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Download, Copy, Check, Link2, ExternalLink, MousePointerClick, TrendingUp, ShoppingCart, Ticket, Users, Eye, BarChart3 } from "lucide-react";

// ── BEHAVIOR TYPES ──────────────────────────────────────────
interface PageData {
  path: string;
  title: string;
  views: number;
  uniqueVisitors: number;
}

interface ButtonClickData {
  buttonText: string;
  fromPage: string;
  toPage: string;
  clicks: number;
}

// ── TYPES ──────────────────────────────────────────────────

interface EventOption {
  eventId: string;
  eventName: string;
  slug: string;
  rev: number;
  purch: number;
  tix: number;
}
interface ChannelRow {
  source: string;
  visits: number;
  unique: number;
  purchases: number;
  tickets: number;
  revenue: number;
  conv: number;
}
interface CampaignRow {
  campaign: string;
  source: string;
  visits: number;
  unique: number;
  purchases: number;
  tickets: number;
  revenue: number;
  conv: number;
}
interface DetailRow {
  source: string;
  type: string;
  detail: string;
  visits: number;
  unique: number;
  purchases: number;
  tickets: number;
  revenue: number;
  conv: number;
}
interface CountryRow {
  code: string;
  name: string;
  flag: string;
  visits: number;
  purchases: number;
  revenue: number;
}
interface DeviceRow {
  device: string;
  visits: number;
  purchases: number;
  revenue: number;
  pct: number;
}
interface OSRow {
  os: string;
  visits: number;
  purchases: number;
  revenue: number;
  pct: number;
}
interface DailyRow {
  date: string;
  visits: number;
  purchases: number;
  revenue: number;
}
interface Stats {
  visits: number;
  unique: number;
  purchases: number;
  revenue: number;
  tickets: number;
  conv: number;
  channels: ChannelRow[];
  campaigns: CampaignRow[];
  details: DetailRow[];
  countries: CountryRow[];
  devices: DeviceRow[];
  os: OSRow[];
  daily: DailyRow[];
}

// ── CONSTANTS ──────────────────────────────────────────────

const PERIODS = [
  { l: "Danas", v: "today" },
  { l: "Jučer", v: "yesterday" },
  { l: "7d", v: "7days" },
  { l: "30d", v: "30days" },
  { l: "90d", v: "90days" },
  { l: "Sve", v: "all" },
];

const FL: Record<string, { n: string; f: string }> = {
  ME: { n: "Crna Gora", f: "🇲🇪" },
  RS: { n: "Srbija", f: "🇷🇸" },
  HR: { n: "Hrvatska", f: "🇭🇷" },
  BA: { n: "BiH", f: "🇧🇦" },
  SI: { n: "Slovenija", f: "🇸🇮" },
  MK: { n: "S. Makedonija", f: "🇲🇰" },
  AL: { n: "Albanija", f: "🇦🇱" },
  XK: { n: "Kosovo", f: "🇽🇰" },
  AT: { n: "Austrija", f: "🇦🇹" },
  DE: { n: "Njemačka", f: "🇩🇪" },
  CH: { n: "Švicarska", f: "🇨🇭" },
  IT: { n: "Italija", f: "🇮🇹" },
  US: { n: "SAD", f: "🇺🇸" },
  GB: { n: "UK", f: "🇬🇧" },
  FR: { n: "Francuska", f: "🇫🇷" },
  NL: { n: "Holandija", f: "🇳🇱" },
  SE: { n: "Švedska", f: "🇸🇪" },
  NO: { n: "Norveška", f: "🇳🇴" },
  PL: { n: "Poljska", f: "🇵🇱" },
  CZ: { n: "Češka", f: "🇨🇿" },
  HU: { n: "Mađarska", f: "🇭🇺" },
  RO: { n: "Rumunija", f: "🇷🇴" },
  BG: { n: "Bugarska", f: "🇧🇬" },
  GR: { n: "Grčka", f: "🇬🇷" },
  TR: { n: "Turska", f: "🇹🇷" },
  AU: { n: "Australija", f: "🇦🇺" },
  CA: { n: "Kanada", f: "🇨🇦" },
  DK: { n: "Danska", f: "🇩🇰" },
  ES: { n: "Španija", f: "🇪🇸" },
  IE: { n: "Irska", f: "🇮🇪" },
  RU: { n: "Rusija", f: "🇷🇺" },
  UA: { n: "Ukrajina", f: "🇺🇦" },
  PT: { n: "Portugal", f: "🇵🇹" },
};

const SRC_COLORS: Record<string, string> = {
  Facebook: "#1877F2",
  Instagram: "#E4405F",
  Google: "#4285F4",
  TikTok: "#000000",
  "Twitter/X": "#1DA1F2",
  LinkedIn: "#0A66C2",
  Viber: "#7360F2",
  WhatsApp: "#25D366",
  Telegram: "#26A5E4",
  Email: "#EA4335",
  SMS: "#6B7280",
  Direktan: "#94A3B8",
};

// ── HELPERS ────────────────────────────────────────────────

function extractSlug(p: string): string | null {
  if (!p || p === "/") return null;
  const m = p.match(/\/(dogadjaj|events?|izvodjaci|event-select)\/([\w-]+)/i);
  return m ? m[2].toLowerCase() : null;
}

function slugsMatch(pageSlug: string, eventSlugs: string[]): boolean {
  return eventSlugs.some((es) => {
    if (pageSlug === es) return true;
    // "tea-tairovic" matches "tea-tairovic-m-tel-dvorana-..."
    if (pageSlug.startsWith(es + "-")) return true;
    if (es.startsWith(pageSlug + "-")) return true;
    return false;
  });
}

function getSource(d: any): string {
  const src = (d.utm_source || "").toLowerCase().trim();
  const ref = (d.referrer || "").toLowerCase();
  const fbclid = d.fbclid || "";
  const gclid = d.gclid || "";
  const map: Record<string, string> = {
    facebook: "Facebook",
    fb: "Facebook",
    instagram: "Instagram",
    ig: "Instagram",
    google: "Google",
    viber: "Viber",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    email: "Email",
    sms: "SMS",
    tiktok: "TikTok",
    twitter: "Twitter/X",
    linkedin: "LinkedIn",
  };
  if (src && map[src]) return map[src];
  if (ref.includes("instagram.com")) return "Instagram";
  if (ref.includes("facebook.com")) return "Facebook";
  if (ref.includes("google.")) return "Google";
  if (ref.includes("tiktok.com")) return "TikTok";
  if (ref.includes("t.co") || ref.includes("twitter.com") || ref.includes("x.com")) return "Twitter/X";
  if (ref.includes("linkedin.com")) return "LinkedIn";
  if (ref.includes("viber")) return "Viber";
  if (ref.includes("whatsapp")) return "WhatsApp";
  if (ref.includes("t.me") || ref.includes("telegram")) return "Telegram";
  if (fbclid) return ref.includes("instagram") ? "Instagram" : "Facebook";
  if (gclid) return "Google";
  if (ref && !ref.includes("e-tickets") && !ref.includes("etiketing") && ref.startsWith("http")) {
    try {
      return new URL(ref).hostname.replace("www.", "");
    } catch {}
  }
  if (src === "direct" || (!src && !ref) || (d.utm_medium || "").toLowerCase() === "none") return "Direktan";
  return src || "Ostalo";
}

function getType(d: any): { type: string; detail: string } {
  const camp = (d.utm_campaign || "").trim();
  const fbclid = d.fbclid || "";
  const gclid = d.gclid || "";
  const src = (d.utm_source || "").toLowerCase().trim();
  const med = (d.utm_medium || "").toLowerCase().trim();
  const ref = (d.referrer || "").toLowerCase();
  if (camp) return { type: "Kampanja", detail: camp };
  if (gclid) return { type: "Google klik", detail: "Bez UTM" };
  if (fbclid) return { type: "FB/IG klik", detail: "Bez UTM" };
  if ((src === "google" && (med === "organic" || !med)) || (ref.includes("google.") && !gclid))
    return { type: "Organski", detail: "Pretraga" };
  const soc: [string[], string][] = [
    [["facebook", "facebook.com", "l.facebook.com"], "Facebook"],
    [["instagram", "instagram.com", "l.instagram.com"], "Instagram"],
    [["tiktok", "tiktok.com"], "TikTok"],
    [["viber"], "Viber"],
    [["whatsapp"], "WhatsApp"],
    [["telegram", "t.me"], "Telegram"],
  ];
  for (const [keys, name] of soc) {
    if (keys.includes(src) || keys.some((k) => ref.includes(k))) return { type: "Organski", detail: name };
  }
  if (ref && !ref.includes("e-tickets") && !ref.includes("etiketing") && ref.startsWith("http"))
    return { type: "Referral", detail: "" };
  if (src === "direct" || (!src && !ref) || med === "none") return { type: "Direktan", detail: "" };
  return { type: "Ostalo", detail: med || "" };
}

function parseDevice(ua: string): string {
  if (!ua) return "Desktop";
  const l = ua.toLowerCase();
  if (/ipad|tablet/.test(l)) return "Tablet";
  if (/mobile|iphone|ipod|android(?!.*tablet)|blackberry|opera mini|iemobile/.test(l)) return "Mobilni";
  return "Desktop";
}
function parseOS(ua: string): string {
  if (!ua) return "Nepoznato";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Ostalo";
}

const f = {
  eur: (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n),
  n: (n: number) => new Intl.NumberFormat("de-DE").format(n),
  p: (n: number) => `${n.toFixed(1)}%`,
  d: (d: string) => {
    const x = new Date(d);
    return `${x.getDate()}.${x.getMonth() + 1}.${x.getFullYear()}`;
  },
};

function dateRange(v: string): { start: Date; end: Date } | null {
  if (v === "all") return null;
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const d: Record<string, number> = { yesterday: -1, "7days": -6, "30days": -29, "90days": -89 };
  if (d[v]) start.setUTCDate(start.getUTCDate() + d[v]);
  if (v === "yesterday") end.setUTCDate(end.getUTCDate() - 1);
  return { start, end };
}

// ── CACHE ──────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 minuta
const _statsCache = new Map<string, { data: Stats; ts: number }>();
const _behaviorCache = new Map<string, { pages: PageData[]; clicks: ButtonClickData[]; ts: number }>();

async function paginate(q: any): Promise<any[]> {
  let a: any[] = [],
    o = 0;
  while (true) {
    const { data, error } = await q.range(o, o + 999);
    if (error || !data || !data.length) break;
    a = [...a, ...data];
    if (data.length < 1000) break;
    o += 1000;
  }
  return a;
}

// ── DATA ───────────────────────────────────────────────────

async function loadEvents(period: string): Promise<EventOption[]> {
  // 1. Konverzije (prodaje) iz analytics
  let q = supabase.from("analytics_conversions").select("event_id,event_name,landing_page,amount,quantity");
  const r = dateRange(period);
  if (r) q = q.gte("created_at", r.start.toISOString()).lte("created_at", r.end.toISOString());
  const data = await paginate(q);
  const m = new Map<string, EventOption>();
  data.forEach((c: any) => {
    if (!c.event_name) return;
    const slug = extractSlug(c.landing_page || "") || "";
    const k = c.event_id || c.event_name;
    if (!m.has(k)) m.set(k, { eventId: k, eventName: c.event_name, slug, rev: 0, purch: 0, tix: 0 });
    const e = m.get(k)!;
    e.purch++;
    e.rev += parseFloat(c.amount || 0);
    e.tix += parseInt(c.quantity || 1);
  });

  // 2. Svi eventi iz AboutEvents — dodaj one koji nedostaju
  try {
    const { data: allEvents } = await supabase
      .from("AboutEvents")
      .select("eventId, name, slug, status")
      .order("date", { ascending: false });
    if (allEvents) {
      allEvents.forEach((ev: any) => {
        if (!ev.name) return;
        const k = ev.eventId || ev.name;
        if (!m.has(k)) {
          m.set(k, { eventId: k, eventName: ev.name, slug: ev.slug || "", rev: 0, purch: 0, tix: 0 });
        }
      });
    }
  } catch (e) {
    console.error("Failed to load AboutEvents:", e);
  }

  return Array.from(m.values()).sort((a, b) => b.rev - a.rev);
}

async function loadStats(ev: EventOption, period: string): Promise<Stats> {
  const r = dateRange(period);
  let cq = supabase.from("analytics_conversions").select("*").eq("event_name", ev.eventName);
  if (r) cq = cq.gte("created_at", r.start.toISOString()).lte("created_at", r.end.toISOString());
  const conv = await paginate(cq);

  const slugs = new Set<string>();
  conv.forEach((c: any) => {
    const s = extractSlug(c.landing_page || "");
    if (s) slugs.add(s);
  });
  if (ev.slug) slugs.add(ev.slug);
  const nameSlug = ev.eventName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (nameSlug) slugs.add(nameSlug);
  const sa = Array.from(slugs);

  // Dohvati pageview-e FILTRIRANE po slug-u na nivou baze (ne sve pa filtrirati u JS-u)
  const slugFilters = sa.map(s => `page_path.ilike.%${s}%`);
  const convVisitorIds = new Set(conv.map((c: any) => c.visitor_id));

  // 1. Pageview-i po slug-u eventa (filtrirano u bazi)
  let slugPV: any[] = [];
  if (slugFilters.length > 0) {
    let pq = supabase
      .from("analytics_events")
      .select("visitor_id,session_id,utm_source,utm_medium,utm_campaign,fbclid,gclid,referrer,user_agent,country_code,created_at,page_path")
      .eq("event_type", "pageview")
      .or(slugFilters.join(","));
    if (r) pq = pq.gte("created_at", r.start.toISOString()).lte("created_at", r.end.toISOString());
    slugPV = await paginate(pq);
    // Dodatno filtriraj u JS-u za tačan slug match (ilike je previše širok)
    slugPV = slugPV.filter((p) => {
      const s = extractSlug(p.page_path || "");
      return s && slugsMatch(s, sa);
    });
  }

  // Sad koristimo samo slugPV za sve statistike - nema više visitor-based napuhavanja

  // visitor info for conversions
  const cvids = [...new Set(conv.map((c: any) => c.visitor_id))];
  const vi = new Map<string, { cc: string; ua: string }>();
  slugPV.forEach((p) => {
    if (cvids.includes(p.visitor_id) && !vi.has(p.visitor_id))
      vi.set(p.visitor_id, { cc: p.country_code || "", ua: p.user_agent || "" });
  });
  const miss = cvids.filter((id) => !vi.has(id));
  for (let i = 0; i < miss.length; i += 50) {
    const b = miss.slice(i, i + 50);
    const { data: vs } = await supabase
      .from("analytics_visitors")
      .select("visitor_id,country_code")
      .in("visitor_id", b);
    vs?.forEach((v: any) => {
      if (!vi.has(v.visitor_id)) vi.set(v.visitor_id, { cc: v.country_code || "", ua: "" });
    });
  }

  // CHANNELS - koristimo SAMO slug-bazirane posjete (ne visitor posjete drugih stranica)
  const chm = new Map<
    string,
    { visits: number; vset: Set<string>; purchases: number; tickets: number; revenue: number }
  >();
  const ensure = (s: string) => {
    if (!chm.has(s)) chm.set(s, { visits: 0, vset: new Set(), purchases: 0, tickets: 0, revenue: 0 });
  };
  slugPV.forEach((p) => {
    const s = getSource(p);
    ensure(s);
    const c = chm.get(s)!;
    c.visits++;
    c.vset.add(p.visitor_id);
  });
  conv.forEach((c: any) => {
    const s = getSource(c);
    ensure(s);
    const ch = chm.get(s)!;
    ch.purchases++;
    ch.tickets += parseInt(c.quantity || 1);
    ch.revenue += parseFloat(c.amount || 0);
  });
  const channels: ChannelRow[] = Array.from(chm.entries())
    .map(([source, d]) => ({
      source,
      visits: d.visits,
      unique: d.vset.size,
      purchases: d.purchases,
      tickets: d.tickets,
      revenue: d.revenue,
      conv: d.vset.size > 0 ? (d.purchases / d.vset.size) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.visits - a.visits);

  // CAMPAIGNS - samo koji imaju utm_campaign
  const cpm = new Map<
    string,
    {
      campaign: string;
      source: string;
      visits: number;
      vset: Set<string>;
      purchases: number;
      tickets: number;
      revenue: number;
    }
  >();
  slugPV.forEach((p) => {
    const camp = (p.utm_campaign || "").trim();
    if (!camp) return;
    const s = getSource(p);
    const k = `${camp}|${s}`;
    if (!cpm.has(k))
      cpm.set(k, { campaign: camp, source: s, visits: 0, vset: new Set(), purchases: 0, tickets: 0, revenue: 0 });
    const c = cpm.get(k)!;
    c.visits++;
    c.vset.add(p.visitor_id);
  });
  conv.forEach((c: any) => {
    const camp = (c.utm_campaign || "").trim();
    if (!camp) return;
    const s = getSource(c);
    const k = `${camp}|${s}`;
    if (!cpm.has(k))
      cpm.set(k, { campaign: camp, source: s, visits: 0, vset: new Set(), purchases: 0, tickets: 0, revenue: 0 });
    const ch = cpm.get(k)!;
    ch.purchases++;
    ch.tickets += parseInt(c.quantity || 1);
    ch.revenue += parseFloat(c.amount || 0);
  });
  const campaigns: CampaignRow[] = Array.from(cpm.values())
    .map((d) => ({
      campaign: d.campaign,
      source: d.source,
      visits: d.visits,
      unique: d.vset.size,
      purchases: d.purchases,
      tickets: d.tickets,
      revenue: d.revenue,
      conv: d.vset.size > 0 ? (d.purchases / d.vset.size) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.visits - a.visits);

  // DETAILS - svaki source + type + detail
  const dtm = new Map<
    string,
    {
      source: string;
      type: string;
      detail: string;
      visits: number;
      vset: Set<string>;
      purchases: number;
      tickets: number;
      revenue: number;
    }
  >();
  slugPV.forEach((p) => {
    const s = getSource(p);
    const t = getType(p);
    const k = `${s}|${t.type}|${t.detail}`;
    if (!dtm.has(k))
      dtm.set(k, {
        source: s,
        type: t.type,
        detail: t.detail,
        visits: 0,
        vset: new Set(),
        purchases: 0,
        tickets: 0,
        revenue: 0,
      });
    const d = dtm.get(k)!;
    d.visits++;
    d.vset.add(p.visitor_id);
  });
  conv.forEach((c: any) => {
    const s = getSource(c);
    const t = getType(c);
    const k = `${s}|${t.type}|${t.detail}`;
    if (!dtm.has(k))
      dtm.set(k, {
        source: s,
        type: t.type,
        detail: t.detail,
        visits: 0,
        vset: new Set(),
        purchases: 0,
        tickets: 0,
        revenue: 0,
      });
    const d = dtm.get(k)!;
    d.purchases++;
    d.tickets += parseInt(c.quantity || 1);
    d.revenue += parseFloat(c.amount || 0);
  });
  const details: DetailRow[] = Array.from(dtm.values())
    .map((d) => ({
      source: d.source,
      type: d.type,
      detail: d.detail,
      visits: d.visits,
      unique: d.vset.size,
      purchases: d.purchases,
      tickets: d.tickets,
      revenue: d.revenue,
      conv: d.vset.size > 0 ? (d.purchases / d.vset.size) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.visits - a.visits);

  // COUNTRIES - koristimo slugPV za posjete na event stranicama
  const cm = new Map<string, CountryRow>();
  slugPV.forEach((p) => {
    const c = (p.country_code || "XX").toUpperCase();
    const i = FL[c] || { n: c, f: "🌍" };
    if (!cm.has(c)) cm.set(c, { code: c, name: i.n, flag: i.f, visits: 0, purchases: 0, revenue: 0 });
    cm.get(c)!.visits++;
  });
  conv.forEach((c: any) => {
    const v = vi.get(c.visitor_id);
    const co = (v?.cc || "XX").toUpperCase();
    const i = FL[co] || { n: co, f: "🌍" };
    if (!cm.has(co)) cm.set(co, { code: co, name: i.n, flag: i.f, visits: 0, purchases: 0, revenue: 0 });
    cm.get(co)!.purchases++;
    cm.get(co)!.revenue += parseFloat(c.amount || 0);
  });

  // DEVICES
  const dm = new Map<string, DeviceRow>();
  slugPV.forEach((p) => {
    const d = parseDevice(p.user_agent || "");
    if (!dm.has(d)) dm.set(d, { device: d, visits: 0, purchases: 0, revenue: 0, pct: 0 });
    dm.get(d)!.visits++;
  });
  conv.forEach((c: any) => {
    const v = vi.get(c.visitor_id);
    const d = parseDevice(v?.ua || "");
    if (!dm.has(d)) dm.set(d, { device: d, visits: 0, purchases: 0, revenue: 0, pct: 0 });
    dm.get(d)!.purchases++;
    dm.get(d)!.revenue += parseFloat(c.amount || 0);
  });
  const tv = slugPV.length;
  dm.forEach((d) => {
    d.pct = tv > 0 ? (d.visits / tv) * 100 : 0;
  });

  // OS
  const om = new Map<string, OSRow>();
  slugPV.forEach((p) => {
    const o = parseOS(p.user_agent || "");
    if (!om.has(o)) om.set(o, { os: o, visits: 0, purchases: 0, revenue: 0, pct: 0 });
    om.get(o)!.visits++;
  });
  conv.forEach((c: any) => {
    const v = vi.get(c.visitor_id);
    const o = parseOS(v?.ua || "");
    if (!om.has(o)) om.set(o, { os: o, visits: 0, purchases: 0, revenue: 0, pct: 0 });
    om.get(o)!.purchases++;
    om.get(o)!.revenue += parseFloat(c.amount || 0);
  });
  om.forEach((o) => {
    o.pct = tv > 0 ? (o.visits / tv) * 100 : 0;
  });

  // DAILY
  const dym = new Map<string, DailyRow>();
  slugPV.forEach((p) => {
    const dt = p.created_at?.split("T")[0];
    if (!dt) return;
    if (!dym.has(dt)) dym.set(dt, { date: dt, visits: 0, purchases: 0, revenue: 0 });
    dym.get(dt)!.visits++;
  });
  conv.forEach((c: any) => {
    const dt = c.created_at?.split("T")[0];
    if (!dt) return;
    if (!dym.has(dt)) dym.set(dt, { date: dt, visits: 0, purchases: 0, revenue: 0 });
    dym.get(dt)!.purchases++;
    dym.get(dt)!.revenue += parseFloat(c.amount || 0);
  });

  const uv = new Set(slugPV.map((p) => p.visitor_id)).size;
  const tp = conv.length;
  const tr = conv.reduce((s: number, c: any) => s + parseFloat(c.amount || 0), 0);
  const tt = conv.reduce((s: number, c: any) => s + parseInt(c.quantity || 1), 0);

  return {
    visits: tv,
    unique: uv,
    purchases: tp,
    revenue: tr,
    tickets: tt,
    conv: uv > 0 ? (tp / uv) * 100 : 0,
    channels,
    campaigns,
    details,
    countries: Array.from(cm.values()).sort((a, b) => b.revenue - a.revenue || b.visits - a.visits),
    devices: Array.from(dm.values()).sort((a, b) => b.visits - a.visits),
    os: Array.from(om.values()).sort((a, b) => b.visits - a.visits),
    daily: Array.from(dym.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ── CSV ────────────────────────────────────────────────────

function csv(name: string, s: Stats) {
  const L: string[] = [];
  const r = (...c: (string | number)[]) => L.push(c.map((x) => `"${x}"`).join(","));
  const bl = () => L.push("");
  r("Događaj", name);
  r("Prihod", s.revenue.toFixed(2));
  r("Kupovine", s.purchases);
  r("Karata", s.tickets);
  r("Posjetioci", s.unique);
  r("Posjete", s.visits);
  r("Konverzija %", s.conv.toFixed(1));
  bl();
  r("KANALI");
  r("Izvor", "Posjete", "Unique", "Kupovine", "Karata", "Prihod EUR", "Konverzija %");
  s.channels.forEach((c) =>
    r(c.source, c.visits, c.unique, c.purchases, c.tickets, c.revenue.toFixed(2), c.conv.toFixed(1)),
  );
  bl();
  r("KAMPANJE");
  r("Kampanja", "Izvor", "Posjete", "Unique", "Kupovine", "Karata", "Prihod EUR", "Konverzija %");
  s.campaigns.forEach((c) =>
    r(c.campaign, c.source, c.visits, c.unique, c.purchases, c.tickets, c.revenue.toFixed(2), c.conv.toFixed(1)),
  );
  bl();
  r("DETALJNO");
  r("Izvor", "Tip", "Detalj", "Posjete", "Unique", "Kupovine", "Karata", "Prihod EUR", "Konverzija %");
  s.details.forEach((d) =>
    r(d.source, d.type, d.detail, d.visits, d.unique, d.purchases, d.tickets, d.revenue.toFixed(2), d.conv.toFixed(1)),
  );
  bl();
  r("DRŽAVE");
  r("Država", "Kod", "Posjete", "Kupovine", "Prihod EUR");
  s.countries.forEach((c) => r(c.name, c.code, c.visits, c.purchases, c.revenue.toFixed(2)));
  bl();
  r("UREĐAJI");
  r("Uređaj", "Posjete", "Kupovine", "Prihod EUR", "%");
  s.devices.forEach((d) => r(d.device, d.visits, d.purchases, d.revenue.toFixed(2), d.pct.toFixed(1)));
  bl();
  r("OPERATIVNI SISTEMI");
  r("OS", "Posjete", "Kupovine", "Prihod EUR", "%");
  s.os.forEach((o) => r(o.os, o.visits, o.purchases, o.revenue.toFixed(2), o.pct.toFixed(1)));
  bl();
  r("DNEVNI TREND");
  r("Datum", "Posjete", "Kupovine", "Prihod EUR");
  s.daily.forEach((d) => r(d.date, d.visits, d.purchases, d.revenue.toFixed(2)));
  const blob = new Blob(["\uFEFF" + L.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "-").toLowerCase()}-analytics-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── COMPONENT ──────────────────────────────────────────────

export default function EventAnalyticsDashboard() {
  const [period, setPeriod] = useState("30days");
  const [sel, setSel] = useState<EventOption | null>(null);
  const [evts, setEvts] = useState<EventOption[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [le, setLe] = useState(false);
  const [ls, setLs] = useState(false);

  const load1 = async () => {
    setLe(true);
    try {
      setEvts(await loadEvents(period));
    } catch (e) {
      console.error(e);
    } finally {
      setLe(false);
    }
  };
  const loadBehaviorData = async (ev: EventOption): Promise<{ pages: PageData[]; clicks: ButtonClickData[] }> => {
    try {
      const r = dateRange(period);

      const eventSlugs = new Set<string>();
      if (ev.slug) eventSlugs.add(ev.slug);
      const nameSlug = ev.eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (nameSlug) eventSlugs.add(nameSlug);
      const sa = Array.from(eventSlugs);
      const slugFilters = sa.map(s => `page_path.ilike.%${s}%`).join(",");

      // Pageviews - filtriramo u bazi po slug-u, ne više sve
      let pvQ = supabase.from("analytics_events")
        .select("page_path,page_title,visitor_id")
        .eq("event_type", "pageview");
      if (slugFilters) pvQ = pvQ.or(slugFilters);
      if (r) pvQ = pvQ.gte("created_at", r.start.toISOString()).lte("created_at", r.end.toISOString());
      const allPV = await paginate(pvQ);

      // Precizni JS filter (ilike je previše širok)
      const filteredPV = allPV.filter((pv: any) => {
        const s = extractSlug(pv.page_path || "");
        return s && slugsMatch(s, sa);
      });

      const pageMap = new Map<string, PageData>();
      const visitorsByPage = new Map<string, Set<string>>();

      filteredPV.forEach((pv: any) => {
        const path = pv.page_path || "/";
        if (!pageMap.has(path)) {
          pageMap.set(path, { path, title: pv.page_title || "", views: 0, uniqueVisitors: 0 });
          visitorsByPage.set(path, new Set());
        }
        pageMap.get(path)!.views++;
        visitorsByPage.get(path)!.add(pv.visitor_id);
        if (pv.page_title && !pageMap.get(path)!.title) {
          pageMap.get(path)!.title = pv.page_title;
        }
      });

      visitorsByPage.forEach((visitors, path) => {
        if (pageMap.has(path)) pageMap.get(path)!.uniqueVisitors = visitors.size;
      });

      // Button clicks - filtriramo u bazi po slug-u
      let bQ = supabase.from("analytics_events")
        .select("event_type,page_path,metadata")
        .in("event_type", ["click", "button_click"]);
      if (slugFilters) bQ = bQ.or(slugFilters);
      if (r) bQ = bQ.gte("created_at", r.start.toISOString()).lte("created_at", r.end.toISOString());
      const { data: clicks } = await bQ.limit(5000);

      const clickMap = new Map<string, ButtonClickData>();
      (clicks || []).forEach((c: any) => {
        const s = extractSlug(c.page_path || "");
        if (!s || !slugsMatch(s, sa)) return;
        const text = c.metadata?.button_text || c.metadata?.text || "Click";
        const key = `${text}-${c.page_path}`;
        if (!clickMap.has(key)) {
          clickMap.set(key, { buttonText: text, fromPage: c.page_path || "/", toPage: c.metadata?.to_page || "/", clicks: 0 });
        }
        clickMap.get(key)!.clicks++;
      });

      return {
        pages: Array.from(pageMap.values()),
        clicks: Array.from(clickMap.values()).sort((a, b) => b.clicks - a.clicks).slice(0, 10),
      };
    } catch (e) {
      console.error("Behavior data error:", e);
      return { pages: [], clicks: [] };
    }
  };

  const load2 = async (force = false) => {
    if (!sel) return;
    const cacheKey = `${sel.eventId}:${period}`;
    if (!force) {
      const cs = _statsCache.get(cacheKey);
      const cb = _behaviorCache.get(cacheKey);
      if (cs && Date.now() - cs.ts < CACHE_TTL) {
        setStats(cs.data);
        if (cb && Date.now() - cb.ts < CACHE_TTL) {
          setPageData(cb.pages);
          setButtonClicks(cb.clicks);
        }
        return;
      }
    }
    setLs(true);
    setStats(null);
    try {
      const [s, b] = await Promise.all([loadStats(sel, period), loadBehaviorData(sel)]);
      _statsCache.set(cacheKey, { data: s, ts: Date.now() });
      _behaviorCache.set(cacheKey, { ...b, ts: Date.now() });
      setStats(s);
      setPageData(b.pages);
      setButtonClicks(b.clicks);
    } catch (e) {
      console.error(e);
    } finally {
      setLs(false);
    }
  };
  useEffect(() => {
    load1();
  }, [period]);
  useEffect(() => {
    if (sel) load2();
  }, [sel, period]);
  const pick = (id: string) => {
    const e = evts.find((x) => x.eventId === id) || null;
    setSel(e);
    if (!e) setStats(null);
  };

  const loading = le || ls;

  // ── BEHAVIOR OVERVIEW STATE ──
  const [behaviorTab, setBehaviorTab] = useState<"pages" | "engagement" | "clicks">("pages");
  const [pageData, setPageData] = useState<PageData[]>([]);
  const [buttonClicks, setButtonClicks] = useState<ButtonClickData[]>([]);

  const sortedPageData = useMemo(() => {
    return [...pageData].sort((a, b) => b.views - a.views);
  }, [pageData]);

  const maxPageViews = useMemo(() => Math.max(...sortedPageData.map(p => p.views), 1), [sortedPageData]);

  // ── UTM BUILDER STATE ──
  const [activeTab, setActiveTab] = useState<"analytics" | "utm">("analytics");
  const [utmUrl, setUtmUrl] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const UTM_PLATFORMS = [
    {
      id: "ig_story",
      name: "Instagram Story",
      icon: "📱",
      color: "from-pink-500 to-orange-400",
      src: "instagram",
      med: "story",
    },
    {
      id: "ig_post",
      name: "Instagram Post",
      icon: "📸",
      color: "from-purple-500 to-pink-500",
      src: "instagram",
      med: "social",
    },
    {
      id: "ig_ad",
      name: "Instagram Reklama",
      icon: "💰",
      color: "from-purple-600 to-pink-600",
      src: "instagram",
      med: "paid_social",
    },
    {
      id: "fb_post",
      name: "Facebook Post",
      icon: "📘",
      color: "from-blue-600 to-blue-500",
      src: "facebook",
      med: "social",
    },
    {
      id: "fb_ad",
      name: "Facebook Reklama",
      icon: "💵",
      color: "from-blue-700 to-blue-600",
      src: "facebook",
      med: "paid_social",
    },
    { id: "tiktok", name: "TikTok", icon: "🎵", color: "from-gray-700 to-gray-900", src: "tiktok", med: "social" },
    { id: "viber", name: "Viber", icon: "💜", color: "from-purple-600 to-purple-500", src: "viber", med: "chat" },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: "💬",
      color: "from-green-500 to-green-600",
      src: "whatsapp",
      med: "chat",
    },
    { id: "telegram", name: "Telegram", icon: "📨", color: "from-blue-400 to-blue-500", src: "telegram", med: "chat" },
    { id: "email", name: "Email", icon: "📧", color: "from-red-500 to-red-400", src: "email", med: "email" },
    { id: "sms", name: "SMS", icon: "💬", color: "from-gray-500 to-gray-600", src: "sms", med: "sms" },
    {
      id: "partner",
      name: "Partner (univerzalni)",
      icon: "🤝",
      color: "from-amber-500 to-amber-600",
      src: "partner",
      med: "referral",
    },
  ];

  const genUtmLink = (p: (typeof UTM_PLATFORMS)[0]) => {
    const base = utmUrl.split("?")[0];
    const camp = utmCampaign.trim() || "kampanja";
    return `${base}?utm_source=${p.src}&utm_medium=${p.med}&utm_campaign=${encodeURIComponent(camp)}`;
  };

  const copyLink = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllLinks = async () => {
    const camp = utmCampaign.trim() || "kampanja";
    const all = UTM_PLATFORMS.map((p) => `${p.name}:\n${genUtmLink(p)}`).join("\n\n");
    await navigator.clipboard.writeText(all);
    setCopiedId("all");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── STYLES ──
  const bg = "#f0f4f8";
  const card = "bg-white rounded-2xl shadow-sm border border-gray-100";
  const cardLight = "bg-white rounded-2xl shadow-sm border border-gray-100";

  return (
    <div
      className="min-h-screen p-4 sm:p-8 text-sm"
      style={{ background: bg, color: "#1e293b", fontFamily: "'Inter',system-ui,sans-serif" }}
    >
      <div className="max-w-[960px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Analytics</h1>
            <p className="text-xs text-gray-400 mt-0.5">Promet i prodaja po događajima</p>
          </div>
          <div className="flex items-center gap-2">
            {stats && sel && (
              <button
                onClick={() => csv(sel.eventName, stats)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            )}
            <button
              onClick={() => {
                load1();
                if (sel) load2(true);
              }}
              disabled={loading}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-all text-gray-600"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <div className={`${card} p-4 mb-6`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase text-gray-400 mb-1 tracking-widest">Događaj</div>
              <select
                value={sel?.eventId || ""}
                onChange={(e) => pick(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold bg-white border border-gray-200 text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30 transition-all"
              >
                <option value="">— Izaberi događaj —</option>
                {evts.map((e) => (
                  <option key={e.eventId} value={e.eventId}>
                    {e.eventName} ({e.purch} kup. / {f.eur(e.rev)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-gray-400 mb-1 tracking-widest">Period</div>
              <div className="inline-flex rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                {PERIODS.map((r) => (
                  <button
                    key={r.v}
                    onClick={() => setPeriod(r.v)}
                    className={`px-3 py-2.5 text-xs font-bold transition-all ${period === r.v ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                  >
                    {r.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mb-6">
          {[
            { k: "analytics" as const, l: "📊 Analitika" },
            { k: "utm" as const, l: "🔗 UTM Builder" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setActiveTab(t.k)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === t.k ? "bg-blue-500 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800"}`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* ══════ UTM BUILDER TAB ══════ */}
        {activeTab === "utm" && (
          <div className="space-y-5">
            <div className={`${card} p-5`}>
              <div className="text-lg font-black text-gray-900 mb-1">UTM Link Builder</div>
              <p className="text-xs text-slate-400 mb-5">Generiši linkove sa UTM parametrima za praćenje kampanja</p>

              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-widest">
                    URL događaja
                  </div>
                  <input
                    value={utmUrl}
                    onChange={(e) => setUtmUrl(e.target.value)}
                    placeholder="https://etickets.ba/dogadjaj/ime-dogadjaja"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-widest">
                    Kampanja / Partner kod
                  </div>
                  <input
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="npr. etickets, kamarad, org_marko"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                  />
                </div>
              </div>

              {utmUrl.trim() && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={copyAllLinks}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${copiedId === "all" ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    {copiedId === "all" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Sve kopirano!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Kopiraj sve linkove
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {utmUrl.trim() ? (
              <div className="grid gap-2.5">
                {UTM_PLATFORMS.map((p) => {
                  const url = genUtmLink(p);
                  const isCopied = copiedId === p.id;
                  return (
                    <div key={p.id} className={`${card} p-4 hover:bg-gray-50 transition-all`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-lg flex-shrink-0`}
                          >
                            {p.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                            <div className="text-[11px] text-slate-500 truncate font-mono">{url}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => copyLink(p.id, url)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all ${isCopied ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"}`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Kopirano
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Kopiraj
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`${card} p-12 text-center`}>
                <Link2 className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-500 font-semibold">Unesi URL događaja da generišeš linkove</p>
              </div>
            )}

            {/* TIPS */}
            <div className={`${card} p-5`}>
              <div className="text-sm font-bold text-gray-900 mb-3">💡 Kako koristiti</div>
              <div className="space-y-2 text-xs text-slate-400">
                <p>1. Unesi URL event stranice (npr. https://etickets.ba/dogadjaj/tea-tairovic...)</p>
                <p>2. Unesi ime kampanje ili kod partnera (npr. "etickets", "kamarad", "org_marko")</p>
                <p>3. Kopiraj odgovarajući link za platformu i podijeli ga</p>
                <p>4. Sav promet preko tog linka biće vidljiv u Analitici pod kampanjama</p>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="text-xs text-amber-300 font-semibold">
                  ⚠️ Važno: Instagram automatski dodaje paid_social na SVE linkove iz story-a
                </div>
                <div className="text-xs text-amber-200/60 mt-1">
                  Jedini pouzdan indikator plaćenog oglasa je utm_campaign koji TI ručno dodaješ
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════ ANALYTICS TAB ══════ */}
        {activeTab === "analytics" && (
          <>
            {/* EMPTY */}
            {!sel && !le && (
              <div className="text-center py-24 text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-base font-semibold">Izaberi događaj</p>
              </div>
            )}

            {/* LOADING */}
            {loading && (
              <div className="flex justify-center py-20">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              </div>
            )}

            {/* ── RESULTS ── */}
            {stats && !ls && sel && (
              <div className="space-y-5">
                {/* EVENT NAME */}
                <div className={`${card} px-5 py-4 flex items-center justify-between`}>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Događaj</div>
                    <div className="text-lg font-black text-gray-900">{sel.eventName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Ukupno</div>
                    <div className="text-2xl font-black text-emerald-400">{f.eur(stats.revenue)}</div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { l: "Prihod", v: f.eur(stats.revenue), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                    { l: "Kupovine", v: String(stats.purchases), icon: ShoppingCart, color: "text-blue-400", bg: "bg-blue-400/10" },
                    { l: "Karata", v: String(stats.tickets), icon: Ticket, color: "text-violet-400", bg: "bg-violet-400/10" },
                    { l: "Posjetioci", v: f.n(stats.unique), icon: Users, color: "text-amber-400", bg: "bg-amber-400/10" },
                    { l: "Posjete", v: f.n(stats.visits), icon: Eye, color: "text-sky-400", bg: "bg-sky-400/10" },
                    { l: "Konverzija", v: f.p(stats.conv), icon: BarChart3, color: "text-rose-400", bg: "bg-rose-400/10" },
                  ].map((k) => (
                    <div key={k.l} className={`${card} p-4 flex flex-col gap-2`}>
                      <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                        <k.icon className={`w-4 h-4 ${k.color}`} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{k.l}</div>
                        <div className={`text-xl font-black mt-0.5 ${k.color}`}>{k.v}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CHANNELS - JEDNA OBJEDINJENA TABELA */}
                <DarkSection title="Kanali">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Izvor", "Posjete", "Unique", "Kupovine", "Karata", "Prihod", "Konv.", "Udio"].map((h, i) => (
                          <th
                            key={h}
                            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 ${i > 0 ? "text-right" : "text-left"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.channels.map((c, i) => {
                        const share = stats.revenue > 0 ? (c.revenue / stats.revenue) * 100 : 0;
                        const color = SRC_COLORS[c.source] || "#94a3b8";
                        return (
                          <tr
                            key={c.source}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                                style={{ backgroundColor: color + "22", color }}
                              >
                                {c.source}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">{f.n(c.visits)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{f.n(c.unique)}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">{c.purchases}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{c.tickets}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">{f.eur(c.revenue)}</td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={
                                  c.conv > 5
                                    ? "text-emerald-400 font-bold"
                                    : c.conv > 2
                                      ? "text-amber-400 font-bold"
                                      : "text-slate-400"
                                }
                              >
                                {f.p(c.conv)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-2 justify-end">
                                <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${share}%`, backgroundColor: color }}
                                  />
                                </div>
                                <span className="text-xs font-semibold w-10 text-right" style={{ color }}>{f.p(share)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-gray-900">
                        <td className="px-4 py-3 text-xs uppercase tracking-widest text-slate-400">Ukupno</td>
                        <td className="px-4 py-3 text-right">{f.n(stats.visits)}</td>
                        <td className="px-4 py-3 text-right">{f.n(stats.unique)}</td>
                        <td className="px-4 py-3 text-right">{stats.purchases}</td>
                        <td className="px-4 py-3 text-right">{stats.tickets}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">{f.eur(stats.revenue)}</td>
                        <td className="px-4 py-3 text-right">{f.p(stats.conv)}</td>
                        <td className="px-4 py-3 text-right text-slate-400">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </DarkSection>

                {/* CAMPAIGNS */}
                {stats.campaigns.length > 0 && (
                  <DarkSection title="Kampanje">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["Kampanja", "Izvor", "Posjete", "Unique", "Kupovine", "Karata", "Prihod", "Konv."].map(
                            (h, i) => (
                              <th
                                key={h}
                                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 ${i > 1 ? "text-right" : "text-left"}`}
                              >
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.campaigns.map((c, i) => {
                          const color = SRC_COLORS[c.source] || "#94a3b8";
                          return (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-gray-900">{c.campaign}</td>
                              <td className="px-4 py-3">
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                                  style={{ backgroundColor: color + "22", color }}
                                >
                                  {c.source}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">{f.n(c.visits)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{f.n(c.unique)}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">{c.purchases}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{c.tickets}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">{f.eur(c.revenue)}</td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={
                                    c.conv > 5
                                      ? "text-emerald-400 font-bold"
                                      : c.conv > 2
                                        ? "text-amber-400 font-bold"
                                        : "text-slate-400"
                                  }
                                >
                                  {f.p(c.conv)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </DarkSection>
                )}

                {/* DETAILS */}
                <DarkSection title="Detaljno">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Izvor", "Tip", "Detalj", "Posjete", "Unique", "Kupovine", "Karata", "Prihod", "Konv."].map(
                          (h, i) => (
                            <th
                              key={h}
                              className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 ${i > 2 ? "text-right" : "text-left"}`}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.details.map((d, i) => {
                        const color = SRC_COLORS[d.source] || "#94a3b8";
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                                style={{ backgroundColor: color + "22", color }}
                              >
                                {d.source}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-400">{d.type}</td>
                            <td className="px-4 py-2.5 text-slate-500">{d.detail}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{f.n(d.visits)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{f.n(d.unique)}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-900">{d.purchases}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{d.tickets}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{f.eur(d.revenue)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className={
                                  d.conv > 5
                                    ? "text-emerald-400 font-bold"
                                    : d.conv > 2
                                      ? "text-amber-400 font-bold"
                                      : "text-slate-400"
                                }
                              >
                                {f.p(d.conv)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </DarkSection>

                {/* STATES */}
                <DarkSection title="Države">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Država", "Posjete", "Kupovine", "Prihod"].map((h, i) => (
                          <th
                            key={h}
                            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 ${i > 0 ? "text-right" : "text-left"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.countries.slice(0, 10).map((c) => (
                        <tr key={c.code} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="mr-2">{c.flag}</span>
                            <span className="text-gray-900">{c.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{f.n(c.visits)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900">{c.purchases}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900">{f.eur(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DarkSection>

                {/* DEVICES */}
                <DarkSection title="Uređaji">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Uređaj", "Posjete", "Kupovine", "Prihod", "%"].map((h, i) => (
                          <th
                            key={h}
                            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 ${i > 0 ? "text-right" : "text-left"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.devices.map((d) => (
                        <tr key={d.device} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{d.device}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{f.n(d.visits)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900">{d.purchases}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{f.eur(d.revenue)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-400">{f.p(d.pct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DarkSection>

                {/* OS */}
                <DarkSection title="Operativni sistem">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["OS", "Posjete", "Kupovine", "Prihod", "%"].map((h, i) => (
                          <th
                            key={h}
                            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 ${i > 0 ? "text-right" : "text-left"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.os.map((o) => (
                        <tr key={o.os} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{o.os}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{f.n(o.visits)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900">{o.purchases}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{f.eur(o.revenue)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-400">{f.p(o.pct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DarkSection>

                {/* DAILY */}
                <DarkSection title="Dnevni trend">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Datum", "Posjete", "Kupovine", "Prihod"].map((h, i) => (
                          <th
                            key={h}
                            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 ${i > 0 ? "text-right" : "text-left"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.daily.slice(-21).map((d) => (
                        <tr key={d.date} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-600">{f.d(d.date)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{f.n(d.visits)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-900">{d.purchases}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{f.eur(d.revenue)}</td>
                        </tr>
                      ))}
                      {stats.daily.length > 0 && (
                        <tr className="border-t-2 border-white/20 bg-white/[0.06] font-bold">
                          <td className="px-4 py-3 text-xs uppercase tracking-widest text-slate-400">Ukupno</td>
                          <td className="px-4 py-3 text-right text-gray-900">{f.n(stats.daily.reduce((s, d) => s + d.visits, 0))}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{stats.daily.reduce((s, d) => s + d.purchases, 0)}</td>
                          <td className="px-4 py-3 text-right text-emerald-400">{f.eur(stats.daily.reduce((s, d) => s + d.revenue, 0))}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </DarkSection>

                {/* ── BEHAVIOR OVERVIEW ── */}
                <DarkSection title="Behavior overview">
                  <div className="p-4">
                    <div className="flex gap-2 mb-4">
                      {(["pages", "engagement", "clicks"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setBehaviorTab(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            behaviorTab === t
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                          }`}
                        >
                          {t === "pages" ? "Stranice" : t === "engagement" ? "Engagement" : "Klikovi"}
                        </button>
                      ))}
                    </div>

                    {behaviorTab === "pages" && (
                      <div className="space-y-3">
                        {sortedPageData.slice(0, 10).map((pg) => (
                          <div key={pg.path}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm text-gray-800 truncate font-mono">{pg.path}</span>
                                <a href={`https://etickets.ba${pg.path}`} target="_blank" rel="noopener" className="text-slate-500 hover:text-blue-400 flex-shrink-0">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs text-slate-400">{pg.uniqueVisitors} unique</span>
                                <span className="text-sm font-bold text-gray-900">{f.n(pg.views)}</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-blue-500 transition-all"
                                style={{ width: `${Math.min((pg.views / maxPageViews) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                        {sortedPageData.length === 0 && (
                          <p className="text-center text-slate-500 py-4 text-sm">Nema podataka o stranicama</p>
                        )}
                      </div>
                    )}

                    {behaviorTab === "engagement" && (
                      <p className="text-center text-slate-500 py-4 text-sm">Engagement metrike se još ne prate</p>
                    )}

                    {behaviorTab === "clicks" && (
                      <div className="space-y-3">
                        {buttonClicks.map((btn, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center flex-shrink-0">
                              <MousePointerClick className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{btn.buttonText}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {btn.fromPage} → {btn.toPage}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-gray-900 flex-shrink-0">{f.n(btn.clicks)}</span>
                          </div>
                        ))}
                        {buttonClicks.length === 0 && (
                          <p className="text-center text-slate-500 py-4 text-sm">Nema podataka o klikovima</p>
                        )}
                      </div>
                    )}
                  </div>
                </DarkSection>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DarkSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">{title}</div>
      <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto shadow-sm">
        {children}
      </div>
    </div>
  );
}
