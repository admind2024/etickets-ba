import { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  FileText,
  Eye,
  X,
  ChevronDown,
  Check,
  Filter,
  Shield,
  Globe,
  RefreshCw,
  ArrowRightLeft,
  User,
  Baby,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOcrMode } from "@/hooks/useAdminSettings";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const PAGE_SIZE = 50;

interface DocTicket {
  id: string;
  customerName: string;
  eventName: string;
  created_at: string;
  document_type: string;
  document_number: string;
  doc_surname: string;
  doc_given_names: string;
  doc_sex: string;
  doc_expiry_date: string;
  document_image_url: string;
  "Customer Email": string;
  originalCustomerName: string | null;
  nameChangeUsed: boolean;
  nameChangedAt: string | null;
  nameChangeData: any;
  [key: string]: any;
}

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

const useDocTickets = (filters: { search?: string; events?: string[] }) => {
  return useInfiniteQuery({
    queryKey: ["doc-tickets", filters.search || "", filters.events?.join(",") || ""],
    queryFn: async ({ pageParam = 0 }) => {
      const searchTerm = filters.search?.trim() || null;
      const eventFilter = filters.events && filters.events.length > 0 ? filters.events : null;

      let query = supabase
        .from("QRKarte")
        .select(
          'id,customerName,eventName,created_at,document_type,document_number,doc_surname,doc_given_names,doc_sex,doc_expiry_date,document_image_url,"Customer Email",originalCustomerName,nameChangeUsed,nameChangedAt,nameChangeData',
          { count: "exact" }
        )
        .ilike("eventName", "%Crna Gora%")
        .order("created_at", { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (eventFilter) {
        if (eventFilter.length === 1) {
          query = query.eq("eventName", eventFilter[0]);
        } else {
          query = query.in("eventName", eventFilter);
        }
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        query = query.or(
          `customerName.ilike.%${term}%,doc_surname.ilike.%${term}%,doc_given_names.ilike.%${term}%,document_number.ilike.%${term}%,"Customer Email".ilike.%${term}%,originalCustomerName.ilike.%${term}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data || []) as DocTicket[], count: count || 0, page: pageParam };
    },
    getNextPageParam: (last) => {
      const next = last.page + 1;
      return next * PAGE_SIZE < last.count ? next : undefined;
    },
    initialPageParam: 0,
  });
};

const useEvents = () => {
  return useInfiniteQuery({
    queryKey: ["doc-events-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("QRKarte")
        .select("eventName")
        .ilike("eventName", "%Crna Gora%")
        .order("eventName");
      const unique = [...new Set((data || []).map((d: any) => d.eventName).filter(Boolean))];
      return { events: unique as string[] };
    },
    getNextPageParam: () => undefined,
    initialPageParam: 0,
  });
};

const DokumentKupaca = () => {
  const [searchInput, setSearchInput] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchInput, 500);

  const { mode, isLoading: modeLoading, isSaving, setMode } = useOcrMode();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useDocTickets({ search: debouncedSearch, events: selectedEvents });
  const { data: eventsData } = useEvents();

  const allRows = data?.pages.flatMap((p) => p.rows) || [];
  const totalCount = data?.pages[0]?.count || 0;
  const allEvents = eventsData?.pages[0]?.events || [];

  const filteredEvents = eventSearchQuery
    ? allEvents.filter((e) => e.toLowerCase().includes(eventSearchQuery.toLowerCase()))
    : allEvents;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsEventDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const docTypeLabel = (t: string) => {
    if (t === "id_card") return "Lična karta";
    if (t === "passport") return "Pasoš";
    return t || "—";
  };

  const sexLabel = (s: string) => {
    if (s === "M") return "M";
    if (s === "F") return "Ž";
    return s || "—";
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header + OCR Mode Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Dokumenti kupaca
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pregled kupljenih karata sa podacima iz ličnih dokumenata
          </p>
        </div>

        {/* OCR Mode Toggle */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase">OCR Mod:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setMode("strict")}
              disabled={isSaving || modeLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === "strict"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Striktno (CG)
            </button>
            <button
              onClick={() => setMode("relaxed")}
              disabled={isSaving || modeLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === "relaxed"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Opušteno (Sve)
            </button>
          </div>
          {isSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
      </div>

      {/* Mode description */}
      <div
        className={`mb-4 p-3 rounded-lg text-xs ${
          mode === "strict"
            ? "bg-blue-50 border border-blue-200 text-blue-700"
            : "bg-green-50 border border-green-200 text-green-700"
        }`}
      >
        {mode === "strict" ? (
          <>
            <strong>Striktni mod:</strong> Prihvataju se samo crnogorski dokumenti (lična karta i
            pasoš). Dokumenti drugih država biće odbijeni.
          </>
        ) : (
          <>
            <strong>Opušteni mod:</strong> Prihvataju se lične karte i pasoši iz bilo koje države.
            Sistem čita podatke na engleskom i standardizuje polja.
          </>
        )}
      </div>

      {/* Search + Event Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Pretraži po imenu, prezimenu, broju dokumenta, emailu..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Event filter dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsEventDropdownOpen(!isEventDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 min-w-[200px]"
          >
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">
              {selectedEvents.length > 0
                ? `${selectedEvents.length} event${selectedEvents.length > 1 ? "a" : ""}`
                : "Svi eventi"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
          {isEventDropdownOpen && (
            <div className="absolute top-full mt-1 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-72 overflow-hidden flex flex-col">
              <div className="p-2 border-b">
                <input
                  type="text"
                  value={eventSearchQuery}
                  onChange={(e) => setEventSearchQuery(e.target.value)}
                  placeholder="Pretraži event..."
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none"
                />
              </div>
              <div className="overflow-y-auto flex-1 p-1">
                {selectedEvents.length > 0 && (
                  <button
                    onClick={() => setSelectedEvents([])}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    Očisti filter
                  </button>
                )}
                {filteredEvents.map((ev) => {
                  const selected = selectedEvents.includes(ev);
                  return (
                    <button
                      key={ev}
                      onClick={() =>
                        setSelectedEvents((prev) =>
                          selected ? prev.filter((e) => e !== ev) : [...prev, ev]
                        )
                      }
                      className={`w-full text-left px-3 py-1.5 text-xs rounded flex items-center gap-2 ${
                        selected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate">{ev}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 mb-3">
        {isLoading ? "Učitavanje..." : `${totalCount} rezultat${totalCount !== 1 ? "a" : ""}`}
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Kupac</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Event</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Tip dok.</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Broj dok.</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">
                  Prezime (OCR)
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Ime (OCR)</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Pol</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Važi do</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Promjena imena</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Datum</th>
                <th className="text-center px-3 py-2.5 font-semibold text-gray-600">Dok.</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : allRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">
                    Nema rezultata
                  </td>
                </tr>
              ) : (
                allRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 flex items-center gap-1">
                        {row.customerName || "—"}
                        {row.nameChangeUsed && (
                          <ArrowRightLeft className="w-3 h-3 text-purple-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-gray-400 text-[10px]">
                        {row["Customer Email"] || ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[150px] truncate">
                      {row.eventName || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.document_type ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            row.document_type === "id_card"
                              ? "bg-blue-100 text-blue-700"
                              : row.document_type === "passport"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {docTypeLabel(row.document_type)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">
                      {row.document_number || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {row.doc_surname || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {row.doc_given_names || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.doc_sex ? sexLabel(row.doc_sex) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.doc_expiry_date || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {row.nameChangeUsed ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                            <ArrowRightLeft className="w-3 h-3" />
                            {row.nameChangeData?.type === "minor" ? "Maloljetnik" : "Promjena"}
                          </span>
                          {row.originalCustomerName && (
                            <div className="text-[10px] text-gray-400">
                              Prije: <span className="font-medium text-gray-500">{row.originalCustomerName}</span>
                            </div>
                          )}
                          {row.nameChangeData?.type === "minor" && (
                            <div className="text-[10px] text-amber-600 space-y-0.5">
                              {row.nameChangeData?.guardian ? (
                                <>
                                  <div className="flex items-center gap-0.5">
                                    <User className="w-2.5 h-2.5" />
                                    Roditelj: {row.nameChangeData.guardian.givenNames} {row.nameChangeData.guardian.surname}
                                  </div>
                                  <div className="text-amber-500 font-mono">
                                    {row.nameChangeData.guardian.documentType === "passport" ? "Pasoš" : "LK"}: {row.nameChangeData.guardian.documentNumber || "—"}
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-0.5 text-gray-400">
                                  <User className="w-2.5 h-2.5" />
                                  Roditelj: nema podataka
                                </div>
                              )}
                              {row.nameChangeData?.childName && (
                                <div className="flex items-center gap-0.5 text-green-600">
                                  <Baby className="w-2.5 h-2.5" />
                                  Dijete: {row.nameChangeData.childName}
                                </div>
                              )}
                            </div>
                          )}
                          {row.nameChangeData?.type === "adult" && row.nameChangeData?.document && (
                            <div className="text-[10px] text-blue-600 space-y-0.5">
                              <div>
                                Novo ime: {row.nameChangeData.document.givenNames} {row.nameChangeData.document.surname}
                              </div>
                              <div className="font-mono text-blue-500">
                                {row.nameChangeData.document.documentType === "passport" ? "Pasoš" : "LK"}: {row.nameChangeData.document.documentNumber || "—"}
                              </div>
                            </div>
                          )}
                          {row.nameChangedAt && (
                            <div className="text-[10px] text-gray-400">
                              {new Date(row.nameChangedAt).toLocaleDateString("sr-Latn-ME", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleDateString("sr-Latn-ME", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.document_image_url ? (
                        <button
                          onClick={() => setPreviewImage(row.document_image_url)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Pogledaj dokument"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {hasNextPage && (
          <div className="flex justify-center py-3 border-t border-gray-100">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {isFetchingNextPage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Učitaj još"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Image preview modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-2">
          <div className="relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {previewImage && (
              <img
                src={previewImage}
                alt="Dokument"
                className="w-full max-h-[80vh] object-contain rounded-lg bg-gray-100"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DokumentKupaca;
