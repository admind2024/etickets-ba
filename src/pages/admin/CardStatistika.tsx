import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CreditCard, Building2, Globe, Download, Loader2, Database, History, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { LEGACY_BRANDS, LEGACY_ISSUERS, LEGACY_COUNTRIES, LEGACY_SUMMARY, type LegacyAggRow } from "@/data/legacyCardStats2025";

// ── Types ──
interface CardRecord {
  cardBrand: string | null;
  cardIssuer: string | null;
  cardCountry: string | null;
  totalPrice: string | null;
  eventName: string | null;
  Purchasedate: string | null;
}

interface AggRow {
  label: string;
  count: number;
  revenue: number;
  pct: number;
}

type DataSource = "all" | "nova" | "legacy";

// ── Constants ──
const PERIODS = [
  { l: "Danas", v: "today" },
  { l: "Jučer", v: "yesterday" },
  { l: "7d", v: "7days" },
  { l: "30d", v: "30days" },
  { l: "90d", v: "90days" },
  { l: "Sve", v: "all" },
] as const;

const BRAND_COLORS: Record<string, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#006FCF",
  maestro: "#0099DF",
  diners: "#004A97",
};

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  maestro: "Maestro",
  diners: "Diners Club",
};

const CACHE_TTL = 5 * 60 * 1000;

// ── Helpers ──
const f = {
  eur: (n: number) => n.toLocaleString("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  n: (n: number) => n.toLocaleString("hr-HR"),
  p: (n: number) => `${n.toFixed(1)}%`,
};

function getDateCutoff(period: string): string | null {
  const now = new Date();
  const offsets: Record<string, number> = { today: 0, yesterday: -1, "7days": -7, "30days": -30, "90days": -90 };
  if (!(period in offsets)) return null;
  const d = new Date(now);
  d.setDate(d.getDate() + (offsets[period] || 0));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function isValidCardField(val: string | null | undefined): boolean {
  if (!val) return false;
  const v = val.trim().toUpperCase();
  return v !== "" && v !== "N/A" && v !== "NULL" && v !== "UNDEFINED";
}

function aggregate(data: CardRecord[], key: keyof CardRecord): AggRow[] {
  const map = new Map<string, { count: number; revenue: number }>();
  let total = 0;
  for (const t of data) {
    const raw = t[key] as string | null;
    if (!isValidCardField(raw)) continue;
    const label = raw!.trim();
    const price = parseFloat(t.totalPrice || "0") || 0;
    const existing = map.get(label) || { count: 0, revenue: 0 };
    existing.count++;
    existing.revenue += price;
    map.set(label, existing);
    total++;
  }
  return Array.from(map.entries())
    .map(([label, { count, revenue }]) => ({
      label,
      count,
      revenue,
      pct: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function legacyToAgg(rows: LegacyAggRow[]): AggRow[] {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return rows.map((r) => ({ ...r, pct: total > 0 ? (r.count / total) * 100 : 0 })).sort((a, b) => b.revenue - a.revenue);
}

function mergeAgg(live: AggRow[], legacy: AggRow[]): AggRow[] {
  const map = new Map<string, { count: number; revenue: number }>();
  const labelMap = new Map<string, string>();
  for (const r of [...live, ...legacy]) {
    const key = r.label.toLowerCase();
    const existing = map.get(key) || { count: 0, revenue: 0 };
    existing.count += r.count;
    existing.revenue += r.revenue;
    map.set(key, existing);
    if (!labelMap.has(key)) labelMap.set(key, r.label);
  }
  const total = Array.from(map.values()).reduce((s, v) => s + v.count, 0);
  return Array.from(map.entries())
    .map(([key, { count, revenue }]) => ({
      label: labelMap.get(key) || key,
      count,
      revenue,
      pct: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ── Paginated fetch ──
async function fetchAllCards(): Promise<CardRecord[]> {
  const fields = "cardBrand,cardIssuer,cardCountry,totalPrice,eventName,Purchasedate";
  let all: CardRecord[] = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("QRKarte" as any)
      .select(fields)
      .eq("Hide", false)
      .not("cardBrand", "is", null)
      .neq("cardBrand", "N/A")
      .range(offset, offset + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all = [...all, ...(data as any)];
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

// ── Main Component ──
const CardStatistika = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CardRecord[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("__all__");
  const [period, setPeriod] = useState("all");
  const [source, setSource] = useState<DataSource>("all");
  const hasFetched = useRef(false);
  const cacheRef = useRef<{ data: CardRecord[]; ts: number } | null>(null);

  const fetchData = useCallback(async (force = false) => {
    if (!force && cacheRef.current && Date.now() - cacheRef.current.ts < CACHE_TTL) {
      setData(cacheRef.current.data);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchAllCards();
      cacheRef.current = { data: rows, ts: Date.now() };
      setData(rows);
      const evSet = new Set<string>();
      for (const r of rows) { if (r.eventName) evSet.add(r.eventName); }
      setEvents(Array.from(evSet).sort());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  // Only fetch when tab becomes visible
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
    const onVisible = () => {
      if (document.visibilityState === "visible" && cacheRef.current && Date.now() - cacheRef.current.ts > CACHE_TTL) {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData]);

  // Filter
  const filtered = useMemo(() => {
    let d = data;
    if (selectedEvent !== "__all__") d = d.filter((r) => r.eventName === selectedEvent);
    const cutoff = getDateCutoff(period);
    if (cutoff) {
      if (period === "yesterday") {
        const end = new Date(); end.setHours(0, 0, 0, 0);
        const endStr = end.toISOString().split("T")[0];
        d = d.filter((r) => r.Purchasedate && r.Purchasedate >= cutoff && r.Purchasedate < endStr);
      } else {
        d = d.filter((r) => r.Purchasedate && r.Purchasedate >= cutoff);
      }
    }
    return d;
  }, [data, selectedEvent, period]);

  // Live aggregations
  const liveBrand = useMemo(() => aggregate(filtered, "cardBrand"), [filtered]);
  const liveIssuer = useMemo(() => aggregate(filtered, "cardIssuer"), [filtered]);
  const liveCountry = useMemo(() => aggregate(filtered, "cardCountry"), [filtered]);

  // Merged aggregations
  const byBrand = useMemo(() => {
    if (source === "nova") return liveBrand;
    if (source === "legacy") return legacyToAgg(LEGACY_BRANDS);
    return mergeAgg(liveBrand, legacyToAgg(LEGACY_BRANDS));
  }, [liveBrand, source]);

  const byIssuer = useMemo(() => {
    if (source === "nova") return liveIssuer;
    if (source === "legacy") return legacyToAgg(LEGACY_ISSUERS);
    return mergeAgg(liveIssuer, legacyToAgg(LEGACY_ISSUERS));
  }, [liveIssuer, source]);

  const byCountry = useMemo(() => {
    if (source === "nova") return liveCountry;
    if (source === "legacy") return legacyToAgg(LEGACY_COUNTRIES);
    return mergeAgg(liveCountry, legacyToAgg(LEGACY_COUNTRIES));
  }, [liveCountry, source]);

  // Summary
  const summary = useMemo(() => {
    const liveTx = filtered.length;
    const liveRev = filtered.reduce((s, r) => s + (parseFloat(r.totalPrice || "0") || 0), 0);
    if (source === "nova") return { totalTx: liveTx, totalRev: liveRev, avgVal: liveTx > 0 ? liveRev / liveTx : 0 };
    if (source === "legacy") return { totalTx: LEGACY_SUMMARY.totalCards, totalRev: LEGACY_SUMMARY.totalRevenue, avgVal: LEGACY_SUMMARY.avgPrice };
    const totalTx = liveTx + LEGACY_SUMMARY.totalCards;
    const totalRev = liveRev + LEGACY_SUMMARY.totalRevenue;
    return { totalTx, totalRev, avgVal: totalTx > 0 ? totalRev / totalTx : 0 };
  }, [filtered, source]);

  // CSV export
  const exportCSV = () => {
    const header = "Tip,Naziv,Transakcije,Promet EUR,Udio %\n";
    const rows: string[] = [];
    for (const r of byBrand) rows.push(`Brend,"${r.label}",${r.count},${r.revenue.toFixed(2)},${r.pct.toFixed(1)}`);
    for (const r of byIssuer) rows.push(`Banka,"${r.label}",${r.count},${r.revenue.toFixed(2)},${r.pct.toFixed(1)}`);
    for (const r of byCountry) rows.push(`Država,"${r.label}",${r.count},${r.revenue.toFixed(2)},${r.pct.toFixed(1)}`);
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `kartice-${source}-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const isLegacyOnly = source === "legacy";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center" }}>
        {/* Source toggle */}
        <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
          {[
            { l: "Sve", v: "all" as DataSource, ico: <Database size={13} /> },
            { l: "Nova", v: "nova" as DataSource, ico: <CreditCard size={13} /> },
            { l: "2025", v: "legacy" as DataSource, ico: <History size={13} /> },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setSource(s.v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                background: source === s.v ? "#fff" : "transparent",
                color: source === s.v ? "#0f172a" : "#64748b",
                boxShadow: source === s.v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              {s.ico} {s.l}
            </button>
          ))}
        </div>

        {/* Event filter */}
        <div style={{ position: "relative" }}>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            disabled={isLegacyOnly}
            style={{
              padding: "8px 32px 8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
              fontSize: 13, fontWeight: 500, minWidth: 180, background: "#fff", color: "#334155",
              opacity: isLegacyOnly ? 0.4 : 1, cursor: isLegacyOnly ? "default" : "pointer",
              appearance: "none", WebkitAppearance: "none",
            }}
          >
            <option value="__all__">Svi eventi</option>
            {events.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
        </div>

        {/* Period */}
        <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
          {PERIODS.map((p) => (
            <button
              key={p.v}
              onClick={() => !isLegacyOnly && setPeriod(p.v)}
              style={{
                padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none",
                cursor: isLegacyOnly ? "default" : "pointer",
                background: period === p.v && !isLegacyOnly ? "#fff" : "transparent",
                color: period === p.v && !isLegacyOnly ? "#0f172a" : "#94a3b8",
                boxShadow: period === p.v && !isLegacyOnly ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                opacity: isLegacyOnly ? 0.4 : 1,
                transition: "all 0.15s",
              }}
            >
              {p.l}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button onClick={exportCSV} style={{ ...btnStyle, gap: 5 }}>
            <Download size={14} /> CSV
          </button>
          <button onClick={() => fetchData(true)} style={btnStyle}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Legacy info banner ── */}
      {source !== "nova" && (
        <div style={{
          background: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)",
          border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", marginBottom: 20,
          fontSize: 12.5, color: "#92400e", fontWeight: 500,
        }}>
          {source === "legacy"
            ? "Podaci sa stare platforme etickets.ba (Dec 2025 — Apr 2026). Filteri po eventu i periodu nisu dostupni."
            : `Kombinovani podaci: nova platforma + stara platforma etickets.ba (${f.n(LEGACY_SUMMARY.totalCards)} karata · ${f.eur(LEGACY_SUMMARY.totalRevenue)} EUR)`}
        </div>
      )}

      {loading && data.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 100, gap: 12 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: "#94a3b8" }} />
          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>Učitavanje podataka...</span>
        </div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
            <SummaryCard label="Ukupno transakcija" value={f.n(summary.totalTx)} color="#3b82f6" icon={<CreditCard size={18} />} />
            <SummaryCard label="Ukupan promet" value={`${f.eur(summary.totalRev)} EUR`} color="#10b981" icon={<TrendingUp size={18} />} />
            <SummaryCard label="Prosječna vrijednost" value={`${f.eur(summary.avgVal)} EUR`} color="#8b5cf6" icon={<Building2 size={18} />} />
          </div>

          {/* ── Tables ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            <BrandTable rows={byBrand} />
            <DataTable title="Po banci izdavatelju" icon={<Building2 size={16} />} rows={byIssuer} defaultShow={10} />
            <DataTable title="Po državi kartice" icon={<Globe size={16} />} rows={byCountry} defaultShow={15} />
          </div>
        </>
      )}
    </div>
  );
};

// ── Styles ──
const btnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
  background: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#475569",
  transition: "all 0.15s",
};

// ── Summary Card ──
function SummaryCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -8, right: -8, width: 60, height: 60, borderRadius: "50%", background: color, opacity: 0.06 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "#64748b", letterSpacing: "0.01em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

// ── Brand Table (special visual) ──
function BrandTable({ rows }: { rows: AggRow[] }) {
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
        <CreditCard size={16} style={{ color: "#3b82f6" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Kartični brendovi</span>
      </div>

      {/* Visual breakdown bar */}
      <div style={{ padding: "16px 20px 8px", display: "flex", gap: 2, height: 10, borderRadius: 6, overflow: "hidden", margin: "0 20px" }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              flex: r.count,
              background: BRAND_COLORS[r.label.toLowerCase()] || "#94a3b8",
              borderRadius: 3,
              minWidth: r.pct > 0.5 ? 4 : 0,
              transition: "flex 0.4s ease",
            }}
          />
        ))}
      </div>

      {/* Brand cards */}
      <div style={{ padding: "12px 20px 20px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {rows.map((r) => {
          const color = BRAND_COLORS[r.label.toLowerCase()] || "#64748b";
          const displayLabel = BRAND_LABELS[r.label.toLowerCase()] || r.label;
          return (
            <div key={r.label} style={{
              flex: "1 1 160px", minWidth: 160, maxWidth: 280,
              border: "1px solid #f1f5f9", borderRadius: 12, padding: "14px 16px",
              background: "#fafbfc", transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{displayLabel}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                <span>Transakcije</span>
                <span style={{ fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{f.n(r.count)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                <span>Promet</span>
                <span style={{ fontWeight: 600, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{f.eur(r.revenue)} EUR</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                <span>Udio</span>
                <span style={{ fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{r.pct.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Generic Data Table ──
function DataTable({ title, icon, rows, defaultShow = 10 }: { title: string; icon: React.ReactNode; rows: AggRow[]; defaultShow?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;

  const visible = expanded ? rows : rows.slice(0, defaultShow);
  const hasMore = rows.length > defaultShow;
  const maxRev = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#3b82f6" }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{title}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#64748b", background: "#f1f5f9",
            padding: "2px 8px", borderRadius: 10,
          }}>{rows.length}</span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Naziv</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Transakcije</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Promet (EUR)</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Udio</th>
              <th style={{ ...thStyle, width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => {
              const barW = maxRev > 0 ? (r.revenue / maxRev) * 100 : 0;
              return (
                <tr key={r.label} className="hover-row" style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ ...tdStyle, color: "#94a3b8", fontSize: 12, width: 36 }}>{i + 1}</td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 500, color: "#0f172a", fontSize: 13 }}>{r.label}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 13 }}>{f.n(r.count)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 13 }}>{f.eur(r.revenue)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#64748b", fontSize: 12.5 }}>{r.pct.toFixed(1)}%</td>
                  <td style={{ ...tdStyle, paddingRight: 20 }}>
                    <div style={{ background: "#f1f5f9", borderRadius: 3, height: 6, width: "100%" }}>
                      <div style={{
                        background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                        borderRadius: 3, height: 6, width: `${barW}%`,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: "100%", padding: "12px 20px", border: "none", borderTop: "1px solid #f1f5f9",
            background: "#fafbfc", cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#3b82f6",
            transition: "background 0.15s",
          }}
        >
          {expanded ? <><ChevronUp size={14} /> Prikaži manje</> : <><ChevronDown size={14} /> Prikaži sve ({rows.length})</>}
        </button>
      )}

      <style>{`.hover-row:hover { background: #f8fafc !important; }`}</style>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600,
  color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em",
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle: React.CSSProperties = {
  padding: "11px 16px", fontSize: 13, color: "#334155",
};

export default CardStatistika;
