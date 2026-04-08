import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader2, Search, Download, ChevronRight, ArrowLeft } from "lucide-react";

interface EventItem {
  eventName: string;
  eventId: string;
  eventDate: string | null;
}

interface InsuredTicket {
  id: string;
  customerName: string;
  "Customer Email": string;
  customerPhone: string;
  seatId: string;
  sectionLabel: string;
  category: string;
  price: number;
  insurancePrice: string | null;
  Purchasedate: string;
  Valuta: string;
}

export default function AdminOsiguranje() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [tickets, setTickets] = useState<InsuredTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [search, setSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  // Global stats
  const [globalCount, setGlobalCount] = useState(0);
  const [globalRevenue, setGlobalRevenue] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadEvents();
    loadGlobalStats();
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("AboutEvents")
      .select("name, eventId, date, id")
      .not("name", "is", null)
      .order("date", { ascending: false });

    const result: EventItem[] = (data || []).map((ev: any) => ({
      eventName: ev.name,
      eventId: ev.eventId?.trim() || ev.id,
      eventDate: ev.date || null,
    }));
    setEvents(result);
    setLoadingEvents(false);
  };

  // Light global stats - just count and sum insurancePrice
  const loadGlobalStats = async () => {
    setLoadingStats(true);
    const PAGE = 1000;
    let count = 0;
    let revenue = 0;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("QRKarte")
        .select("price, insurancePrice")
        .eq("insurance", "true")
        .range(from, from + PAGE - 1);

      if (error || !data || data.length === 0) break;

      count += data.length;
      for (const t of data) {
        const ip = parseFloat(t.insurancePrice || "0") || (parseFloat(String(t.price)) * 0.07);
        revenue += ip;
      }

      if (data.length < PAGE) break;
      from += PAGE;
    }

    setGlobalCount(count);
    setGlobalRevenue(revenue);
    setLoadingStats(false);
  };

  const loadInsured = useCallback(async (eventId: string) => {
    setLoadingTickets(true);
    let allData: any[] = [];
    const PAGE = 1000;
    const ids = eventId.split(",").map((id) => id.trim()).filter(Boolean);

    for (const eid of ids) {
      let from = 0;
      while (true) {
        const { data: batch, error } = await supabase
          .from("QRKarte")
          .select('id, customerName, "Customer Email", customerPhone, seatId, sectionLabel, category, price, insurancePrice, Purchasedate, Valuta')
          .eq("eventId", eid)
          .eq("insurance", "true")
          .range(from, from + PAGE - 1);

        if (error) { console.error(error); break; }
        if (!batch || batch.length === 0) break;
        allData = allData.concat(batch);
        if (batch.length < PAGE) break;
        from += PAGE;
      }
    }

    setTickets(allData);
    setLoadingTickets(false);
  }, []);

  const handleSelectEvent = (ev: EventItem) => {
    setSelectedEvent(ev);
    setSearch("");
    loadInsured(ev.eventId);
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setTickets([]);
    setSearch("");
  };

  const filteredEvents = useMemo(() => {
    if (!eventSearch) return events;
    const s = eventSearch.toLowerCase();
    return events.filter((ev) => ev.eventName.toLowerCase().includes(s));
  }, [events, eventSearch]);

  const filtered = useMemo(() => {
    if (!search) return tickets;
    const s = search.toLowerCase();
    return tickets.filter(
      (t) =>
        (t.customerName || "").toLowerCase().includes(s) ||
        (t["Customer Email"] || "").toLowerCase().includes(s) ||
        (t.seatId || "").toLowerCase().includes(s)
    );
  }, [tickets, search]);

  const totalInsurance = useMemo(() => {
    return filtered.reduce((sum, t) => {
      const ip = parseFloat(t.insurancePrice || "0") || (parseFloat(String(t.price)) * 0.07);
      return sum + ip;
    }, 0);
  }, [filtered]);

  const exportCSV = () => {
    if (!selectedEvent) return;
    const headers = ["Kupac", "Email", "Telefon", "Kategorija", "Sjediste", "Cijena karte", "Cijena osiguranja", "Valuta", "Datum"];
    const rows = filtered.map((t) => [
      t.customerName,
      t["Customer Email"],
      t.customerPhone,
      t.category || t.sectionLabel,
      t.seatId,
      t.price,
      parseFloat(t.insurancePrice || "0") || (parseFloat(String(t.price)) * 0.07).toFixed(2),
      t.Valuta || "EUR",
      t.Purchasedate,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osiguranje_${selectedEvent.eventName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ─── Event list view ───
  if (!selectedEvent) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-teal-600" />
            Osiguranje ulaznica
          </h2>
          <p className="text-sm text-gray-500">Izaberite event da vidite osigurane karte</p>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">Ukupno osiguranih (svi eventi)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {loadingStats ? <Loader2 className="w-5 h-5 animate-spin inline" /> : globalCount}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold">Ukupan prihod od osiguranja</p>
            <p className="text-2xl font-bold text-teal-600 mt-1">
              {loadingStats ? <Loader2 className="w-5 h-5 animate-spin inline" /> : `${globalRevenue.toFixed(2)} EUR`}
            </p>
          </div>
        </div>

        {/* Event search */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="Pretrazi event..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {loadingEvents ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {filteredEvents.map((ev) => (
              <button
                key={ev.eventId}
                onClick={() => handleSelectEvent(ev)}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-gray-900">{ev.eventName}</p>
                  {ev.eventDate && (
                    <p className="text-xs text-gray-400 mt-0.5">{ev.eventDate}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ))}
            {filteredEvents.length === 0 && (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">Nema evenata</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Ticket list view ───
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mb-3">
          <ArrowLeft className="w-4 h-4" /> Nazad na listu
        </button>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
          <Shield className="w-6 h-6 text-teal-600" />
          {selectedEvent.eventName}
        </h2>
        <p className="text-sm text-gray-500">Osigurane ulaznice</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Osiguranih karata</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Prihod od osiguranja</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{totalInsurance.toFixed(2)} EUR</p>
        </div>
      </div>

      {/* Search + Export */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretrazi po imenu, emailu..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      {loadingTickets ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Kupac</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Telefon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Kategorija</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Karta</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Osiguranje</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Datum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const insPrice = parseFloat(t.insurancePrice || "0") || (parseFloat(String(t.price)) * 0.07);
                return (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{t.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t["Customer Email"]}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.customerPhone}</td>
                    <td className="px-4 py-3 text-sm">{t.sectionLabel || t.category || t.seatId}</td>
                    <td className="px-4 py-3 text-sm text-right">{parseFloat(String(t.price)).toFixed(2)} {t.Valuta || "EUR"}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-teal-600">{insPrice.toFixed(2)} {t.Valuta || "EUR"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.Purchasedate}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Nema osiguranih karata za ovaj event</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
