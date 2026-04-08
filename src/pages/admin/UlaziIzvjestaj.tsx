import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Printer, RefreshCw, Loader2, DoorOpen, ChevronDown } from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────
// v3 - grouping by eventName, force redeploy

function extractSector(seatId: string | null): string {
  if (!seatId || seatId === "N/A") return "NEPOZNATO";
  const s = seatId.trim().toLowerCase();

  if (s.includes("parter")) return "PARTER";
  if (s.includes("barski") || s.includes("bar")) return "BARSKI STO";
  if (s.includes("vip")) return "VIP SEKTOR";
  if (s.includes("fan pit") || s.includes("fanpit")) return "FAN PIT";
  if (s.includes("stajanje") || s.includes("standing")) return "STAJANJE";

  // "2A-Mjesto-5" → TRIBINA 2A
  const match = seatId.match(/^([0-9]+\s*[A-Za-z])/);
  if (match) return "TRIBINA " + match[1].trim().toUpperCase();

  // "12-Mjesto-3" → TRIBINA 12
  const numMatch = seatId.match(/^([0-9]+)/);
  if (numMatch) return "TRIBINA " + numMatch[1];

  return "OSTALO";
}

function formatDate(): { date: string; time: string } {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    date: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TicketRow {
  seatId: string;
  entrance: string;
}

interface EntranceStats {
  entrance: string;
  count: number;
  sectors: Record<string, number>;
}

// ── Component ────────────────────────────────────────────────────────────────

const UlaziIzvjestaj = () => {
  const [events, setEvents] = useState<{ eventName: string; eventId: string }[]>([]);
  const [selectedEventName, setSelectedEventName] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Fetch events list from AboutEvents (lightweight) ──
  useEffect(() => {
    (async () => {
      try {
        setLoadingEvents(true);
        const { data, error: err } = await supabase
          .from("AboutEvents")
          .select("name, eventId, date")
          .not("name", "is", null)
          .order("date", { ascending: false });

        if (err) throw err;

        const list = (data || []).map((ev) => ({
          eventName: ev.name,
          eventId: ev.eventId?.trim() || "",
        }));
        setEvents(list);

        if (list.length > 0) {
          setSelectedEventName(list[0].eventName);
          setSelectedEventId(list[0].eventId);
        }
      } catch (e: unknown) {
        console.error("Error loading events:", e);
        setError(e instanceof Error ? e.message : "Greska pri ucitavanju");
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, []);

  // ── Fetch tickets for event (supports comma-separated eventIds) ──
  const fetchTickets = useCallback(async (eventIds: string) => {
    if (!eventIds) return;
    setLoading(true);
    setError(null);

    try {
      const BATCH = 1000;
      let allTickets: TicketRow[] = [];
      const ids = eventIds.split(",").map(id => id.trim()).filter(Boolean);

      for (const eid of ids) {
        let offset = 0;
        while (true) {
          const { data, error: err } = await supabase
            .from("QRKarte")
            .select("seatId, entrance, Hide, manualHide")
            .eq("eventId", eid)
            .range(offset, offset + BATCH - 1)
            .limit(BATCH);

          if (err) throw err;
          if (!data || data.length === 0) break;

          allTickets = allTickets.concat(
            data
              .filter((t: any) => t.Hide !== true && t.manualHide !== true)
              .map((t: { seatId: string | null; entrance: string | null }) => ({
                seatId: t.seatId || "N/A",
                entrance: t.entrance || "Nepoznat ulaz",
              }))
          );

          if (data.length < BATCH) break;
          offset += BATCH;
        }
      }

      setTickets(allTickets);
    } catch (e: unknown) {
      console.error("Error loading tickets:", e);
      setError(e instanceof Error ? e.message : "Greska pri ucitavanju");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchTickets(selectedEventId);
    }
  }, [selectedEventId, fetchTickets]);

  // ── Compute stats ──
  const stats = useMemo((): EntranceStats[] => {
    const map = new Map<string, EntranceStats>();

    for (const t of tickets) {
      const entrance = t.entrance.toUpperCase();
      const sector = extractSector(t.seatId);

      if (!map.has(entrance)) {
        map.set(entrance, { entrance, count: 0, sectors: {} });
      }
      const s = map.get(entrance)!;
      s.count++;
      s.sectors[sector] = (s.sectors[sector] || 0) + 1;
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tickets]);

  const totalPeople = tickets.length;
  const totalEntrances = stats.length;
  const avgPerEntrance = totalEntrances > 0 ? Math.round(totalPeople / totalEntrances) : 0;

  // ── Handlers ──
  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventId = e.target.value;
    const ev = events.find((ev) => ev.eventId === eventId);
    setSelectedEventId(eventId);
    setSelectedEventName(ev?.eventName || "");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    if (selectedEventId) fetchTickets(selectedEventId);
  };

  const { date, time } = formatDate();
  const docId = `DOC-${Date.now()}`;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadingEvents) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-[#013DC4]" size={32} />
        <span className="ml-3 text-gray-500 text-lg">Ucitavanje dogadjaja...</span>
      </div>
    );
  }

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          /* Hide everything except the report */
          body > * { visibility: hidden !important; }
          #ulazi-print-area, #ulazi-print-area * { visibility: visible !important; }
          #ulazi-print-area {
            position: absolute !important;
            left: 0; top: 0;
            width: 21cm;
            padding: 1.5cm;
            margin: 0;
            background: white !important;
            font-size: 10pt;
          }
          .no-print { display: none !important; }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      {/* Controls - hidden on print */}
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <select
            value={selectedEventId}
            onChange={handleEventChange}
            className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-[#1a1f36] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#013DC4]/20 focus:border-[#013DC4] transition-all"
          >
            {events.map((ev) => (
              <option key={ev.eventId || ev.eventName} value={ev.eventId}>
                {ev.eventName}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-[#425466] hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Osvjezi
        </button>

        <button
          onClick={handlePrint}
          disabled={loading || tickets.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#013DC4] text-white rounded-lg text-sm font-medium hover:bg-[#0130a0] transition-all shadow-sm disabled:opacity-50"
        >
          <Printer size={15} />
          Stampaj
        </button>
      </div>

      {error && (
        <div className="no-print bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-[#013DC4]" size={28} />
          <span className="ml-3 text-gray-500">Ucitavanje karata...</span>
        </div>
      )}

      {!loading && tickets.length === 0 && !error && (
        <div className="text-center py-24 text-gray-400">
          <DoorOpen size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nema podataka za odabrani dogadjaj.</p>
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div
          id="ulazi-print-area"
          ref={printRef}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10 max-w-[900px] mx-auto"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          {/* ── HEADER ── */}
          <div className="border-b border-gray-300 pb-4 mb-6">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>DOKUMENT:</span>
              <span className="font-semibold text-gray-800">IZVJESTAJ O DISTRIBUCIJI ULAZA</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>DOGADJAJ:</span>
              <span className="font-semibold text-gray-800">{selectedEventName.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>DATUM IZVJESTAJA:</span>
              <span>{date}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>VRIJEME GENERISANJA:</span>
              <span>{date} {time}</span>
            </div>
          </div>

          {/* ── TITLE ── */}
          <h2
            className="text-center text-base font-bold tracking-[3px] uppercase mb-6"
            style={{ letterSpacing: "3px" }}
          >
            PREGLED ULAZA
          </h2>

          {/* ── SUMMARY ── */}
          <div className="border border-gray-300 rounded-lg p-4 mb-6 text-xs">
            <div className="flex justify-between py-1 border-b border-dotted border-gray-300">
              <span>UKUPAN BROJ REGISTROVANIH ULAZA:</span>
              <span className="font-bold">{totalEntrances}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-dotted border-gray-300">
              <span>UKUPAN BROJ POSJETILACA:</span>
              <span className="font-bold">{totalPeople}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>PROSJECNO POSJETILACA PO ULAZU:</span>
              <span className="font-bold">{avgPerEntrance}</span>
            </div>
          </div>

          {/* ── TABLE ── */}
          <table className="w-full border-collapse text-[10px] mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-bold text-[9px] uppercase w-[18%]">
                  Ulaz
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold text-[9px] uppercase w-[10%]">
                  Broj
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold text-[9px] uppercase w-[10%]">
                  %
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left font-bold text-[9px] uppercase">
                  Distribucija po sektorima
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => {
                const pct = totalPeople > 0 ? ((s.count / totalPeople) * 100).toFixed(1) : "0";
                const sortedSectors = Object.entries(s.sectors).sort((a, b) => b[1] - a[1]);

                return (
                  <tr key={s.entrance} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                    <td className="border border-gray-200 px-3 py-2 font-semibold">{s.entrance}</td>
                    <td className="border border-gray-200 px-3 py-2 text-center font-semibold">{s.count}</td>
                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{pct}%</td>
                    <td className="border border-gray-200 px-3 py-2">
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {sortedSectors.map(([sector, cnt]) => (
                          <span key={sector} className="whitespace-nowrap">
                            {sector}: <strong>{cnt}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Total row */}
              <tr className="bg-gray-200 font-bold border-t-2 border-gray-400">
                <td className="border border-gray-300 px-3 py-2 text-right">UKUPNO:</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{totalPeople}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">100%</td>
                <td className="border border-gray-300 px-3 py-2">{totalEntrances} ULAZA</td>
              </tr>
            </tbody>
          </table>

          {/* ── PER-ENTRANCE DETAILED BREAKDOWN ── */}
          {stats.length > 1 && (
            <div className="mb-6">
              <div className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">
                VIZUELNI PREGLED DISTRIBUCIJE:
              </div>
              <div className="space-y-2">
                {stats.map((s) => {
                  const pct = totalPeople > 0 ? (s.count / totalPeople) * 100 : 0;
                  return (
                    <div key={s.entrance} className="flex items-center gap-3 text-[10px]">
                      <span className="w-[100px] font-semibold truncate">{s.entrance}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden border border-gray-200">
                        <div
                          className="h-full bg-[#013DC4] rounded transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-[70px] text-right text-gray-600">
                        {s.count} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="border-t border-gray-300 pt-4 mt-8 text-[9px] text-gray-500">
            <div className="flex justify-between mb-1">
              <span>SISTEM:</span>
              <span>etickets.ba</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>DOKUMENT ID:</span>
              <span>{docId}</span>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-12">
              <div className="w-[45%] text-center">
                <div className="border-t border-gray-400 mt-10 pt-2 text-[9px]">
                  OVLASCENO LICE ORGANIZATORA
                </div>
              </div>
              <div className="w-[45%] text-center">
                <div className="border-t border-gray-400 mt-10 pt-2 text-[9px]">
                  OVLASCENO LICE OBEZBEDJENJA
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UlaziIzvjestaj;
