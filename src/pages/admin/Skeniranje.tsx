import { useState, useEffect, useCallback, CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  QrCode,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Search,
  ShoppingCart,
} from "lucide-react";

// ─── Types ───
interface EventListItem {
  eventName: string;
  eventId: string;
  eventDate: string | null;
}

interface ScanDetail {
  id: string;
  ticketId: string;
  customerName: string;
  customerEmail: string;
  seatId: string;
  category: string;
  entrance: string;
  isUsed: boolean;
  scannedAt: string | null;
  scannedBy: string | null;
  scanMethod: string | null;
  checkTime: string | null;
  salesChannel: string | null;
}

// ─── Theme ───
const th = {
  bg: "#f8f9fb",
  card: "#fff",
  border: "#e5e7eb",
  text: "#111827",
  sub: "#6b7280",
  dim: "#9ca3af",
  accent: "#4f46e5",
  accentH: "#6366f1",
  accentL: "#eef2ff",
  green: "#059669",
  greenBg: "#ecfdf5",
  orange: "#d97706",
  orangeBg: "#fffbeb",
  red: "#dc2626",
  redBg: "#fef2f2",
  r: 10,
  rs: 7,
  sh: "0 1px 3px rgba(0,0,0,.04),0 1px 2px rgba(0,0,0,.06)",
};

// ─── Styles ───
const wrap: CSSProperties = {
  padding: 24,
  fontFamily: "Inter,system-ui,sans-serif",
  color: th.text,
  minHeight: "100vh",
  background: th.bg,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 20,
  flexWrap: "wrap",
  gap: 12,
};

const titleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const cardStyle: CSSProperties = {
  background: th.card,
  border: `1px solid ${th.border}`,
  borderRadius: th.r,
  boxShadow: th.sh,
  overflow: "hidden",
};

const eventRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 18px",
  cursor: "pointer",
  transition: "background .15s",
  borderBottom: `1px solid ${th.border}`,
};

const badge = (bg: string, color: string): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  background: bg,
  color,
});

const statBox: CSSProperties = {
  flex: 1,
  minWidth: 140,
  background: th.card,
  border: `1px solid ${th.border}`,
  borderRadius: th.r,
  padding: "16px 20px",
  boxShadow: th.sh,
};

const progressBarOuter: CSSProperties = {
  width: "100%",
  height: 8,
  background: "#e5e7eb",
  borderRadius: 4,
  overflow: "hidden",
  marginTop: 8,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: th.sub,
  borderBottom: `2px solid ${th.border}`,
  background: "#fafbfc",
};

const tdStyle: CSSProperties = {
  padding: "10px 14px",
  borderBottom: `1px solid ${th.border}`,
  verticalAlign: "middle",
};

const btnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: th.rs,
  border: `1px solid ${th.border}`,
  background: th.card,
  color: th.text,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all .15s",
};

const searchInput: CSSProperties = {
  padding: "8px 12px 8px 36px",
  borderRadius: th.rs,
  border: `1px solid ${th.border}`,
  background: th.card,
  fontSize: 13,
  outline: "none",
  width: 240,
};

// ─── Component ───
const Skeniranje = () => {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedEventName, setSelectedEventName] = useState<string>("");
  const [details, setDetails] = useState<ScanDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [filterUsed, setFilterUsed] = useState<"all" | "used" | "unused">("all");

  // ─── Fetch events (only AboutEvents, no QRKarte) ───
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data: aboutEvents, error: evErr } = await supabase
        .from("AboutEvents")
        .select("name, eventId, date")
        .not("name", "is", null)
        .order("date", { ascending: false });

      if (evErr) throw evErr;

      const result: EventListItem[] = (aboutEvents || []).map((ev) => ({
        eventName: ev.name,
        eventId: ev.eventId?.trim() || "",
        eventDate: ev.date || null,
      }));

      setEvents(result);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Greška pri učitavanju:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch details for selected event (supports comma-separated eventIds) ───
  const fetchDetails = useCallback(async (eventIds: string) => {
    setLoadingDetails(true);
    try {
      let allData: any[] = [];
      const ids = eventIds.split(",").map(id => id.trim()).filter(Boolean);
      const PAGE = 1000;

      for (const eid of ids) {
        let from = 0;
        while (true) {
          const { data: batch, error } = await supabase
            .from("QRKarte")
            .select("id, ticketId, customerName, \"Customer Email\", seatId, category, entrance, isUsed, used, scannedAt, scannedBy, checkTime, salesChannel")
            .eq("eventId", eid)
            .order("scannedAt", { ascending: false, nullsFirst: false })
            .range(from, from + PAGE - 1);

          if (error) throw error;
          if (!batch || batch.length === 0) break;
          allData = allData.concat(batch);
          if (batch.length < PAGE) break;
          from += PAGE;
        }
      }

      const isValidDate = (val: string | null | undefined) => {
        if (!val) return false;
        const d = new Date(val);
        return !isNaN(d.getTime());
      };

      const mapped: ScanDetail[] = allData.map((k: any) => {
        const rawScannedAt = k.scannedAt;
        const scanTime = isValidDate(rawScannedAt) ? rawScannedAt : (k.checkTime || null);
        const scanMethod = rawScannedAt && !isValidDate(rawScannedAt) ? rawScannedAt : (isValidDate(rawScannedAt) ? "Scanner App" : null);

        return {
          id: k.id,
          ticketId: k.ticketId || "",
          customerName: k.customerName || "",
          customerEmail: k["Customer Email"] || "",
          seatId: k.seatId || "",
          category: k.category || "",
          entrance: k.entrance || "",
          isUsed: k.isUsed === "true" || k.used === "true" || !!k.checkTime,
          scannedAt: scanTime,
          scannedBy: k.scannedBy || null,
          scanMethod,
          checkTime: k.checkTime || null,
          salesChannel: k.salesChannel || null,
        };
      });
      setDetails(mapped);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Greška:", e);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // ─── Initial load (just events list) ───
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ─── Polling: only on detail view, only when tab is visible, every 60s ───
  useEffect(() => {
    if (!selectedEvent) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) return;
      interval = setInterval(() => {
        fetchDetails(selectedEvent);
      }, 60000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchDetails(selectedEvent);
        startPolling();
      }
    };

    // Start immediately
    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [selectedEvent, fetchDetails]);

  // ─── Select event ───
  const handleSelectEvent = (eventId: string, eventName: string) => {
    setSelectedEvent(eventId);
    setSelectedEventName(eventName);
    setFilterUsed("all");
    setSearch("");
    fetchDetails(eventId);
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setSelectedEventName("");
    setDetails([]);
    setSearch("");
    setFilterUsed("all");
  };

  const handleRefresh = () => {
    if (selectedEvent) {
      fetchDetails(selectedEvent);
    } else {
      fetchEvents();
    }
  };

  // ─── Compute stats from details (no separate heavy query needed) ───
  const detailStats = {
    total: details.length,
    used: details.filter(d => d.isUsed).length,
    unused: details.filter(d => !d.isUsed).length,
    lastScan: details.reduce((latest: string | null, d) => {
      if (!d.scannedAt) return latest;
      if (!latest || d.scannedAt > latest) return d.scannedAt;
      return latest;
    }, null),
  };

  // ─── Sales channel stats (computed from all details, not filtered) ───
  const channelStats = details.reduce((acc, d) => {
    const ch = d.salesChannel?.trim() || "Nepoznato";
    if (!acc[ch]) acc[ch] = { total: 0, used: 0 };
    acc[ch].total++;
    if (d.isUsed) acc[ch].used++;
    return acc;
  }, {} as Record<string, { total: number; used: number }>);

  const channelEntries = Object.entries(channelStats).sort((a, b) => b[1].total - a[1].total);

  const channelColors: Record<string, { bg: string; color: string; bar: string }> = {
    "Online":      { bg: "#eff6ff", color: "#2563eb", bar: "#3b82f6" },
    "Biletarnica": { bg: "#f0fdf4", color: "#16a34a", bar: "#22c55e" },
    "Admin":       { bg: "#fdf4ff", color: "#9333ea", bar: "#a855f7" },
    "Link":        { bg: "#fff7ed", color: "#ea580c", bar: "#f97316" },
    "Nepoznato":   { bg: "#f3f4f6", color: "#6b7280", bar: "#9ca3af" },
  };

  const getChannelStyle = (ch: string) =>
    channelColors[ch] ?? { bg: "#f3f4f6", color: "#6b7280", bar: "#9ca3af" };

  // ─── Filter & sort details (skenirane prvo) ───
  const filteredDetails = details
    .filter((d) => {
      if (filterUsed === "used" && !d.isUsed) return false;
      if (filterUsed === "unused" && d.isUsed) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        return (
          d.customerName?.toLowerCase().includes(s) ||
          d.customerEmail?.toLowerCase().includes(s) ||
          d.ticketId?.toLowerCase().includes(s) ||
          d.seatId?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Skenirane prvo
      if (a.isUsed !== b.isUsed) return a.isUsed ? -1 : 1;
      // Unutar skeniranih, najnovije prvo
      if (a.isUsed && b.isUsed) {
        const ta = a.scannedAt || "";
        const tb = b.scannedAt || "";
        return tb.localeCompare(ta);
      }
      return 0;
    });

  const formatTime = (t: string | null) => {
    if (!t) return "—";
    try {
      const d = new Date(t);
      if (isNaN(d.getTime())) return t;
      return d.toLocaleString("sr-Latn-BA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return t;
    }
  };

  // ─── Filtered events ───
  const filteredEvents = events.filter((ev) => {
    if (!eventSearch.trim()) return true;
    return ev.eventName.toLowerCase().includes(eventSearch.toLowerCase());
  });

  // ─── Events list view ───
  if (!selectedEvent) {
    return (
      <div style={wrap}>
        <div style={headerStyle}>
          <div style={titleRow}>
            <QrCode size={22} color={th.accent} />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Skeniranje</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: th.dim }}>
              Zadnje ažuriranje: {lastRefresh.toLocaleTimeString("sr-Latn-BA")}
            </span>
            <button
              style={btnStyle}
              onClick={handleRefresh}
              onMouseEnter={(e) => (e.currentTarget.style.background = th.accentL)}
              onMouseLeave={(e) => (e.currentTarget.style.background = th.card)}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Osvježi
            </button>
          </div>
        </div>

        {/* Event search */}
        <div style={{ marginBottom: 16, position: "relative" }}>
          <Search size={15} color={th.dim} style={{ position: "absolute", left: 12, top: 11 }} />
          <input
            style={{ ...searchInput, width: "100%", maxWidth: 400 }}
            placeholder="Pretraži događaj..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
          />
        </div>

        {loading && events.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: th.sub }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
            <p>Učitavanje događaja...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: th.sub }}>
            <QrCode size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p>{eventSearch ? "Nema rezultata za pretragu" : "Nema pronađenih događaja"}</p>
          </div>
        ) : (
          <div style={cardStyle}>
            {filteredEvents.map((ev, i) => (
                <div
                  key={`${ev.eventId}-${i}`}
                  style={{
                    ...eventRow,
                    borderBottom: i === filteredEvents.length - 1 ? "none" : eventRow.borderBottom,
                  }}
                  onClick={() => handleSelectEvent(ev.eventId, ev.eventName)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{ev.eventName}</div>
                    {ev.eventDate && (
                      <div style={{ fontSize: 12, color: th.dim }}>{ev.eventDate}</div>
                    )}
                  </div>
                  <ChevronRight size={18} color={th.dim} />
                </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Detail view for selected event ───
  const pct = detailStats.total > 0 ? Math.round((detailStats.used / detailStats.total) * 100) : 0;

  return (
    <div style={wrap}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={titleRow}>
          <button
            style={{ ...btnStyle, padding: "6px 10px" }}
            onClick={handleBack}
            onMouseEnter={(e) => (e.currentTarget.style.background = th.accentL)}
            onMouseLeave={(e) => (e.currentTarget.style.background = th.card)}
          >
            <ArrowLeft size={16} />
          </button>
          <QrCode size={20} color={th.accent} />
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedEventName || selectedEvent}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: th.dim }}>
            Auto-refresh: 60s | {lastRefresh.toLocaleTimeString("sr-Latn-BA")}
          </span>
          <button
            style={btnStyle}
            onClick={handleRefresh}
            onMouseEnter={(e) => (e.currentTarget.style.background = th.accentL)}
            onMouseLeave={(e) => (e.currentTarget.style.background = th.card)}
          >
            <RefreshCw size={14} className={loadingDetails ? "animate-spin" : ""} />
            Osvježi
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {detailStats.total > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={statBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Users size={16} color={th.accent} />
              <span style={{ fontSize: 12, color: th.sub, fontWeight: 600, textTransform: "uppercase" }}>Ukupno</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{detailStats.total}</div>
          </div>
          <div style={statBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <CheckCircle size={16} color={th.green} />
              <span style={{ fontSize: 12, color: th.sub, fontWeight: 600, textTransform: "uppercase" }}>Skenirano</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: th.green }}>{detailStats.used}</div>
            <div style={progressBarOuter}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: th.green,
                  borderRadius: 4,
                  transition: "width .5s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: th.dim, marginTop: 4 }}>{pct}% od ukupno</div>
          </div>
          <div style={statBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <XCircle size={16} color={th.orange} />
              <span style={{ fontSize: 12, color: th.sub, fontWeight: 600, textTransform: "uppercase" }}>Preostalo</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: th.orange }}>{detailStats.unused}</div>
          </div>
          <div style={statBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Clock size={16} color={th.sub} />
              <span style={{ fontSize: 12, color: th.sub, fontWeight: 600, textTransform: "uppercase" }}>Zadnje skeniranje</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{formatTime(detailStats.lastScan)}</div>
          </div>
        </div>
      )}

      {/* Kanali prodaje */}
      {channelEntries.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 20, padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <ShoppingCart size={16} color={th.accent} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: th.sub, letterSpacing: "0.5px" }}>
              Kanali prodaje
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {channelEntries.map(([ch, st]) => {
              const cs = getChannelStyle(ch);
              const pctCh = st.total > 0 ? Math.round((st.used / st.total) * 100) : 0;
              const totalAll = detailStats.total || 1;
              const sharePct = Math.round((st.total / totalAll) * 100);
              return (
                <div
                  key={ch}
                  style={{
                    background: cs.bg,
                    border: `1px solid ${cs.color}22`,
                    borderRadius: th.r,
                    padding: "12px 16px",
                    minWidth: 160,
                    flex: "1 1 160px",
                    maxWidth: 240,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cs.color }}>{ch}</span>
                    <span style={{ fontSize: 11, color: cs.color, fontWeight: 600, background: `${cs.color}18`, padding: "2px 7px", borderRadius: 10 }}>
                      {sharePct}% prodaje
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: cs.color, lineHeight: 1 }}>{st.total}</div>
                      <div style={{ fontSize: 10, color: th.sub, marginTop: 2 }}>karata</div>
                    </div>
                    <div style={{ borderLeft: `1px solid ${cs.color}33`, paddingLeft: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: th.green, lineHeight: 1 }}>{st.used}</div>
                      <div style={{ fontSize: 10, color: th.sub, marginTop: 2 }}>skenirano</div>
                    </div>
                    <div style={{ borderLeft: `1px solid ${cs.color}33`, paddingLeft: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: th.orange, lineHeight: 1 }}>{st.total - st.used}</div>
                      <div style={{ fontSize: 10, color: th.sub, marginTop: 2 }}>preostalo</div>
                    </div>
                  </div>
                  <div style={{ ...progressBarOuter, marginTop: 0 }}>
                    <div
                      style={{
                        width: `${pctCh}%`,
                        height: "100%",
                        background: cs.bar,
                        borderRadius: 4,
                        transition: "width .5s ease",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: th.sub, marginTop: 3 }}>{pctCh}% skenirano</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Search size={15} color={th.dim} style={{ position: "absolute", left: 10, top: 9 }} />
          <input
            style={searchInput}
            placeholder="Pretraži ime, email, seat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(["all", "used", "unused"] as const).map((f) => (
          <button
            key={f}
            style={{
              ...btnStyle,
              background: filterUsed === f ? th.accent : th.card,
              color: filterUsed === f ? "#fff" : th.text,
              borderColor: filterUsed === f ? th.accent : th.border,
            }}
            onClick={() => setFilterUsed(f)}
          >
            {f === "all" ? "Sve" : f === "used" ? "Skenirane" : "Neskenirane"}
          </button>
        ))}
        <span style={{ fontSize: 12, color: th.dim, marginLeft: 8 }}>
          Prikazano: {filteredDetails.length}
        </span>
      </div>

      {/* Table */}
      {loadingDetails ? (
        <div style={{ textAlign: "center", padding: 40, color: th.sub }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13 }}>Učitavanje...</p>
        </div>
      ) : (
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Ime kupca</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Sjedište</th>
                <th style={thStyle}>Kategorija</th>
                <th style={thStyle}>Kanal prodaje</th>
                <th style={thStyle}>Ulaz</th>
                <th style={thStyle}>Način skeniranja</th>
                <th style={thStyle}>Vrijeme skeniranja</th>
                <th style={thStyle}>Skenirao</th>
              </tr>
            </thead>
            <tbody>
              {filteredDetails.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: "center", padding: 30, color: th.dim }}>
                    Nema rezultata
                  </td>
                </tr>
              ) : (
                filteredDetails.map((d) => (
                  <tr
                    key={d.id}
                    style={{ transition: "background .1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbfc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={tdStyle}>
                      {d.isUsed ? (
                        <span style={badge(th.greenBg, th.green)}>
                          <CheckCircle size={12} /> Skenirano
                        </span>
                      ) : (
                        <span style={badge("#f3f4f6", th.dim)}>
                          <XCircle size={12} /> Čeka
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{d.customerName || "—"}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: th.sub }}>{d.customerEmail || "—"}</td>
                    <td style={tdStyle}>{d.seatId || "—"}</td>
                    <td style={tdStyle}>{d.category || "—"}</td>
                    <td style={tdStyle}>
                      {d.salesChannel ? (
                        <span style={badge(
                          getChannelStyle(d.salesChannel).bg,
                          getChannelStyle(d.salesChannel).color
                        )}>
                          {d.salesChannel}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={tdStyle}>{d.entrance || "—"}</td>
                    <td style={tdStyle}>
                      {d.scanMethod ? (
                        <span style={badge(
                          d.scanMethod === "Link" ? "#eff6ff" : "#f0fdf4",
                          d.scanMethod === "Link" ? "#2563eb" : "#16a34a"
                        )}>
                          {d.scanMethod}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>
                      {formatTime(d.scannedAt)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: th.sub }}>{d.scannedBy || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Skeniranje;
