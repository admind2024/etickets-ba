import { useState, useEffect, useMemo } from "react";
import { ShoppingBag, ChevronDown, Search, Loader2, ArrowLeft, X, Eye, EyeOff } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hvpytasddzeprgqkwlbu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cHl0YXNkZHplcHJncWt3bGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDMyODQsImV4cCI6MjA4MjE3OTI4NH0.R1wPgBpyO7MHs0YL_pW0XBKkX8QweJ8MuhHUpuDSuKk",
);

function normalizeSalesChannel(channel) {
  if (!channel) return "Online";
  const ch = channel.trim().toLowerCase();
  if (ch.includes("gotovina") || ch.includes("biletarnica")) return "Biletarnica";
  if (ch.includes("virman") || ch.includes("bank") || ch.includes("transfer")) return "Virman";
  if (ch.includes("kartica")) return "Online-Kartica";
  if (ch.includes("rezervacija")) return "Rezervacija";
  return "Online";
}

function fmt(num) {
  return Math.round(num).toLocaleString("hr-HR");
}

function formatDate(d) {
  if (!d) return "N/A";
  try {
    const p = d.split("-");
    return p.length === 3 ? `${p[2]}.${p[1]}.${p[0].slice(-2)}.` : d;
  } catch {
    return d;
  }
}

function parseD(d) {
  return new Date(d);
}

function ec() {
  return { count: 0, amount: 0 };
}

const CHANNELS = ["online", "biletarnica", "virman", "kartica", "rezervacija"] as const;
type ChannelKey = typeof CHANNELS[number];

interface ChannelBucket {
  count: number;
  amount: number;
}

interface VisibilityBucket {
  total: number;
  amount: number;
  online: ChannelBucket;
  biletarnica: ChannelBucket;
  virman: ChannelBucket;
  kartica: ChannelBucket;
  rezervacija: ChannelBucket;
  [key: string]: number | ChannelBucket;
}

interface DailyStat {
  date: string;
  eventName: string;
  currency: string;
  visible: VisibilityBucket;
  hidden: VisibilityBucket;
}

interface AvailableEvent {
  name: string;
  count: number;
}

interface TicketRow {
  id: string;
  eventName: string;
  eventId: string;
  salesChannel: string;
  price: string;
  Purchasedate: string;
  Valuta: string;
  Hide: boolean;
  status: string;
  category: string;
  city: string;
  country: string;
}
const CH_LABELS = {
  online: "Online",
  biletarnica: "Biletarnica",
  virman: "Virman",
  kartica: "Kartica",
  rezervacija: "Rezervacija",
};
const CH_HEAD_BG = {
  online: "#059669",
  biletarnica: "#db2777",
  virman: "#0284c7",
  kartica: "#d97706",
  rezervacija: "#7c3aed",
};
const CH_CELL_BG = {
  online: "#f0fdf4",
  biletarnica: "#fdf2f8",
  virman: "#f0f9ff",
  kartica: "#fffbeb",
  rezervacija: "#f5f3ff",
};

const channelMap = {
  Biletarnica: "biletarnica",
  Virman: "virman",
  "Online-Kartica": "kartica",
  Rezervacija: "rezervacija",
  Online: "online",
};

// ═══════════════════════════════════════════════════════════════════
// FORCE LIGHT MODE — sve boje su crne/tamne na svijetloj pozadini
// Dark mode NE MOŽE uticati na ovu komponentu
// ═══════════════════════════════════════════════════════════════════
const ROOT_STYLE = {
  minHeight: "100vh",
  background: "#f8f9fb",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  colorScheme: "light",
  color: "#1f2937",
};

export default function Pazar() {
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Učitavanje liste događaja...");
  const [error, setError] = useState(null);
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [ticketsData, setTicketsData] = useState<Record<string, TicketRow[]>>({});
  const [showDashboard, setShowDashboard] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      const dd = document.getElementById("evt-dd");
      if (dd && !dd.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  async function loadEvents() {
    try {
      setLoading(true);
      const { data: ae, error: e1 } = await supabase.from("AboutEvents").select("name").eq("status", "active");
      if (e1) throw e1;
      const names = (ae || []).map((e) => e.name).filter(Boolean);
      if (!names.length) {
        setAvailableEvents([]);
        setLoading(false);
        return;
      }
      const { data, error: e2 } = await supabase
        .from("QRKarte")
        .select("eventName")
        .in("eventName", names)
        .not("eventName", "is", null);
      if (e2) throw e2;
      const cm = {};
      data?.forEach((t) => {
        if (t.eventName) cm[t.eventName] = (cm[t.eventName] || 0) + 1;
      });
      names.forEach((n) => {
        if (!cm[n]) cm[n] = 0;
      });
      setAvailableEvents(
        Object.entries(cm)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function loadTicketsForEvents() {
    if (!selectedEvents.length) return;
    try {
      setLoading(true);
      setShowDashboard(false);
      const all = {};
      let p = 0;
      for (const en of selectedEvents) {
        p++;
        setLoadingMessage(`Učitavanje ${p}/${selectedEvents.length}: ${en}`);
        let tickets = [],
          from = 0;
        while (true) {
          const { data, error: fe } = await supabase
            .from("QRKarte")
            .select(
              "id, eventName, eventId, salesChannel, price, Purchasedate, Valuta, Hide, status, category, city, country",
            )
            .eq("eventName", en)
            .range(from, from + 999);
          if (fe) throw fe;
          if (data) tickets = tickets.concat(data);
          if (!data || data.length < 1000) break;
          from += 1000;
        }
        all[en] = tickets;
      }
      setTicketsData(all);
      setShowDashboard(true);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const dailyStats = useMemo(() => {
    const stats = {};
    Object.entries(ticketsData).forEach(([eventName, tickets]) => {
      tickets.forEach((ticket) => {
        const date = ticket.Purchasedate || "N/A";
        const key = `${date}_${eventName}`;
        const price = parseFloat(ticket.price) || 0;
        const ch = channelMap[normalizeSalesChannel(ticket.salesChannel)] || "online";
        const hidden = ticket.Hide === true;

        if (!stats[key]) {
          stats[key] = {
            date,
            eventName,
            currency: ticket.Valuta || "EUR",
            visible: {
              total: 0,
              amount: 0,
              online: ec(),
              biletarnica: ec(),
              virman: ec(),
              kartica: ec(),
              rezervacija: ec(),
            },
            hidden: {
              total: 0,
              amount: 0,
              online: ec(),
              biletarnica: ec(),
              virman: ec(),
              kartica: ec(),
              rezervacija: ec(),
            },
          };
        }

        const bucket = hidden ? stats[key].hidden : stats[key].visible;
        bucket.total++;
        bucket.amount += price;
        bucket[ch].count++;
        bucket[ch].amount += price;
      });
    });

    return (Object.values(stats) as DailyStat[]).sort((a, b) => {
      const dc = parseD(b.date).getTime() - parseD(a.date).getTime();
      return dc !== 0 ? dc : a.eventName.localeCompare(b.eventName);
    });
  }, [ticketsData]);

  const groupedByDate = useMemo(() => {
    const g = {};
    dailyStats.forEach((s) => {
      if (!g[s.date]) g[s.date] = [];
      g[s.date].push(s);
    });
    return g;
  }, [dailyStats]);

  const grand = useMemo(() => {
    const r = {
      visible: { total: 0, amount: 0, online: ec(), biletarnica: ec(), virman: ec(), kartica: ec(), rezervacija: ec() },
      hidden: { total: 0, amount: 0, online: ec(), biletarnica: ec(), virman: ec(), kartica: ec(), rezervacija: ec() },
    };
    dailyStats.forEach((s) => {
      ["visible", "hidden"].forEach((type) => {
        r[type].total += s[type].total;
        r[type].amount += s[type].amount;
        CHANNELS.forEach((ch) => {
          r[type][ch].count += s[type][ch].count;
          r[type][ch].amount += s[type][ch].amount;
        });
      });
    });
    return r;
  }, [dailyStats]);

  const filteredEvents = availableEvents.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const toggleEvent = (n) => setSelectedEvents((p) => (p.includes(n) ? p.filter((e) => e !== n) : [...p, n]));
  const selectAll = () => setSelectedEvents(filteredEvents.map((e) => e.name));
  const deselectAll = () => setSelectedEvents([]);
  const currency = dailyStats.length > 0 ? dailyStats[0].currency : "EUR";

  // ---- Styles — SVE TAMNE BOJE, NEMA BIJELIH ----
  const thBase: React.CSSProperties = {
    padding: "10px 10px",
    textAlign: "center" as const,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    color: "#1f2937",
    whiteSpace: "nowrap" as const,
    borderBottom: "2px solid #d1d5db",
    background: "#e5e7eb",
  };
  const td = { padding: "7px 10px", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#1f2937" };

  function ChCell({ bucket, ch, cur, isHidden }) {
    const bg = isHidden ? "#fef2f2" : CH_CELL_BG[ch];
    const clr = isHidden ? "#b91c1c" : "#1f2937";
    return (
      <td style={{ ...td, textAlign: "center", background: bg }}>
        <strong style={{ color: clr }}>{bucket[ch].count}</strong>
        {bucket[ch].amount > 0 && (
          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>
            {fmt(bucket[ch].amount)} {cur}
          </div>
        )}
      </td>
    );
  }

  function Badge({ hidden }) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          fontSize: 9,
          fontWeight: 700,
          textTransform: "uppercase",
          padding: "2px 7px",
          borderRadius: 5,
          background: hidden ? "#fef2f2" : "#f0fdf4",
          color: hidden ? "#dc2626" : "#059669",
          border: `1px solid ${hidden ? "#fecaca" : "#bbf7d0"}`,
          whiteSpace: "nowrap",
        }}
      >
        {hidden ? <EyeOff size={9} /> : <Eye size={9} />}
        {hidden ? "Skrivene" : "Vidljive"}
      </span>
    );
  }

  // ---- LOADING ----
  if (loading) {
    return (
      <div style={{ ...ROOT_STYLE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={40} style={{ animation: "spin 1s linear infinite", color: "#3b82f6", marginBottom: 16 }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#374151", margin: 0 }}>Učitavanje...</p>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...ROOT_STYLE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <X size={56} style={{ color: "#ef4444", marginBottom: 16 }} />
          <p style={{ fontSize: 18, fontWeight: 600, color: "#374151", margin: 0 }}>Greška</p>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "10px 24px",
              background: "#3b82f6",
              color: "#1f2937",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Pokušaj ponovo
          </button>
        </div>
      </div>
    );
  }

  // ==================== DASHBOARD ====================
  if (showDashboard) {
    const sortedDates = Object.entries(groupedByDate).sort(([a], [b]) => parseD(b).getTime() - parseD(a).getTime());
    const allTotal = grand.visible.total + grand.hidden.total;
    const allAmount = grand.visible.amount + grand.hidden.amount;

    return (
      <div style={ROOT_STYLE}>
        <div style={{ maxWidth: 1700, margin: "0 auto", padding: "24px 16px" }}>
          {/* Header */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 20,
            }}
          >
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: 0,
              }}
            >
              <ShoppingBag size={22} color="#3b82f6" />
              Pazar Dashboard — Dnevni Izvještaj
            </h1>
            <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4, marginBottom: 0 }}>
              {selectedEvents.length} događaj{selectedEvents.length > 1 ? "a" : ""} • Vidljive + Skrivene karte sa punim
              pregledom po kanalima
            </p>
          </div>

          {/* Summary cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 10, padding: "16px 20px" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#6b7280",
                  letterSpacing: "0.5px",
                }}
              >
                SVE KARTE
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#1e40af", marginTop: 2 }}>{fmt(allTotal)}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {fmt(allAmount)} {currency}
              </div>
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "16px 20px" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#059669",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Eye size={11} /> VIDLJIVE
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#059669", marginTop: 2 }}>
                {fmt(grand.visible.total)}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {fmt(grand.visible.amount)} {currency}
              </div>
            </div>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "16px 20px" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#dc2626",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <EyeOff size={11} /> SKRIVENE
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
                {fmt(grand.hidden.total)}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {fmt(grand.hidden.amount)} {currency}
              </div>
            </div>
            <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 10, padding: "16px 20px" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#6b7280",
                  letterSpacing: "0.5px",
                }}
              >
                DANA SA PRODAJOM
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#7c3aed", marginTop: 2 }}>{sortedDates.length}</div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowDashboard(false);
              setSearchQuery("");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              background: "#ffffff",
              border: "2px solid #3b82f6",
              color: "#3b82f6",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            <ArrowLeft size={15} /> Nazad na izbor
          </button>

          {/* TABLE */}
          <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  color: "#1f2937",
                  background: "#ffffff",
                }}
              >
                <thead>
                  <tr style={{ background: "#e5e7eb" }}>
                    <th style={{ ...thBase, textAlign: "left", minWidth: 75 }}>Datum</th>
                    <th style={{ ...thBase, textAlign: "left", minWidth: 120 }}>Događaj</th>
                    <th style={{ ...thBase, minWidth: 65 }}>Tip</th>
                    <th style={{ ...thBase }}>Ukupno</th>
                    {CHANNELS.map((ch) => (
                      <th
                        key={ch}
                        style={{ ...thBase, color: CH_HEAD_BG[ch], borderBottom: `3px solid ${CH_HEAD_BG[ch]}` }}
                      >
                        {CH_LABELS[ch]}
                      </th>
                    ))}
                    <th style={{ ...thBase, textAlign: "right", color: "#15803d", borderBottom: "3px solid #15803d" }}>
                      Iznos
                    </th>
                  </tr>
                </thead>

                {sortedDates.map(([date, stats]) => {
                  const typedStats = stats as DailyStat[];
                  const dayVis = { total: 0, amount: 0 };
                  const dayHid = { total: 0, amount: 0 };
                  const dayVisCh: Record<string, ChannelBucket> = {};
                  const dayHidCh: Record<string, ChannelBucket> = {};
                  CHANNELS.forEach((ch) => {
                    dayVisCh[ch] = ec();
                    dayHidCh[ch] = ec();
                  });
                  typedStats.forEach((s) => {
                    dayVis.total += s.visible.total;
                    dayVis.amount += s.visible.amount;
                    dayHid.total += s.hidden.total;
                    dayHid.amount += s.hidden.amount;
                    CHANNELS.forEach((ch) => {
                      dayVisCh[ch].count += (s.visible[ch] as ChannelBucket).count;
                      dayVisCh[ch].amount += (s.visible[ch] as ChannelBucket).amount;
                      dayHidCh[ch].count += (s.hidden[ch] as ChannelBucket).count;
                      dayHidCh[ch].amount += (s.hidden[ch] as ChannelBucket).amount;
                    });
                  });

                  return (
                    <tbody key={date}>
                      {typedStats.map((stat) => {
                        const rows: React.ReactNode[] = [];
                        // Vidljive
                        rows.push(
                          <tr key={`${date}-${stat.eventName}-v`} style={{ background: "#ffffff" }}>
                            <td style={{ ...td, fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>
                              {formatDate(stat.date)}
                            </td>
                            <td
                              style={{
                                ...td,
                                fontWeight: 600,
                                color: "#2563eb",
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {stat.eventName}
                            </td>
                            <td style={{ ...td, textAlign: "center" }}>
                              <Badge hidden={false} />
                            </td>
                            <td style={{ ...td, textAlign: "center", fontWeight: 700, color: "#111827" }}>
                              {stat.visible.total}
                            </td>
                            {CHANNELS.map((ch) => (
                              <ChCell key={ch} bucket={stat.visible} ch={ch} cur={stat.currency} isHidden={false} />
                            ))}
                            <td
                              style={{
                                ...td,
                                textAlign: "right",
                                fontWeight: 700,
                                background: "#f0fdf4",
                                color: "#15803d",
                              }}
                            >
                              {fmt(stat.visible.amount)} {stat.currency}
                            </td>
                          </tr>,
                        );
                        // Skrivene
                        rows.push(
                          <tr key={`${date}-${stat.eventName}-h`} style={{ background: "#fef2f2" }}>
                            <td style={{ ...td, fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>
                              {formatDate(stat.date)}
                            </td>
                            <td
                              style={{
                                ...td,
                                fontWeight: 600,
                                color: "#b91c1c",
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {stat.eventName}
                            </td>
                            <td style={{ ...td, textAlign: "center" }}>
                              <Badge hidden={true} />
                            </td>
                            <td style={{ ...td, textAlign: "center", fontWeight: 700, color: "#dc2626" }}>
                              {stat.hidden.total}
                            </td>
                            {CHANNELS.map((ch) => (
                              <ChCell key={ch} bucket={stat.hidden} ch={ch} cur={stat.currency} isHidden={true} />
                            ))}
                            <td
                              style={{
                                ...td,
                                textAlign: "right",
                                fontWeight: 700,
                                background: "#fef2f2",
                                color: "#dc2626",
                              }}
                            >
                              {fmt(stat.hidden.amount)} {stat.currency}
                            </td>
                          </tr>,
                        );
                        return rows;
                      })}

                      {/* Day subtotals - Vidljive */}
                      <tr style={{ background: "#ecfdf5", borderTop: "2px solid #86efac" }}>
                        <td style={{ ...td, fontWeight: 700, fontSize: 11, color: "#065f46" }} colSpan={2}>
                          {formatDate(date)} — ZBIR
                        </td>
                        <td style={{ ...td, textAlign: "center" }}>
                          <Badge hidden={false} />
                        </td>
                        <td style={{ ...td, textAlign: "center", fontWeight: 700, color: "#059669" }}>
                          {dayVis.total}
                        </td>
                        {CHANNELS.map((ch) => (
                          <td key={ch} style={{ ...td, textAlign: "center" }}>
                            <strong style={{ color: "#059669" }}>{dayVisCh[ch].count}</strong>
                            {dayVisCh[ch].amount > 0 && (
                              <div style={{ fontSize: 10, color: "#6b7280" }}>
                                {fmt(dayVisCh[ch].amount)} {currency}
                              </div>
                            )}
                          </td>
                        ))}
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#059669" }}>
                          {fmt(dayVis.amount)} {currency}
                        </td>
                      </tr>
                      {/* Day subtotals - Skrivene */}
                      <tr style={{ background: "#fef2f2" }}>
                        <td style={{ ...td, fontWeight: 700, fontSize: 11, color: "#7f1d1d" }} colSpan={2}>
                          {formatDate(date)} — ZBIR
                        </td>
                        <td style={{ ...td, textAlign: "center" }}>
                          <Badge hidden={true} />
                        </td>
                        <td style={{ ...td, textAlign: "center", fontWeight: 700, color: "#dc2626" }}>
                          {dayHid.total}
                        </td>
                        {CHANNELS.map((ch) => (
                          <td key={ch} style={{ ...td, textAlign: "center" }}>
                            <strong style={{ color: "#dc2626" }}>{dayHidCh[ch].count}</strong>
                            {dayHidCh[ch].amount > 0 && (
                              <div style={{ fontSize: 10, color: "#9ca3af" }}>
                                {fmt(dayHidCh[ch].amount)} {currency}
                              </div>
                            )}
                          </td>
                        ))}
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                          {fmt(dayHid.amount)} {currency}
                        </td>
                      </tr>
                      {/* Day combined */}
                      <tr style={{ background: "#e0e7ff", borderBottom: "3px solid #6366f1" }}>
                        <td style={{ ...td, fontWeight: 800, fontSize: 11, color: "#312e81" }} colSpan={3}>
                          {formatDate(date)} — ZBIRNO
                        </td>
                        <td style={{ ...td, textAlign: "center", fontWeight: 800, fontSize: 13, color: "#312e81" }}>
                          {dayVis.total + dayHid.total}
                        </td>
                        {CHANNELS.map((ch) => {
                          const c = dayVisCh[ch].count + dayHidCh[ch].count;
                          const a = dayVisCh[ch].amount + dayHidCh[ch].amount;
                          return (
                            <td key={ch} style={{ ...td, textAlign: "center" }}>
                              <strong style={{ color: "#312e81" }}>{c}</strong>
                              {a > 0 && (
                                <div style={{ fontSize: 10, color: "#6b7280" }}>
                                  {fmt(a)} {currency}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ ...td, textAlign: "right", fontWeight: 800, fontSize: 13, color: "#312e81" }}>
                          {fmt(dayVis.amount + dayHid.amount)} {currency}
                        </td>
                      </tr>
                    </tbody>
                  );
                })}

                {/* ===== GRAND TOTALS ===== */}
                <tbody>
                  {/* Grand visible */}
                  <tr style={{ background: "#ecfdf5", borderTop: "3px solid #059669" }}>
                    <td style={{ padding: "12px 10px", fontWeight: 700, color: "#065f46" }} colSpan={2}>
                      UKUPNO VIDLJIVE
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "center", color: "#059669" }}>
                      <Eye size={12} style={{ verticalAlign: "middle" }} />
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        textAlign: "center",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#059669",
                      }}
                    >
                      {fmt(grand.visible.total)}
                    </td>
                    {CHANNELS.map((ch) => (
                      <td key={ch} style={{ padding: "12px 10px", textAlign: "center" }}>
                        <div style={{ fontWeight: 700, color: "#059669" }}>{fmt(grand.visible[ch].count)}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>
                          {fmt(grand.visible[ch].amount)} {currency}
                        </div>
                      </td>
                    ))}
                    <td
                      style={{
                        padding: "12px 10px",
                        textAlign: "right",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#059669",
                      }}
                    >
                      {fmt(grand.visible.amount)} {currency}
                    </td>
                  </tr>
                  {/* Grand hidden */}
                  <tr style={{ background: "#fef2f2", borderTop: "3px solid #dc2626" }}>
                    <td style={{ padding: "12px 10px", fontWeight: 700, color: "#7f1d1d" }} colSpan={2}>
                      UKUPNO SKRIVENE
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "center", color: "#dc2626" }}>
                      <EyeOff size={12} style={{ verticalAlign: "middle" }} />
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        textAlign: "center",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#dc2626",
                      }}
                    >
                      {fmt(grand.hidden.total)}
                    </td>
                    {CHANNELS.map((ch) => (
                      <td key={ch} style={{ padding: "12px 10px", textAlign: "center" }}>
                        <div style={{ fontWeight: 700, color: "#dc2626" }}>{fmt(grand.hidden[ch].count)}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>
                          {fmt(grand.hidden[ch].amount)} {currency}
                        </div>
                      </td>
                    ))}
                    <td
                      style={{
                        padding: "12px 10px",
                        textAlign: "right",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#dc2626",
                      }}
                    >
                      {fmt(grand.hidden.amount)} {currency}
                    </td>
                  </tr>
                  {/* Grand combined */}
                  <tr style={{ background: "#dbeafe", borderTop: "3px solid #1e40af" }}>
                    <td style={{ padding: "14px 10px", fontSize: 14, fontWeight: 800, color: "#1e3a8a" }} colSpan={3}>
                      ZBIRNI PAZAR
                    </td>
                    <td
                      style={{
                        padding: "14px 10px",
                        textAlign: "center",
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#1e3a8a",
                      }}
                    >
                      {fmt(allTotal)}
                    </td>
                    {CHANNELS.map((ch) => (
                      <td key={ch} style={{ padding: "14px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#1e3a8a" }}>
                          {fmt(grand.visible[ch].count + grand.hidden[ch].count)}
                        </div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>
                          {fmt(grand.visible[ch].amount + grand.hidden[ch].amount)} {currency}
                        </div>
                      </td>
                    ))}
                    <td
                      style={{
                        padding: "14px 10px",
                        textAlign: "right",
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#1e3a8a",
                      }}
                    >
                      {fmt(allAmount)} {currency}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== EVENT SELECTOR ====================
  return (
    <div style={ROOT_STYLE}>
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 20px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #d1d5db",
            borderRadius: 12,
            padding: "24px 28px",
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: 0,
            }}
          >
            <ShoppingBag size={24} color="#3b82f6" />
            Pazar Dashboard — Dnevni Izvještaj
          </h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 6, marginBottom: 0 }}>
            Prikaz dnevne prodaje karata po datumima i događajima
          </p>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 12, padding: "24px 28px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0, marginBottom: 16 }}>
            Izaberite događaje za prikaz
          </h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0, marginBottom: 14 }}>
            Dostupno događaja: <strong style={{ color: "#111827" }}>{availableEvents.length}</strong>
          </p>

          <div id="evt-dd" style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: "100%",
                border: "2px solid",
                borderColor: dropdownOpen ? "#3b82f6" : "#d1d5db",
                borderRadius: 10,
                padding: "12px 16px",
                background: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                fontSize: 14,
                color: "#1f2937",
              }}
            >
              <span style={{ color: selectedEvents.length === 0 ? "#9ca3af" : "#111827" }}>
                {selectedEvents.length === 0
                  ? "Kliknite za izbor događaja..."
                  : selectedEvents.length === 1
                    ? selectedEvents[0]
                    : `Izabrano ${selectedEvents.length} događaja`}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {selectedEvents.length > 0 && (
                  <span
                    style={{
                      background: "#3b82f6",
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 10,
                    }}
                  >
                    {selectedEvents.length}
                  </span>
                )}
                <ChevronDown
                  size={18}
                  style={{
                    color: "#6b7280",
                    transition: "transform 0.2s",
                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)",
                  }}
                />
              </div>
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  right: 0,
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                  maxHeight: 420,
                  overflow: "hidden",
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    padding: 12,
                    borderBottom: "1px solid #e5e7eb",
                    position: "sticky",
                    top: 0,
                    background: "#ffffff",
                    zIndex: 1,
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <Search
                      size={16}
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#9ca3af",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Pretraži događaje..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        paddingLeft: 38,
                        paddingRight: 14,
                        paddingTop: 10,
                        paddingBottom: 10,
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                        color: "#1f2937",
                        background: "#ffffff",
                      }}
                      autoFocus
                    />
                  </div>
                </div>
                <div
                  style={{
                    padding: "8px 14px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    background: "#ffffff",
                  }}
                >
                  <button
                    onClick={selectAll}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#3b82f6",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Izaberi sve ({filteredEvents.length})
                  </button>
                  <button
                    onClick={deselectAll}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b7280",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Poništi sve
                  </button>
                  {searchQuery && (
                    <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
                      {filteredEvents.length} od {availableEvents.length}
                    </span>
                  )}
                </div>
                <div style={{ maxHeight: 320, overflowY: "auto", background: "#ffffff" }}>
                  {filteredEvents.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                      Nema rezultata za &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    filteredEvents.map((evt) => {
                      const sel = selectedEvents.includes(evt.name);
                      return (
                        <label
                          key={evt.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "10px 16px",
                            cursor: "pointer",
                            fontSize: 14,
                            color: "#374151",
                            borderBottom: "1px solid #f3f4f6",
                            background: sel ? "#eff6ff" : "#ffffff",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleEvent(evt.name)}
                            style={{
                              width: 16,
                              height: 16,
                              marginRight: 12,
                              accentColor: "#3b82f6",
                              cursor: "pointer",
                            }}
                          />
                          <span style={{ flex: 1, fontWeight: sel ? 600 : 400, color: sel ? "#1e40af" : "#374151" }}>
                            {evt.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: sel ? "#1e40af" : "#6b7280",
                              background: sel ? "#dbeafe" : "#f3f4f6",
                              padding: "2px 8px",
                              borderRadius: 10,
                              marginLeft: 8,
                            }}
                          >
                            {evt.count.toLocaleString()}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedEvents.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {selectedEvents.map((name) => (
                <span
                  key={name}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#eff6ff",
                    color: "#2563eb",
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "4px 10px",
                    borderRadius: 20,
                    border: "1px solid #bfdbfe",
                  }}
                >
                  {name}
                  <span
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", opacity: 0.6 }}
                    onClick={() => toggleEvent(name)}
                  >
                    <X size={12} />
                  </span>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={selectedEvents.length > 0 ? loadTicketsForEvents : undefined}
            style={{
              width: "100%",
              marginTop: 20,
              padding: "14px 0",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              cursor: selectedEvents.length > 0 ? "pointer" : "not-allowed",
              color: selectedEvents.length > 0 ? "#ffffff" : "#9ca3af",
              background: selectedEvents.length > 0 ? "linear-gradient(135deg, #3b82f6, #06b6d4)" : "#e5e7eb",
              boxShadow: selectedEvents.length > 0 ? "0 4px 14px rgba(59,130,246,0.3)" : "none",
            }}
          >
            {selectedEvents.length > 0
              ? `Učitaj izvještaj za ${selectedEvents.length} događaj${selectedEvents.length > 1 ? "a" : ""}`
              : "Izaberite barem jedan događaj"}
          </button>
        </div>
      </div>
    </div>
  );
}
