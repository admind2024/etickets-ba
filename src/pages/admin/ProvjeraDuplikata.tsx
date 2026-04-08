import { useState, useEffect, useRef } from "react";
import { Copy, Loader2, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SeatEvent {
  id: string;
  name: string;
  eventKey: string | null;
  date: string | null;
  venue: string | null;
}

interface DuplicateEntry {
  seatId: string;
  tickets: {
    ticketId: string;
    customerName: string;
    customerEmail: string;
    sessionId: string;
    purchaseDate: string;
    status: string;
  }[];
}

interface OrphanedTicket {
  seatId: string;
  ticketId: string;
  customerName: string;
  customerEmail: string;
  sessionId: string;
  purchaseDate: string;
}

interface UnmatchedSeat {
  seatId: string;
  label: string;
  status: string;
  orderId: string;
  objectType: string;
}

interface GAComparison {
  area: string;
  seatsioBooked: number;
  qrKarteCount: number;
  difference: number;
  capacity: number;
}

interface ComparisonResult {
  summary: {
    totalSeatsio: number;
    totalQRKarte: number;
    matched: number;
    onlyInQRKarteCount: number;
    onlyInSeatsioCount: number;
    duplicatesCount: number;
    gaZones: number;
  };
  duplicates: DuplicateEntry[];
  onlyInQRKarte: OrphanedTicket[];
  onlyInSeatsio: UnmatchedSeat[];
  gaComparison: GAComparison[];
}

const ProvjeraDuplikata = () => {
  const [events, setEvents] = useState<SeatEvent[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("duplicates");
  const [selectedOrphaned, setSelectedOrphaned] = useState<Set<number>>(new Set());
  const [selectedUnmatched, setSelectedUnmatched] = useState<Set<number>>(new Set());
  const [isBooking, setIsBooking] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [resultSearch, setResultSearch] = useState("");
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      const { data, error } = await (supabase
        .from("AboutEvents") as any)
        .select("id, name, eventKey, date, venue")
        .not("eventKey", "is", null)
        .neq("eventKey", "")
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching events:", error);
        toast.error("Greška pri učitavanju događaja");
      } else if (data) {
        setEvents(data as SeatEvent[]);
      }
      setIsLoadingEvents(false);
    };

    fetchEvents();
  }, []);

  // Klik van dropdowna zatvori
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) {
        setIsEventDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEvents = events.filter((evt) =>
    !eventSearch ||
    evt.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
    (evt.venue || "").toLowerCase().includes(eventSearch.toLowerCase()) ||
    (evt.date || "").includes(eventSearch)
  );

  const selectedEvent = events.find((e) => e.eventKey === selectedEventKey);

  const runComparison = async () => {
    if (!selectedEventKey) {
      toast.error("Odaberite događaj");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("compare-seats", {
        body: { eventId: selectedEventKey },
      });

      if (fnError) {
        throw new Error(fnError.message || "Greška pri pozivu funkcije");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data as ComparisonResult);

      const problems = (data.summary?.onlyInQRKarteCount || 0) + (data.summary?.duplicatesCount || 0);
      const manualBookings = data.summary?.onlyInSeatsioCount || 0;
      if (problems > 0 || manualBookings > 0) {
        const parts: string[] = [];
        if (problems > 0) parts.push(`${problems} problema`);
        if (manualBookings > 0) parts.push(`${manualBookings} ručno bukiranih bez prodaje`);
        toast.warning(`Pronađeno ${parts.join(", ")}`);
      } else {
        toast.success("Sve karte su ispravne");
      }
    } catch (err: any) {
      const msg = err.message || "Nepoznata greška";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOrphanedSelection = (index: number) => {
    setSelectedOrphaned((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAllOrphaned = () => {
    if (!result) return;
    if (selectedOrphaned.size === result.onlyInQRKarte.length) {
      setSelectedOrphaned(new Set());
    } else {
      setSelectedOrphaned(new Set(result.onlyInQRKarte.map((_, i) => i)));
    }
  };

  const bookSelectedSeats = async (indices: number[]) => {
    if (!result || !selectedEventKey || indices.length === 0) return;

    setIsBooking(true);
    try {
      const seatsToBook = indices.map((i) => result.onlyInQRKarte[i].seatId);

      const { data, error: fnError } = await supabase.functions.invoke("book-seats-admin", {
        body: { eventId: selectedEventKey, seats: seatsToBook },
      });

      if (fnError) {
        throw new Error(fnError.message || "Greška pri pozivu funkcije");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const successCount = data.successCount || 0;
      const failCount = data.failCount || 0;

      if (failCount === 0) {
        toast.success(`Uspješno bukirano ${successCount} sjedišta`);
      } else {
        toast.warning(`Bukirano ${successCount}, neuspješno ${failCount}`);
        const failed = (data.results || []).filter((r: any) => !r.success);
        for (const f of failed) {
          console.error(`Booking failed for ${f.seatId}: ${f.message}`);
        }
      }

      setSelectedOrphaned(new Set());
      // Ponovi usporedbu da se osvježi lista
      await runComparison();
    } catch (err: any) {
      const msg = err.message || "Greška pri bukiranju";
      toast.error(msg);
    } finally {
      setIsBooking(false);
    }
  };

  const releaseSelectedSeats = async (seatIds: string[]) => {
    if (!selectedEventKey || seatIds.length === 0) return;

    setIsReleasing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("release-seats-admin", {
        body: { eventId: selectedEventKey, seats: seatIds },
      });

      if (fnError) {
        throw new Error(fnError.message || "Greška pri pozivu funkcije");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const successCount = data.successCount || 0;
      const failCount = data.failCount || 0;

      if (failCount === 0) {
        toast.success(`Uspješno otpušteno ${successCount} sjedišta`);
      } else {
        toast.warning(`Otpušteno ${successCount}, neuspješno ${failCount}`);
        const failed = (data.results || []).filter((r: any) => !r.success);
        for (const f of failed) {
          console.error(`Release failed for ${f.seatId}: ${f.message}`);
        }
      }

      setSelectedUnmatched(new Set());
      await runComparison();
    } catch (err: any) {
      const msg = err.message || "Greška pri otpuštanju";
      toast.error(msg);
    } finally {
      setIsReleasing(false);
    }
  };

  const tabs = [
    { id: "duplicates", label: "Duplikati", count: result?.summary?.duplicatesCount || 0 },
    { id: "orphaned", label: "Karte bez bookinga", count: result?.summary?.onlyInQRKarteCount || 0 },
    { id: "unmatched", label: "Ručno bukirano (bez prodaje)", count: result?.summary?.onlyInSeatsioCount || 0 },
    { id: "ga", label: "GA zone", count: result?.gaComparison?.length || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-slate-500 w-10 h-10 rounded-lg flex items-center justify-center">
            <Copy size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1a1f36]">Provjera duplikata</h2>
            <p className="text-sm text-[#697386]">
              Uporedi karte u bazi sa seats.io bookingom
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative" ref={eventDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Događaj</label>
            <input
              type="text"
              value={isEventDropdownOpen ? eventSearch : (selectedEvent ? `${selectedEvent.name} ${selectedEvent.date ? `(${selectedEvent.date})` : ""}` : eventSearch)}
              onChange={(e) => {
                setEventSearch(e.target.value);
                setIsEventDropdownOpen(true);
              }}
              onFocus={() => {
                setIsEventDropdownOpen(true);
                if (selectedEventKey) {
                  setEventSearch("");
                }
              }}
              placeholder={isLoadingEvents ? "Učitavanje..." : "Upiši naziv događaja..."}
              disabled={isLoadingEvents}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
            {isEventDropdownOpen && filteredEvents.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {filteredEvents.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      setSelectedEventKey(evt.eventKey!);
                      setEventSearch("");
                      setIsEventDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      selectedEventKey === evt.eventKey ? "bg-blue-50 font-medium text-blue-700" : ""
                    }`}
                  >
                    <span className="font-medium">{evt.name}</span>
                    {evt.date && <span className="text-gray-400 ml-2">({evt.date})</span>}
                    {evt.venue && <span className="text-gray-400 ml-1">— {evt.venue}</span>}
                  </button>
                ))}
              </div>
            )}
            {isEventDropdownOpen && eventSearch && filteredEvents.length === 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
                Nema rezultata
              </div>
            )}
          </div>
          <div className="flex items-end">
            <button
              onClick={runComparison}
              disabled={isLoading || !selectedEventKey}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analiziram...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Uporedi
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Greška</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {result && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Seats.io bukirano</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{result.summary.totalSeatsio}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">QRKarte u bazi</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{result.summary.totalQRKarte}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-green-200 shadow-sm">
            <p className="text-xs text-green-600 uppercase tracking-wide">Poklopljeno</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{result.summary.matched}</p>
          </div>
          <div className={`rounded-xl p-5 border shadow-sm cursor-pointer transition-colors ${
            result.summary.onlyInSeatsioCount > 0
              ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
              : "bg-white border-gray-200"
          }`} onClick={() => result.summary.onlyInSeatsioCount > 0 && setActiveTab("unmatched")}>
            <p className={`text-xs uppercase tracking-wide ${
              result.summary.onlyInSeatsioCount > 0 ? "text-amber-600" : "text-gray-500"
            }`}>Ručno bukirano (bez prodaje)</p>
            <p className={`text-2xl font-bold mt-1 ${
              result.summary.onlyInSeatsioCount > 0 ? "text-amber-700" : "text-gray-900"
            }`}>
              {result.summary.onlyInSeatsioCount}
            </p>
          </div>
          <div className={`rounded-xl p-5 border shadow-sm ${
            (result.summary.onlyInQRKarteCount + result.summary.duplicatesCount) > 0
              ? "bg-red-50 border-red-200"
              : "bg-white border-gray-200"
          }`}>
            <p className={`text-xs uppercase tracking-wide ${
              (result.summary.onlyInQRKarteCount + result.summary.duplicatesCount) > 0
                ? "text-red-600"
                : "text-gray-500"
            }`}>Problematičnih</p>
            <p className={`text-2xl font-bold mt-1 ${
              (result.summary.onlyInQRKarteCount + result.summary.duplicatesCount) > 0
                ? "text-red-700"
                : "text-gray-900"
            }`}>
              {result.summary.onlyInQRKarteCount + result.summary.duplicatesCount}
            </p>
          </div>
        </div>
      )}

      {/* Tabs + Results */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tab headers */}
          <div className="border-b border-gray-200 flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    (tab.id === "duplicates" || tab.id === "orphaned") && tab.count > 0
                      ? "bg-red-100 text-red-700"
                      : tab.id === "unmatched" && tab.count > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search within results */}
          <div className="px-6 pt-4">
            <input
              type="text"
              value={resultSearch}
              onChange={(e) => setResultSearch(e.target.value)}
              placeholder="Pretraži po sjedištu, kupcu, emailu..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tab content */}
          <div className="p-6">
            {/* DUPLIKATI */}
            {activeTab === "duplicates" && (() => {
              const q = resultSearch.toLowerCase().trim();
              const filtered = q
                ? result.duplicates.filter((dup) =>
                    dup.seatId.toLowerCase().includes(q) ||
                    dup.tickets.some((t) =>
                      t.customerName.toLowerCase().includes(q) ||
                      t.customerEmail.toLowerCase().includes(q)
                    )
                  )
                : result.duplicates;
              return filtered.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Nema duplikata</p>
                    <p className="text-sm text-gray-400 mt-1">Svako sjedište je prodato samo jednom</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-red-600 font-medium">
                      {filtered.length} sjedišta prodato više puta različitim kupcima
                      {q && filtered.length !== result.duplicates.length && (
                        <span className="text-gray-400 font-normal ml-1">(od ukupno {result.duplicates.length})</span>
                      )}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Sjedište</th>
                            <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Kupac</th>
                            <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Email</th>
                            <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Datum</th>
                            <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((dup, i) =>
                            dup.tickets.map((ticket, j) => (
                              <tr
                                key={`${i}-${j}`}
                                className={`border-b border-gray-100 ${j === 0 ? "bg-red-50" : ""}`}
                              >
                                {j === 0 ? (
                                  <td
                                    className="py-2 px-3 font-mono font-bold text-red-700"
                                    rowSpan={dup.tickets.length}
                                  >
                                    {dup.seatId}
                                    <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                      x{dup.tickets.length}
                                    </span>
                                  </td>
                                ) : null}
                                <td className="py-2 px-3">{ticket.customerName}</td>
                                <td className="py-2 px-3 text-gray-500">{ticket.customerEmail}</td>
                                <td className="py-2 px-3 text-gray-500">{ticket.purchaseDate}</td>
                                <td className="py-2 px-3">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    ticket.status === "active"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}>
                                    {ticket.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
            })()}

            {/* KARTE BEZ BOOKINGA */}
            {activeTab === "orphaned" && (() => {
              const q = resultSearch.toLowerCase().trim();
              // Filtrirane karte sa originalnim indeksima (za booking)
              const filteredWithIdx = result.onlyInQRKarte
                .map((ticket, i) => ({ ticket, origIdx: i }))
                .filter(({ ticket }) =>
                  !q ||
                  ticket.seatId.toLowerCase().includes(q) ||
                  ticket.customerName.toLowerCase().includes(q) ||
                  ticket.customerEmail.toLowerCase().includes(q) ||
                  ticket.ticketId.toLowerCase().includes(q)
                );
              return filteredWithIdx.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">{q ? "Nema rezultata pretrage" : "Sve karte imaju booking"}</p>
                  <p className="text-sm text-gray-400 mt-1">{q ? "Promijenite pojam za pretragu" : "Svaka karta u bazi ima odgovarajuće sjedište bukirano na seats.io"}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-red-600 font-medium">
                      {filteredWithIdx.length} karata postoji u bazi ali sjedište NIJE bukirano na seats.io
                      {q && filteredWithIdx.length !== result.onlyInQRKarte.length && (
                        <span className="text-gray-400 font-normal ml-1">(od ukupno {result.onlyInQRKarte.length})</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {selectedOrphaned.size > 0 && (
                        <button
                          onClick={() => bookSelectedSeats(Array.from(selectedOrphaned))}
                          disabled={isBooking}
                          className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          {isBooking ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Bukiram...
                            </>
                          ) : (
                            <>Bukiraj odabrane ({selectedOrphaned.size})</>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => bookSelectedSeats(filteredWithIdx.map(({ origIdx }) => origIdx))}
                        disabled={isBooking}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        {isBooking ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Bukiram...
                          </>
                        ) : (
                          <>Bukiraj sve ({filteredWithIdx.length})</>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={filteredWithIdx.every(({ origIdx }) => selectedOrphaned.has(origIdx)) && filteredWithIdx.length > 0}
                              onChange={() => {
                                const allSelected = filteredWithIdx.every(({ origIdx }) => selectedOrphaned.has(origIdx));
                                setSelectedOrphaned((prev) => {
                                  const next = new Set(prev);
                                  for (const { origIdx } of filteredWithIdx) {
                                    if (allSelected) next.delete(origIdx); else next.add(origIdx);
                                  }
                                  return next;
                                });
                              }}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Sjedište</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Ticket ID</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Kupac</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Email</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Datum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWithIdx.map(({ ticket, origIdx }) => (
                          <tr key={origIdx} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedOrphaned.has(origIdx) ? "bg-blue-50" : ""}`}>
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={selectedOrphaned.has(origIdx)}
                                onChange={() => toggleOrphanedSelection(origIdx)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-red-700">{ticket.seatId}</td>
                            <td className="py-2 px-3 font-mono text-xs text-gray-500">{ticket.ticketId}</td>
                            <td className="py-2 px-3">{ticket.customerName}</td>
                            <td className="py-2 px-3 text-gray-500">{ticket.customerEmail}</td>
                            <td className="py-2 px-3 text-gray-500">{ticket.purchaseDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* RUČNO BUKIRANO (BEZ PRODAJE) */}
            {activeTab === "unmatched" && (() => {
              const q = resultSearch.toLowerCase().trim();
              const filteredWithIdx = result.onlyInSeatsio
                .map((seat, i) => ({ seat, origIdx: i }))
                .filter(({ seat }) =>
                  !q ||
                  seat.seatId.toLowerCase().includes(q) ||
                  seat.label.toLowerCase().includes(q) ||
                  seat.orderId.toLowerCase().includes(q)
                );
              return filteredWithIdx.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">{q ? "Nema rezultata pretrage" : "Nema ručnih bukinga bez prodaje"}</p>
                  <p className="text-sm text-gray-400 mt-1">{q ? "Promijenite pojam za pretragu" : "Svako bukirano sjedište ima odgovarajuću kartu u bazi"}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800 font-medium">
                      {filteredWithIdx.length} sjedišta bukirano ručno u SEAT ali nema prodaju u bazi
                      {q && filteredWithIdx.length !== result.onlyInSeatsio.length && (
                        <span className="text-amber-500 font-normal ml-1">(od ukupno {result.onlyInSeatsio.length})</span>
                      )}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Ova sjedišta su zauzeta na seats.io ali nemaju kartu u QRKarte tabeli — vjerovatno ručno bukirana bez online prodaje
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div />
                    <div className="flex items-center gap-2">
                      {selectedUnmatched.size > 0 && (
                        <button
                          onClick={() => {
                            const seatIds = Array.from(selectedUnmatched).map((i) => result.onlyInSeatsio[i].seatId);
                            releaseSelectedSeats(seatIds);
                          }}
                          disabled={isReleasing}
                          className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          {isReleasing ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Otpuštam...
                            </>
                          ) : (
                            <>Otpusti odabrane ({selectedUnmatched.size})</>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const seatIds = filteredWithIdx.map(({ seat }) => seat.seatId);
                          releaseSelectedSeats(seatIds);
                        }}
                        disabled={isReleasing}
                        className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        {isReleasing ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Otpuštam...
                          </>
                        ) : (
                          <>Otpusti sve ({filteredWithIdx.length})</>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={filteredWithIdx.every(({ origIdx }) => selectedUnmatched.has(origIdx)) && filteredWithIdx.length > 0}
                              onChange={() => {
                                const allSelected = filteredWithIdx.every(({ origIdx }) => selectedUnmatched.has(origIdx));
                                setSelectedUnmatched((prev) => {
                                  const next = new Set(prev);
                                  for (const { origIdx } of filteredWithIdx) {
                                    if (allSelected) next.delete(origIdx); else next.add(origIdx);
                                  }
                                  return next;
                                });
                              }}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Object ID</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Label</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Status</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Order ID</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Tip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWithIdx.map(({ seat, origIdx }) => (
                          <tr key={origIdx} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedUnmatched.has(origIdx) ? "bg-amber-50" : ""}`}>
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={selectedUnmatched.has(origIdx)}
                                onChange={() => {
                                  setSelectedUnmatched((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(origIdx)) next.delete(origIdx); else next.add(origIdx);
                                    return next;
                                  });
                                }}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-amber-700">{seat.seatId}</td>
                            <td className="py-2 px-3 font-mono text-xs text-gray-500">{seat.label}</td>
                            <td className="py-2 px-3">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                {seat.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-xs text-gray-500">{seat.orderId}</td>
                            <td className="py-2 px-3 text-gray-500">{seat.objectType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* GA ZONE */}
            {activeTab === "ga" && (
              <>
                {result.gaComparison.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-600 font-medium">Nema GA zona</p>
                    <p className="text-sm text-gray-400 mt-1">Ovaj event nema General Admission područja</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Zona</th>
                          <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Seats.io</th>
                          <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">QRKarte</th>
                          <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Razlika</th>
                          <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Kapacitet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.gaComparison.map((ga, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium">{ga.area}</td>
                            <td className="py-2 px-3 text-right">{ga.seatsioBooked}</td>
                            <td className="py-2 px-3 text-right">{ga.qrKarteCount}</td>
                            <td className={`py-2 px-3 text-right font-bold ${
                              ga.difference !== 0 ? "text-red-600" : "text-green-600"
                            }`}>
                              {ga.difference > 0 ? `+${ga.difference}` : ga.difference}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-500">{ga.capacity || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvjeraDuplikata;
