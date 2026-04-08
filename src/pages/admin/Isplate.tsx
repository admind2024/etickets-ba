import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Banknote, Loader2, X, Search, ChevronDown, Printer, Save, ArrowLeft, Plus, Trash2 } from "lucide-react";

const supabase = createClient(
  "https://hvpytasddzeprgqkwlbu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHl0YXNkZHplcHJncWt3bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDMyODQsImV4cCI6MjA4MjE3OTI4NH0.R1wPgBpyO7MHs0YL_pW0XBKkX8QweJ8MuhHUpuDSuKk",
);

// ─── Helpers ───
function normCh(ch: string | null | undefined): string {
  if (!ch) return "online";
  const c = ch.trim().toLowerCase();
  if (c.includes("gotovina") || c === "biletarnica") return "biletarnica";
  if (c.includes("virman") || c.includes("bank") || c.includes("transfer")) return "virman";
  if (c.includes("kartica")) return "kartica";
  if (c.includes("rezervacija")) return "rezervacija";
  return "online";
}
function fmt(n: number) {
  return n.toLocaleString("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(n: number) {
  return n.toLocaleString("hr-HR");
}

// ─── Types ───
interface AvailableEvent { name: string; count: number }

interface TicketRow {
  eventName: string;
  eventId: string;
  salesChannel: string;
  price: string;
  Purchasedate: string;
  Valuta: string;
  Hide: boolean | null;
  category: string;
}

interface EventFees {
  serviceFeePercentage: number;
  pdvPercentage: number;
  biletarnicaFee: number;
}

interface Deduction { name: string; amount: number }

// ─── Styles ───
const ROOT: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f8f9fb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  colorScheme: "light",
  color: "#1f2937",
};
const CARD: React.CSSProperties = { background: "#fff", border: "1px solid #d1d5db", borderRadius: 12 };
const BTN_PRIMARY: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 18px", background: "#2563eb", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
const BTN_SECONDARY: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 18px", background: "#fff", color: "#374151",
  border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};
const BTN_SUCCESS: React.CSSProperties = {
  ...BTN_PRIMARY, background: "#059669",
};
const INPUT: React.CSSProperties = {
  padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8,
  fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
  background: "#fff", color: "#1f2937",
};
const TH: React.CSSProperties = {
  padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.05em", color: "#64748b", borderBottom: "2px solid #e2e8f0",
  whiteSpace: "nowrap", background: "#f8fafc",
};
const TD: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 13, color: "#1f2937" };

// ═══════════════════════════════════════════════════
export default function Isplate() {
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Učitavanje događaja...");
  const [error, setError] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [ticketsData, setTicketsData] = useState<Record<string, TicketRow[]>>({});
  const [feesMap, setFeesMap] = useState<Record<string, EventFees>>({});
  const [showReport, setShowReport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const h = (e: MouseEvent) => {
      const dd = document.getElementById("isplate-dd");
      if (dd && !dd.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dropdownOpen]);

  useEffect(() => { loadEvents(); }, []);

  // ─── Load events (isti pristup kao Pazar) ───
  async function loadEvents() {
    try {
      setLoading(true);
      // 1. AboutEvents za listu i fee info
      const { data: ae, error: e1 } = await supabase
        .from("AboutEvents")
        .select("name, id, eventId, serviceFeePercentage, biletarnicaFee, pdvPercentage, online, biletarnica, capacity, currency, status, hide");
      if (e1) throw e1;

      const names = (ae || []).map(e => e.name).filter(Boolean);

      // Build fees map
      const fees: Record<string, EventFees> = {};
      (ae || []).forEach((ev: any) => {
        if (ev.name) {
          fees[ev.name] = {
            serviceFeePercentage: Number(ev.serviceFeePercentage || 0),
            pdvPercentage: Number(ev.pdvPercentage || 0),
            biletarnicaFee: Number(ev.biletarnicaFee || 0),
          };
        }
      });
      setFeesMap(fees);

      if (!names.length) {
        setAvailableEvents([]);
        setLoading(false);
        return;
      }

      // 2. Broj karata iz QRKarte (BEZ filtera po Hide - isto kao Pazar)
      const { data, error: e2 } = await supabase
        .from("QRKarte")
        .select("eventName")
        .in("eventName", names)
        .not("eventName", "is", null);
      if (e2) throw e2;

      const cm: Record<string, number> = {};
      data?.forEach((t: any) => { if (t.eventName) cm[t.eventName] = (cm[t.eventName] || 0) + 1; });
      // Dodaj i evente sa 0 karata
      names.forEach(n => { if (!cm[n]) cm[n] = 0; });

      setAvailableEvents(
        Object.entries(cm)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  // ─── Load tickets for selected events (isti kao Pazar) ───
  async function loadTicketsForEvents() {
    if (!selectedEvents.length) return;
    try {
      setLoading(true);
      setShowReport(false);
      const all: Record<string, TicketRow[]> = {};
      let p = 0;
      for (const en of selectedEvents) {
        p++;
        setLoadingMsg(`Učitavanje ${p}/${selectedEvents.length}: ${en}`);
        let tickets: TicketRow[] = [], from = 0;
        while (true) {
          const { data, error: fe } = await supabase
            .from("QRKarte")
            .select("eventName, eventId, salesChannel, price, Purchasedate, Valuta, Hide, category")
            .eq("eventName", en)
            .range(from, from + 999);
          if (fe) throw fe;
          if (data) tickets = tickets.concat(data as TicketRow[]);
          if (!data || data.length < 1000) break;
          from += 1000;
        }
        all[en] = tickets;
      }
      setTicketsData(all);

      // Load deductions za prvi selektovani event
      if (selectedEvents.length > 0) {
        const firstTickets = all[selectedEvents[0]];
        const eid = firstTickets?.[0]?.eventId;
        if (eid) await loadDeductions(eid);
        else setDeductions([]);
      }

      setShowReport(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  // ─── Deductions CRUD ───
  async function loadDeductions(eventId: string) {
    try {
      const { data } = await supabase
        .from("EventDeductions")
        .select("deductions")
        .eq("eventId", eventId)
        .order("updated_at", { ascending: false })
        .limit(1);
      setDeductions(data?.[0]?.deductions || []);
    } catch { setDeductions([]); }
  }

  async function saveDeductions() {
    if (!selectedEvents.length) return;
    const tickets = ticketsData[selectedEvents[0]];
    const eventId = tickets?.[0]?.eventId;
    if (!eventId) return;

    setSaving(true);
    try {
      const totalAmount = deductions.reduce((s, d) => s + (d.amount || 0), 0);
      const { data: existing } = await supabase
        .from("EventDeductions").select("id").eq("eventId", eventId).limit(1);

      if (existing && existing.length > 0) {
        await supabase.from("EventDeductions").update({
          deductions, totalAmount, eventName: selectedEvents[0], updated_at: new Date().toISOString(),
        }).eq("id", existing[0].id);
      } else {
        await supabase.from("EventDeductions").insert({
          eventId, eventName: selectedEvents[0], deductions, totalAmount,
        });
      }
      setSaveMsg({ text: "Uspješno snimljeno!", ok: true });
    } catch (err: any) {
      setSaveMsg({ text: "Greška: " + err.message, ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  // ─── Computed ───
  const eventSummaries = useMemo(() => {
    return selectedEvents.map(eventName => {
      const tickets = (ticketsData[eventName] || []).filter(t => t.Hide !== true);
      const fees = feesMap[eventName] || { serviceFeePercentage: 0, pdvPercentage: 0, biletarnicaFee: 0 };
      const counts = { online: 0, biletarnica: 0, virman: 0, kartica: 0, rezervacija: 0 };
      let totalRevenue = 0, totalFees = 0;

      tickets.forEach(t => {
        const price = parseFloat(t.price) || 0;
        const ch = normCh(t.salesChannel);
        totalRevenue += price;
        counts[ch] = (counts[ch] || 0) + 1;

        const feeP = ch === "biletarnica" ? fees.biletarnicaFee : fees.serviceFeePercentage;
        const sFee = (price * feeP) / 100;
        const pdv = (sFee * fees.pdvPercentage) / 100;
        totalFees += sFee + pdv;
      });

      // Transaction fee 0.30 per ticket (excluding reservations)
      const nonReservationCount = tickets.filter(t => normCh(t.salesChannel) !== "rezervacija").length;
      totalFees += nonReservationCount * 0.30;

      return {
        eventName,
        eventId: tickets[0]?.eventId || "",
        ticketCount: tickets.length,
        ...counts,
        totalRevenue,
        totalFees,
        payout: totalRevenue - totalFees,
        currency: (tickets[0]?.Valuta || "EUR").toUpperCase(),
      };
    });
  }, [ticketsData, selectedEvents, feesMap]);

  const basePayout = eventSummaries.reduce((s, e) => s + e.payout, 0);
  const totalDeductions = deductions.reduce((s, d) => s + (d.amount || 0), 0);
  const finalPayout = basePayout - totalDeductions;
  const totalTickets = eventSummaries.reduce((s, e) => s + e.ticketCount, 0);
  const totalRevenue = eventSummaries.reduce((s, e) => s + e.totalRevenue, 0);
  const totalFeesAll = eventSummaries.reduce((s, e) => s + e.totalFees, 0);

  const filteredEvents = availableEvents.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const toggleEvent = (n: string) => setSelectedEvents(p => p.includes(n) ? p.filter(e => e !== n) : [...p, n]);

  // ─── Loading ───
  if (loading) {
    return (
      <div className="isplate-root" style={{ ...ROOT, minHeight: "auto", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={40} style={{ animation: "spin 1s linear infinite", color: "#2563eb", marginBottom: 16 }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}
.isplate-root{--foreground:222 47% 11%;--background:220 20% 97%;--input:220 13% 91%;--muted-foreground:220 9% 46%;--card:0 0% 100%;--card-foreground:222 47% 11%;--border:220 13% 87%;--popover:0 0% 100%;--popover-foreground:222 47% 11%}
.isplate-root,.isplate-root *,.isplate-root input,.isplate-root select,.isplate-root textarea,.isplate-root button{color-scheme:light!important}
.isplate-root input,.isplate-root select,.isplate-root textarea{color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;background-color:#fff!important}
.isplate-root input::placeholder{color:#9ca3af!important;-webkit-text-fill-color:#9ca3af!important}
`}</style>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#374151", margin: 0 }}>Učitavanje...</p>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{loadingMsg}</p>
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="isplate-root" style={{ ...ROOT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <X size={56} style={{ color: "#ef4444", marginBottom: 16 }} />
          <p style={{ fontSize: 18, fontWeight: 600, color: "#374151", margin: 0 }}>Greška</p>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ ...BTN_PRIMARY, marginTop: 16 }}>
            Pokušaj ponovo
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  //  REPORT VIEW
  // ════════════════════════════════════════════════════
  if (showReport) {
    return (
      <div className="isplate-root" style={ROOT}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>

          {/* ── Print header ── */}
          <div className="print-only" style={{ display: "none" }}>
            <div style={{ marginBottom: 20, paddingBottom: 10, borderBottom: "2px solid #000" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#2563eb" }}>RAKUNAT DOO</div>
              <div style={{ fontSize: 10, lineHeight: 1.6, color: "#333" }}>
                PIB: 03145280 | PDV: 40/31-03142-2 | Ž.R.: 510-213582-76, CKB | info@rakunat.com
              </div>
            </div>
            <h1 style={{ fontSize: 16, fontWeight: 700, textAlign: "center", color: "#1e40af", marginBottom: 24 }}>
              IZVJEŠTAJ O ISPLATAMA
            </h1>
          </div>

          {/* ── Screen header ── */}
          <div className="no-print" style={{ ...CARD, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => { setShowReport(false); setDeductions([]); }} style={BTN_SECONDARY}>
                  <ArrowLeft size={15} /> Nazad
                </button>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <Banknote size={22} color="#2563eb" /> Izvještaj o isplatama
                  </h1>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
                    {eventSummaries.length} događaj{eventSummaries.length > 1 ? "a" : ""} • {fmtInt(totalTickets)} karata
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={saveDeductions} disabled={saving} style={{ ...BTN_PRIMARY, opacity: saving ? 0.6 : 1 }}>
                  <Save size={14} /> {saving ? "Snimanje..." : "Snimi"}
                </button>
                <button onClick={() => window.print()} style={BTN_SECONDARY}>
                  <Printer size={14} /> Štampaj
                </button>
                {saveMsg && (
                  <span style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: saveMsg.ok ? "#d1fae5" : "#fee2e2",
                    color: saveMsg.ok ? "#065f46" : "#991b1b",
                    display: "inline-flex", alignItems: "center",
                  }}>
                    {saveMsg.text}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Summary cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "UKUPNO PRODATO", value: `${fmt(totalRevenue)} €`, color: "#1e40af", bg: "#fff", border: "#d1d5db" },
              { label: "E-TICKETS FEE", value: `-${fmt(totalFeesAll)} €`, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
              { label: "OSNOVNI IZNOS", value: `${fmt(basePayout)} €`, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
              { label: "ODBICI", value: `-${fmt(totalDeductions)} €`, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
              { label: "ZA ISPLATU", value: `${fmt(finalPayout)} €`, color: "#fff", bg: "#059669", border: "#059669" },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: c.label === "ZA ISPLATU" ? "rgba(255,255,255,0.85)" : "#6b7280", letterSpacing: "0.5px" }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* ── Events table ── */}
          <div style={{ ...CARD, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>Detaljan pregled po događajima</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Događaj", "Karata", "Online", "Biletarnica", "Virman", "Kartica", "Prodato", "Fee", "Za isplatu"].map((h, i) => (
                      <th key={h} style={{ ...TH, textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventSummaries.map(ev => (
                    <tr key={ev.eventName} style={{ transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ ...TD, fontWeight: 600, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.eventName}</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 600 }}>{fmtInt(ev.ticketCount)}</td>
                      <td style={{ ...TD, textAlign: "right" }}>{ev.online}</td>
                      <td style={{ ...TD, textAlign: "right" }}>{ev.biletarnica}</td>
                      <td style={{ ...TD, textAlign: "right" }}>{ev.virman}</td>
                      <td style={{ ...TD, textAlign: "right" }}>{ev.kartica}</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 500 }}>{fmt(ev.totalRevenue)} €</td>
                      <td style={{ ...TD, textAlign: "right", color: "#dc2626" }}>-{fmt(ev.totalFees)} €</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 700, color: "#059669" }}>{fmt(ev.payout)} €</td>
                    </tr>
                  ))}
                  {eventSummaries.length > 1 && (
                    <tr style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1" }}>
                      <td style={{ ...TD, fontWeight: 700, borderBottom: "none" }}>UKUPNO</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{fmtInt(totalTickets)}</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 600, borderBottom: "none" }}>{eventSummaries.reduce((s, e) => s + e.online, 0)}</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 600, borderBottom: "none" }}>{eventSummaries.reduce((s, e) => s + e.biletarnica, 0)}</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 600, borderBottom: "none" }}>{eventSummaries.reduce((s, e) => s + e.virman, 0)}</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 600, borderBottom: "none" }}>{eventSummaries.reduce((s, e) => s + e.kartica, 0)}</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{fmt(totalRevenue)} €</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 700, color: "#dc2626", borderBottom: "none" }}>-{fmt(totalFeesAll)} €</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 700, color: "#059669", borderBottom: "none" }}>{fmt(basePayout)} €</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Deductions ── */}
          <div className="no-print" style={{ ...CARD, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>Dodatni odbici</h3>
              <button onClick={() => setDeductions([...deductions, { name: "", amount: 0 }])} style={BTN_SECONDARY}>
                <Plus size={14} /> Dodaj stavku
              </button>
            </div>
            {deductions.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, textAlign: "center", padding: 20 }}>Nema dodatnih odbika</p>
            ) : (
              deductions.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
                  <input type="text" placeholder="Naziv troška" value={d.name}
                    onChange={e => { const u = [...deductions]; u[i] = { ...u[i], name: e.target.value }; setDeductions(u); }}
                    style={{ ...INPUT, flex: 1 }} />
                  <input type="number" placeholder="Iznos (€)" value={d.amount || ""} step="0.01"
                    onChange={e => { const u = [...deductions]; u[i] = { ...u[i], amount: Number(e.target.value) || 0 }; setDeductions(u); }}
                    style={{ ...INPUT, width: 140, textAlign: "right" }} />
                  <button onClick={() => setDeductions(deductions.filter((_, idx) => idx !== i))}
                    style={{ ...BTN_SECONDARY, padding: "9px 10px", border: "1px solid #fecaca", color: "#dc2626" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
            {deductions.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#d97706" }}>Ukupno odbici: {fmt(totalDeductions)} €</span>
              </div>
            )}
          </div>

          {/* ── Print deductions ── */}
          {deductions.filter(d => d.name || d.amount).length > 0 && (
            <div className="print-only" style={{ display: "none", marginBottom: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, borderBottom: "1px solid #64748b", paddingBottom: 4, color: "#1e40af", marginBottom: 8 }}>DODATNI ODBICI</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={{ ...TH, textAlign: "left" }}>Opis troška</th>
                  <th style={{ ...TH, textAlign: "right", width: "30%" }}>Iznos</th>
                </tr></thead>
                <tbody>
                  {deductions.filter(d => d.name || d.amount).map((d, i) => (
                    <tr key={i}>
                      <td style={{ ...TD, fontSize: 11 }}>{d.name || "Nepoznat trošak"}</td>
                      <td style={{ ...TD, fontSize: 11, textAlign: "right", color: "#dc2626" }}>{fmt(d.amount)} €</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", borderTop: "1px solid #000" }}>
                    <td style={{ ...TD, fontWeight: 700, fontSize: 11 }}>UKUPNO:</td>
                    <td style={{ ...TD, fontWeight: 700, fontSize: 11, textAlign: "right", color: "#dc2626" }}>{fmt(totalDeductions)} €</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ── Print final ── */}
          <div className="print-only" style={{ display: "none", marginTop: 30 }}>
            <table style={{ width: "60%", marginLeft: "auto" }}>
              <tbody>
                <tr><td style={{ padding: 6, fontSize: 11 }}>Osnovni iznos za isplatu:</td>
                  <td style={{ padding: 6, fontSize: 11, textAlign: "right" }}>{fmt(basePayout)} €</td></tr>
                <tr><td style={{ padding: 6, fontSize: 11 }}>Minus dodatni odbici:</td>
                  <td style={{ padding: 6, fontSize: 11, textAlign: "right", color: "#dc2626" }}>-{fmt(totalDeductions)} €</td></tr>
                <tr style={{ borderTop: "2px solid black" }}>
                  <td style={{ padding: "12px 6px", fontSize: 13, fontWeight: 700 }}>FINALNI IZNOS ZA ISPLATU:</td>
                  <td style={{ padding: "12px 6px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#059669" }}>{fmt(finalPayout)} €</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: 50 }}>
              <p style={{ fontSize: 11 }}>Datum: {new Date().toLocaleDateString("sr-RS", { year: "numeric", month: "long", day: "numeric" })}</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 60 }}>
                <div style={{ width: "35%", textAlign: "center", paddingTop: 40, borderTop: "1px solid #999" }}><p style={{ fontSize: 11 }}>Organizator događaja</p></div>
                <div style={{ width: "35%", textAlign: "center", paddingTop: 40, borderTop: "1px solid #999" }}><p style={{ fontSize: 11 }}>Ovlašćeno lice</p></div>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          .isplate-root{--foreground:222 47% 11%;--background:220 20% 97%;--input:220 13% 91%;--muted-foreground:220 9% 46%;--card:0 0% 100%;--card-foreground:222 47% 11%;--border:220 13% 87%;--popover:0 0% 100%;--popover-foreground:222 47% 11%}
          .isplate-root,.isplate-root *,.isplate-root input,.isplate-root select,.isplate-root textarea,.isplate-root button{color-scheme:light!important}
          .isplate-root input,.isplate-root select,.isplate-root textarea{color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;background-color:#fff!important}
          .isplate-root input::placeholder{color:#9ca3af!important;-webkit-text-fill-color:#9ca3af!important}
          @keyframes spin{to{transform:rotate(360deg)}}
          @media print{
            @page{size:A4 portrait;margin:12mm 15mm}
            *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
            .no-print{display:none!important}
            .print-only{display:block!important}
            body{background:#fff!important;font-size:10pt!important}
          }
        `}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  //  EVENT SELECTION VIEW
  // ════════════════════════════════════════════════════
  return (
    <div className="isplate-root" style={ROOT}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── Header ── */}
        <div style={{ ...CARD, padding: "20px 24px", marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
            <Banknote size={22} color="#2563eb" /> Kalkulator Isplata
          </h1>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 16px" }}>
            Izaberite događaje za obračun isplata • {availableEvents.length} događaja ukupno
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Dropdown */}
            <div id="isplate-dd" style={{ position: "relative", flex: 1, minWidth: 280 }}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{
                ...BTN_SECONDARY, width: "100%", justifyContent: "space-between",
                background: selectedEvents.length ? "#eff6ff" : "#fff",
                borderColor: selectedEvents.length ? "#93c5fd" : "#d1d5db",
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedEvents.length === 0 ? "Izaberi događaje..." : `${selectedEvents.length} događaj${selectedEvents.length > 1 ? "a" : ""} izabrano`}
                </span>
                <ChevronDown size={16} style={{ transform: dropdownOpen ? "rotate(180deg)" : "", transition: "0.2s", flexShrink: 0 }} />
              </button>

              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
                  background: "#fff", border: "1px solid #d1d5db", borderRadius: 10,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 400, overflow: "hidden",
                  display: "flex", flexDirection: "column",
                }}>
                  {/* Search */}
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ position: "relative" }}>
                      <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                      <input type="text" placeholder="Pretraži..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ ...INPUT, width: "100%", paddingLeft: 32 }} />
                    </div>
                  </div>
                  {/* Select all / deselect */}
                  <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                    <button onClick={() => setSelectedEvents(filteredEvents.map(e => e.name))}
                      style={{ ...BTN_SECONDARY, padding: "5px 10px", fontSize: 11 }}>Sve</button>
                    <button onClick={() => setSelectedEvents([])}
                      style={{ ...BTN_SECONDARY, padding: "5px 10px", fontSize: 11 }}>Ništa</button>
                  </div>
                  {/* Event list */}
                  <div style={{ overflowY: "auto", maxHeight: 280 }}>
                    {filteredEvents.map(ev => {
                      const sel = selectedEvents.includes(ev.name);
                      return (
                        <div key={ev.name} onClick={() => toggleEvent(ev.name)} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 14px", cursor: "pointer", fontSize: 13,
                          background: sel ? "#eff6ff" : "transparent",
                          borderBottom: "1px solid #f8fafc",
                        }}
                          onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "#f8fafc"; }}
                          onMouseLeave={e => { if (!sel) e.currentTarget.style.background = ""; }}>
                          <input type="checkbox" checked={sel} readOnly style={{ accentColor: "#2563eb", cursor: "pointer" }} />
                          <span style={{ flex: 1, fontWeight: sel ? 600 : 400, color: "#1f2937" }}>{ev.name}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: ev.count > 0 ? "#059669" : "#9ca3af",
                            background: ev.count > 0 ? "#f0fdf4" : "#f3f4f6",
                            padding: "2px 8px", borderRadius: 10,
                          }}>
                            {fmtInt(ev.count)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button onClick={loadTicketsForEvents} disabled={!selectedEvents.length} style={{
              ...BTN_SUCCESS, opacity: selectedEvents.length ? 1 : 0.5, cursor: selectedEvents.length ? "pointer" : "default",
            }}>
              Generiši izvještaj
            </button>
          </div>
        </div>

        {/* ── Selected events preview ── */}
        {selectedEvents.length > 0 && (
          <div style={{ ...CARD, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
              Izabrani događaji ({selectedEvents.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {selectedEvents.map(name => (
                <span key={name} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 10px", background: "#eff6ff", border: "1px solid #bfdbfe",
                  borderRadius: 6, fontSize: 12, color: "#1e40af", fontWeight: 500,
                }}>
                  {name}
                  <X size={12} style={{ cursor: "pointer", color: "#6b7280" }}
                    onClick={() => setSelectedEvents(p => p.filter(e => e !== name))} />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}
.isplate-root{--foreground:222 47% 11%;--background:220 20% 97%;--input:220 13% 91%;--muted-foreground:220 9% 46%;--card:0 0% 100%;--card-foreground:222 47% 11%;--border:220 13% 87%;--popover:0 0% 100%;--popover-foreground:222 47% 11%}
.isplate-root,.isplate-root *,.isplate-root input,.isplate-root select,.isplate-root textarea,.isplate-root button{color-scheme:light!important}
.isplate-root input,.isplate-root select,.isplate-root textarea{color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;background-color:#fff!important}
.isplate-root input::placeholder{color:#9ca3af!important;-webkit-text-fill-color:#9ca3af!important}
`}</style>
    </div>
  );
}
