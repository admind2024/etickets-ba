import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Trash2,
  Edit,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Receipt,
  Euro,
  QrCode,
  RefreshCw,
  Ticket,
  Save,
  Copy,
  Download,
  Filter,
  ChevronDown,
  Check,
  Send,
  ExternalLink,
  Mail,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useQRKarteAdmin,
  useUpdateKarta,
  useDeleteKarta,
  useCloneKarta,
  useKarteStats,
  useEventsWithCounts,
  QRKarta,
} from "@/hooks/useAboutEventsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const isUsed = (k: QRKarta) => k.used === "true" || k.isUsed === "true";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const PregledKarata = () => {
  const [searchInput, setSearchInput] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [editingKarta, setEditingKarta] = useState<QRKarta | null>(null);
  const [editForm, setEditForm] = useState<Partial<QRKarta>>({});
  const [deletingKarta, setDeletingKarta] = useState<QRKarta | null>(null);
  const [cloningKarta, setCloningKarta] = useState<QRKarta | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sendingKarta, setSendingKarta] = useState<QRKarta | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendDialogTickets, setSendDialogTickets] = useState<QRKarta[]>([]);
  const [isLoadingSendTickets, setIsLoadingSendTickets] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allResultsSelected, setAllResultsSelected] = useState(false);
  const [isMassSending, setIsMassSending] = useState(false);
  const [massSendProgress, setMassSendProgress] = useState({ sent: 0, total: 0, errors: 0 });

  const filters = useMemo(() => ({
    search: debouncedSearch || undefined,
    events: selectedEvents.length > 0 ? selectedEvents : undefined,
  }), [debouncedSearch, selectedEvents]);

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useQRKarteAdmin(
    (debouncedSearch.trim() || selectedEvents.length > 0) ? filters : undefined
  );
  const { data: stats } = useKarteStats();
  const { data: events } = useEventsWithCounts();
  const updateKarta = useUpdateKarta();
  const deleteKarta = useDeleteKarta();
  const cloneKarta = useCloneKarta();

  const allKarte = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((p) => p.data);
  }, [data]);

  const totalCount = data?.pages?.[0]?.count || 0;

  // Preračunaj broj unikatnih sesija (= emailova) od selektovanih karata
  const uniqueSessionCount = useMemo(() => {
    if (selectedIds.size === 0) return 0;
    const sessions = new Set<string>();
    for (const k of allKarte) {
      if (!selectedIds.has(k.id)) continue;
      if (!k["Customer Email"]) continue;
      const sid = k.sessionId && !k.sessionId.startsWith("clone_") ? k.sessionId : "";
      const key = sid || `fallback_${k["Customer Email"]}_${k.eventName}`;
      sessions.add(key);
    }
    return sessions.size;
  }, [selectedIds, allKarte]);

  // Kad se otvori send popup, dohvati SVE karte iz baze za tog kupca
  useEffect(() => {
    if (!sendingKarta) {
      setSendDialogTickets([]);
      return;
    }
    const fetchAllTickets = async () => {
      setIsLoadingSendTickets(true);
      try {
        if (sendingKarta.sessionId && !sendingKarta.sessionId.startsWith("clone_")) {
          const { data } = await supabase
            .from("QRKarte")
            .select("id, eventName, eventId, eventDate, eventTime, Lokacija, seatId, sectionLabel, entrance, customerName, price, View, viewQuality, status, isUsed, ticketId, qrCodeRaw, \"QR Code\", categoryLabel, sessionId, checkTime, category, Pdfurl, \"Customer Email\", Purchasedate, purchaseTime, \"order number\", totalPrice, serviceFee, Hide, manualHide, created_at, Emailsent, customerPhone, salesChannel, Valuta, insurance, insurancePrice, document_type")
            .eq("sessionId", sendingKarta.sessionId)
            .order("created_at", { ascending: true });
          if (data && data.length > 0) {
            setSendDialogTickets(data as unknown as QRKarta[]);
            setIsLoadingSendTickets(false);
            return;
          }
        }
        const { data } = await supabase
          .from("QRKarte")
          .select("id, eventName, eventId, eventDate, eventTime, Lokacija, seatId, sectionLabel, entrance, customerName, price, View, viewQuality, status, isUsed, ticketId, qrCodeRaw, \"QR Code\", categoryLabel, sessionId, checkTime, category, Pdfurl, \"Customer Email\", Purchasedate, purchaseTime, \"order number\", totalPrice, serviceFee, Hide, manualHide, created_at, Emailsent, customerPhone, salesChannel, Valuta, insurance, insurancePrice, document_type")
          .eq("Customer Email", sendingKarta["Customer Email"])
          .eq("eventName", sendingKarta.eventName)
          .order("created_at", { ascending: true });
        setSendDialogTickets((data as unknown as QRKarta[]) || []);
      } catch (e) {
        setSendDialogTickets([sendingKarta]);
      }
      setIsLoadingSendTickets(false);
    };
    fetchAllTickets();
  }, [sendingKarta]);

  const toggleUsed = async (k: QRKarta) => {
    const newVal = isUsed(k) ? "false" : "true";
    await updateKarta.mutateAsync({ id: k.id, updates: { used: newVal, isUsed: newVal } });
  };

  const handleDelete = async () => {
    if (deletingKarta) {
      await deleteKarta.mutateAsync(deletingKarta.id);
      setDeletingKarta(null);
    }
  };

  const handleClone = async () => {
    if (cloningKarta) {
      await cloneKarta.mutateAsync(cloningKarta);
      setCloningKarta(null);
    }
  };

  const getSessionTickets = (sourceKarta: QRKarta): QRKarta[] => {
    if (sendDialogTickets.length > 0) return sendDialogTickets;
    if (sourceKarta.sessionId && !sourceKarta.sessionId.startsWith("clone_")) {
      const bySession = allKarte.filter((k) => k.sessionId === sourceKarta.sessionId);
      if (bySession.length > 1) return bySession;
    }
    return allKarte.filter(
      (k) =>
        k["Customer Email"] === sourceKarta["Customer Email"] &&
        k.eventName === sourceKarta.eventName
    );
  };

  const isFscgTicket = (k: QRKarta) => !!k.document_type;

  const buildTicketLink = (k: QRKarta) =>
    isFscgTicket(k)
      ? `https://etickets.ba/fscg-karta?ticketId=${k.ticketId}`
      : `https://etickets.ba/tickets?ticketId=${k.ticketId}`;

  const buildSessionLink = (sessionId: string, k: QRKarta) =>
    isFscgTicket(k)
      ? `https://etickets.ba/fscg-karta?sessionId=${sessionId}`
      : `https://etickets.ba/tickets?sessionId=${sessionId}`;

  const getRealSessionId = (sourceKarta: QRKarta): string | null => {
    const tickets = getSessionTickets(sourceKarta);
    const realSession = tickets.find((t) => t.sessionId && !t.sessionId.startsWith("clone_"));
    return realSession?.sessionId || sourceKarta.sessionId || null;
  };

  const copySessionLinks = (k: QRKarta) => {
    const sessionTickets = getSessionTickets(k);
    if (sessionTickets.length === 0) {
      navigator.clipboard.writeText(buildTicketLink(k));
      toast.success("Link karte kopiran");
      return;
    }

    const realSessionId = getRealSessionId(k);
    let text = `Karte za: ${k.eventName}\n`;
    text += `Kupac: ${k.customerName}\n`;
    if (realSessionId) {
      text += `Link za sve karte: ${buildSessionLink(realSessionId, k)}\n\n`;
    }
    text += `Pojedinačni linkovi (${sessionTickets.length}):\n`;
    sessionTickets.forEach((t, i) => {
      text += `${i + 1}. ${t.seatId || "Karta"} - ${buildTicketLink(t)}\n`;
    });

    navigator.clipboard.writeText(text);
    toast.success(`Kopirano ${sessionTickets.length} linkova`);
  };

  const handleSendEmail = async () => {
    if (!sendingKarta) return;
    setIsSendingEmail(true);

    try {
      const sessionTickets = getSessionTickets(sendingKarta);
      const realSessionId = getRealSessionId(sendingKarta);
      const viewUrl = realSessionId
        ? buildSessionLink(realSessionId, sendingKarta)
        : buildTicketLink(sendingKarta);

      const { data, error } = await supabase.functions.invoke("resend-tickets", {
        body: {
          customerEmail: sendingKarta["Customer Email"],
          customerName: sendingKarta.customerName,
          eventName: sendingKarta.eventName,
          sessionId: realSessionId || sendingKarta.sessionId,
          viewUrl,
          tickets: sessionTickets.map((t) => ({
            ticketId: t.ticketId,
            seatId: t.seatId,
            link: buildTicketLink(t),
          })),
        },
      });

      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      toast.success(`Email poslan na ${sendingKarta["Customer Email"]}`);
      setSendingKarta(null);
    } catch (e: any) {
      toast.error("Greška pri slanju: " + e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const toggleSelect = (id: string) => {
    setAllResultsSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setAllResultsSelected(false);
    if (selectedIds.size === allKarte.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allKarte.map((k) => k.id)));
    }
  };

  const selectAllResults = () => {
    setAllResultsSelected(true);
    setSelectedIds(new Set(allKarte.map((k) => k.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setAllResultsSelected(false);
  };

  const BATCH_SIZE = 25;

  // Šalje batch primaoca i vraća { sent, errors }
  const sendBatch = async (body: Record<string, any>): Promise<{ sent: number; errors: number }> => {
    const { data, error } = await supabase.functions.invoke("mass-reminder", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return { sent: data?.sent || 0, errors: data?.errors || 0 };
  };

  const handleMassSend = async () => {
    setIsMassSending(true);
    let totalSent = 0;
    let totalErrors = 0;

    try {
      if (allResultsSelected) {
        // Dohvati sve karte iz baze — edge funkcija sama grupiše, ali u batch-evima
        // Prvo dohvatimo broj kupaca iz baze pa šaljemo u batch-evima po offsetu
        setMassSendProgress({ sent: 0, total: 0, errors: 0 });

        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase.functions.invoke("mass-reminder", {
            body: {
              filters: {
                events: selectedEvents.length > 0 ? selectedEvents : undefined,
                search: debouncedSearch || undefined,
              },
              batchSize: BATCH_SIZE,
              offset,
            },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          const { sent = 0, errors: errCount = 0, total = 0 } = data || {};
          totalSent += sent;
          totalErrors += errCount;
          offset += BATCH_SIZE;
          hasMore = offset < total;

          setMassSendProgress({ sent: totalSent, total, errors: totalErrors });
        }
      } else {
        // Manualno selektovane karte — grupiši i šalji u batch-evima
        const selected = allKarte.filter((k) => selectedIds.has(k.id));
        if (selected.length === 0) return;

        // Grupiši po sessionId (unikatne sesije = unikatni emailovi)
        const groups = new Map<string, QRKarta[]>();
        for (const k of selected) {
          const email = k["Customer Email"];
          if (!email) continue;
          const sid = k.sessionId && !k.sessionId.startsWith("clone_") ? k.sessionId : "";
          const key = sid || `fallback_${email}_${k.eventName}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(k);
        }

        if (groups.size === 0) {
          toast.error("Nijedna selektovana karta nema email adresu");
          setIsMassSending(false);
          return;
        }

        const allRecipients = Array.from(groups.values()).map((tickets) => {
          const representative = tickets[0];
          const sessionId = tickets.find((t) => t.sessionId && !t.sessionId.startsWith("clone_"))?.sessionId || representative.sessionId;
          const viewUrl = sessionId && !sessionId.startsWith("clone_")
            ? buildSessionLink(sessionId, representative)
            : buildTicketLink(representative);
          return {
            customerEmail: representative["Customer Email"],
            customerName: representative.customerName,
            eventName: representative.eventName,
            sessionId: sessionId || representative.sessionId,
            viewUrl,
            tickets: tickets.map((t) => ({
              ticketId: t.ticketId,
              seatId: t.seatId,
              link: buildTicketLink(t),
            })),
          };
        });

        setMassSendProgress({ sent: 0, total: allRecipients.length, errors: 0 });

        // Šalji u batch-evima po BATCH_SIZE
        for (let i = 0; i < allRecipients.length; i += BATCH_SIZE) {
          const batch = allRecipients.slice(i, i + BATCH_SIZE);
          const result = await sendBatch({ recipients: batch });
          totalSent += result.sent;
          totalErrors += result.errors;
          setMassSendProgress({ sent: totalSent, total: allRecipients.length, errors: totalErrors });
        }
      }

      clearSelection();
      if (totalErrors === 0) {
        toast.success(`Uspješno poslano ${totalSent} emailova`);
      } else {
        toast.warning(`Poslano ${totalSent} emailova, ${totalErrors} grešaka`);
      }
    } catch (e: any) {
      toast.error("Greška pri slanju: " + e.message);
      if (totalSent > 0) {
        toast.info(`Prije greške poslano ${totalSent} emailova`);
      }
    } finally {
      setIsMassSending(false);
    }
  };

  const openEdit = (k: QRKarta) => {
    setEditingKarta(k);
    setEditForm({ ...k });
  };

  const saveEdit = async () => {
    if (editingKarta) {
      await updateKarta.mutateAsync({ id: editingKarta.id, updates: editForm });
      setEditingKarta(null);
    }
  };

  const formatPrice = (p: string | number | null | undefined) => {
    if (p === null || p === undefined || p === "") return "-";
    const n = typeof p === "string" ? parseFloat(p) : p;
    return isNaN(n) ? "-" : n.toFixed(2) + " €";
  };

  const toggleEventSelection = (eventName: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventName) ? prev.filter((e) => e !== eventName) : [...prev, eventName],
    );
  };

  const selectAllFiltered = () => {
    const filtered = events?.filter((e) => e.name.toLowerCase().includes(eventSearchQuery.toLowerCase())) || [];
    const filteredNames = filtered.map((e) => e.name);
    const allSelected = filteredNames.every((name) => selectedEvents.includes(name));

    if (allSelected) {
      setSelectedEvents((prev) => prev.filter((e) => !filteredNames.includes(e)));
    } else {
      setSelectedEvents((prev) => [...new Set([...prev, ...filteredNames])]);
    }
  };

  const handleExport = async () => {
    if (allKarte.length === 0) {
      toast.error("Nema podataka za export");
      return;
    }

    setIsExporting(true);
    try {
      const exportData = allKarte.map((k, index) => ({
        "R.br.": index + 1,
        Datum: k.created_at ? new Date(k.created_at).toLocaleDateString("de-DE") : "",
        "Ticket ID": k.ticketId || "",
        Događaj: k.eventName || "",
        "Ime kupca": k.customerName || "",
        Email: k["Customer Email"] || "",
        Telefon: k.customerPhone || "",
        Sjedište: k.seatId || "",
        Cijena: k.totalPrice ? parseFloat(k.totalPrice).toFixed(2) : "",
        Status: isUsed(k) ? "Iskorištena" : "Aktivna",
      }));

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(";"),
        ...exportData.map((row) =>
          headers
            .map((h) => {
              const val = (row as any)[h];
              if (typeof val === "string" && (val.includes(";") || val.includes('"') || val.includes("\n"))) {
                return `"${val.replace(/"/g, '""')}"`;
              }
              return val;
            })
            .join(";"),
        ),
      ].join("\n");

      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName =
        selectedEvents.length === 1
          ? `karte_${selectedEvents[0].replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
          : selectedEvents.length > 1
            ? `karte_${selectedEvents.length}_dogadjaja_${new Date().toISOString().slice(0, 10)}.csv`
            : `karte_${new Date().toISOString().slice(0, 10)}.csv`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exportovano ${allKarte.length} karata`);
    } catch (error: any) {
      toast.error("Greška pri exportu: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const getFilterButtonText = () => {
    if (selectedEvents.length === 0) return "Svi događaji";
    if (selectedEvents.length === 1) return selectedEvents[0];
    return `${selectedEvents.length} događaja izabrano`;
  };

  const isSearching = searchInput !== debouncedSearch || isFetching;

  if (error) {
    return (
      <div style={{ padding: 24, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ padding: 32, backgroundColor: "#fef2f2", borderRadius: 8, textAlign: "center" }}>
          <p style={{ color: "#dc2626", fontWeight: 600 }}>Greška: {(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
            }}
          >
            Pokušaj ponovo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>Pregled karata</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0" }}>
            Ukupno {stats?.total.toLocaleString() || 0} karata • {stats?.usedCount.toLocaleString() || 0} iskorišteno
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={16} /> Osvježi
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 16, backgroundColor: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ padding: 8, backgroundColor: "#dbeafe", borderRadius: 8 }}>
                <Ticket size={20} color="#2563eb" />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>{stats.total.toLocaleString()}</p>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Ukupno</p>
              </div>
            </div>
          </div>
          <div style={{ padding: 16, backgroundColor: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ padding: 8, backgroundColor: "#dcfce7", borderRadius: 8 }}>
                <Euro size={20} color="#16a34a" />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {stats.totalRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Promet</p>
              </div>
            </div>
          </div>
          <div style={{ padding: 16, backgroundColor: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ padding: 8, backgroundColor: "#e0e7ff", borderRadius: 8 }}>
                <CheckCircle size={20} color="#4f46e5" />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>{stats.usedCount.toLocaleString()}</p>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Iskorišteno</p>
              </div>
            </div>
          </div>
          <div style={{ padding: 16, backgroundColor: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ padding: 8, backgroundColor: "#ffedd5", borderRadius: 8 }}>
                <Receipt size={20} color="#ea580c" />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {stats.serviceFeeRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </p>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Service fee</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div style={{ marginBottom: 24, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 300px", maxWidth: 400 }}>
          <Search
            size={18}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
          />
          <input
            type="text"
            placeholder="Pretraži po imenu, emailu, telefonu, datumu (DD.MM.YYYY)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 44px",
              border: "2px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 15,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
          {isSearching && searchInput && (
            <Loader2
              size={18}
              className="animate-spin"
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#3b82f6" }}
            />
          )}
          {searchInput && !isSearching && (
            <button
              onClick={() => setSearchInput("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={18} color="#94a3b8" />
            </button>
          )}
        </div>

        {/* Event Filter Dropdown - Multi-select */}
        <div style={{ position: "relative", minWidth: 280 }} ref={dropdownRef}>
          <button
            onClick={() => setIsEventDropdownOpen(!isEventDropdownOpen)}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "2px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 15,
              outline: "none",
              backgroundColor: selectedEvents.length > 0 ? "#eff6ff" : "#fff",
              borderColor: selectedEvents.length > 0 ? "#3b82f6" : "#e2e8f0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
              <Filter size={18} color={selectedEvents.length > 0 ? "#3b82f6" : "#94a3b8"} />
              <span
                style={{
                  color: selectedEvents.length > 0 ? "#1e40af" : "#64748b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {getFilterButtonText()}
              </span>
              {selectedEvents.length > 1 && (
                <span
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 10,
                    flexShrink: 0,
                  }}
                >
                  {selectedEvents.length}
                </span>
              )}
            </div>
            <ChevronDown
              size={18}
              color="#94a3b8"
              style={{
                transform: isEventDropdownOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {isEventDropdownOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 10 }}
                onClick={() => {
                  setIsEventDropdownOpen(false);
                  setEventSearchQuery("");
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 20,
                  maxHeight: 420,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Search inside dropdown */}
                <div style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ position: "relative" }}>
                    <Search
                      size={15}
                      style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                    />
                    <input
                      type="text"
                      placeholder="Pretraži događaje..."
                      value={eventSearchQuery}
                      onChange={(e) => setEventSearchQuery(e.target.value)}
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 34px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                    {eventSearchQuery && (
                      <button
                        onClick={() => setEventSearchQuery("")}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                        }}
                      >
                        <X size={14} color="#94a3b8" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <button
                    onClick={selectAllFiltered}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#3b82f6",
                      fontWeight: 500,
                      padding: "2px 4px",
                    }}
                  >
                    {(() => {
                      const filtered = events?.filter((e) => e.name.toLowerCase().includes(eventSearchQuery.toLowerCase())) || [];
                      const allSelected = filtered.length > 0 && filtered.every((e) => selectedEvents.includes(e.name));
                      return allSelected ? "Poništi sve" : "Izaberi sve";
                    })()}
                  </button>
                  {selectedEvents.length > 0 && (
                    <button
                      onClick={() => setSelectedEvents([])}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#ef4444",
                        fontWeight: 500,
                        padding: "2px 4px",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <X size={12} />
                      Očisti ({selectedEvents.length})
                    </button>
                  )}
                </div>

                {/* Scrollable event list */}
                <div style={{ overflowY: "auto", maxHeight: 300 }}>
                  {(() => {
                    const filtered = events?.filter((e) => e.name.toLowerCase().includes(eventSearchQuery.toLowerCase())) || [];

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                          Nema rezultata za "{eventSearchQuery}"
                        </div>
                      );
                    }

                    return filtered.map((event) => {
                      const isSelected = selectedEvents.includes(event.name);
                      return (
                        <button
                          key={event.name}
                          onClick={() => toggleEventSelection(event.name)}
                          style={{
                            width: "100%",
                            padding: "10px 16px",
                            border: "none",
                            backgroundColor: isSelected ? "#eff6ff" : "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: 14,
                            color: isSelected ? "#1e40af" : "#334155",
                            borderBottom: "1px solid #f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              border: isSelected ? "2px solid #3b82f6" : "2px solid #cbd5e1",
                              backgroundColor: isSelected ? "#3b82f6" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition: "all 0.15s",
                            }}
                          >
                            {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                          </div>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {event.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: isSelected ? "#1e40af" : "#64748b",
                              backgroundColor: isSelected ? "#dbeafe" : "#f1f5f9",
                              padding: "2px 8px",
                              borderRadius: 10,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            {event.count.toLocaleString()}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Selected events tags */}
        {selectedEvents.length > 0 && selectedEvents.length <= 5 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {selectedEvents.map((eventName) => (
              <span
                key={eventName}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 10px",
                  backgroundColor: "#dbeafe",
                  color: "#1e40af",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  maxWidth: 180,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eventName}</span>
                <button
                  onClick={() => toggleEventSelection(eventName)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}
                >
                  <X size={14} color="#1e40af" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Clear filters */}
        {(searchInput || selectedEvents.length > 0) && (
          <button
            onClick={() => {
              setSearchInput("");
              setSelectedEvents([]);
            }}
            style={{
              padding: "12px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              backgroundColor: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              color: "#64748b",
            }}
          >
            <X size={16} />
            Očisti filtere
          </button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div style={{ padding: 48, textAlign: "center" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "#3b82f6" }} />
          <p style={{ color: "#64748b", marginTop: 12 }}>Učitavam...</p>
        </div>
      ) : allKarte.length === 0 && !debouncedSearch.trim() && selectedEvents.length === 0 ? (
        <div
          style={{
            padding: 48,
            backgroundColor: "#fff",
            borderRadius: 12,
            textAlign: "center",
            border: "2px dashed #e2e8f0",
          }}
        >
          <Search size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 18, color: "#64748b", margin: 0 }}>Unesite pojam za pretragu ili izaberite događaj</p>
          <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>
            Pretražite po imenu kupca, email adresi, broju telefona ili filtrirajte po događaju
          </p>
        </div>
      ) : allKarte.length === 0 ? (
        <div
          style={{
            padding: 48,
            backgroundColor: "#fff",
            borderRadius: 12,
            textAlign: "center",
            border: "1px solid #e2e8f0",
          }}
        >
          <p style={{ fontSize: 16, color: "#64748b" }}>Nema rezultata</p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
              Pronađeno <strong>{totalCount.toLocaleString()}</strong> rezultata
              {allKarte.length < totalCount && ` (učitano ${allKarte.length})`}
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                padding: "8px 16px",
                backgroundColor: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: isExporting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 500,
                opacity: isExporting ? 0.7 : 1,
              }}
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Preuzmi Excel (CSV)
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th style={{ padding: "12px 8px 12px 16px", borderBottom: "1px solid #e2e8f0", width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allKarte.length > 0 && selectedIds.size === allKarte.length}
                      onChange={toggleSelectAll}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#3b82f6" }}
                      title="Selektuj sve"
                    />
                  </th>
                  {[
                    "Datum",
                    "Ticket ID",
                    "Session ID",
                    "Događaj",
                    "Kupac",
                    "Email",
                    "Telefon",
                    "Sjedište",
                    "Cijena",
                    "Status",
                    "Akcije",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#475569",
                        borderBottom: "1px solid #e2e8f0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allKarte.map((k) => (
                  <tr
                    key={k.id}
                    style={{
                      backgroundColor: isUsed(k) ? "#f0fdf4" : "#fff",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <td style={{ padding: "12px 8px 12px 16px", width: 36 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(k.id)}
                        onChange={() => toggleSelect(k.id)}
                        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#3b82f6" }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>
                      {k.created_at ? new Date(k.created_at).toLocaleDateString("de-DE") : "-"}
                      <br />
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        {k.created_at
                          ? new Date(k.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "monospace", color: "#334155" }}>
                      {k.ticketId || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: "#94a3b8",
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                      title={k.sessionId || "Nema sessionId"}
                      onClick={() => {
                        if (k.sessionId) {
                          navigator.clipboard.writeText(k.sessionId);
                          toast.success("Session ID kopiran!");
                        }
                      }}
                    >
                      {k.sessionId || <span style={{ color: "#ef4444", fontWeight: 600 }}>NEMA</span>}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "#0f172a",
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={k.eventName}
                    >
                      {k.eventName || "-"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                      {k.customerName || "-"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b" }}>
                      {k["Customer Email"] || "-"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b" }}>{k.customerPhone || "-"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#334155", fontWeight: 500 }}>
                      {k.seatId || "-"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#2563eb" }}>
                      {formatPrice(k.totalPrice)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          backgroundColor: isUsed(k) ? "#dcfce7" : "#f1f5f9",
                          color: isUsed(k) ? "#166534" : "#475569",
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {isUsed(k) ? "Iskorištena" : "Aktivna"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => openEdit(k)}
                          style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                          title="Uredi"
                        >
                          <Edit size={15} color="#64748b" />
                        </button>
                        <button
                          onClick={() => setCloningKarta(k)}
                          style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                          title="Dodaj istu kartu"
                        >
                          <Copy size={15} color="#8b5cf6" />
                        </button>
                        <button
                          onClick={() => toggleUsed(k)}
                          style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                          title={isUsed(k) ? "Poništi" : "Validiraj"}
                        >
                          {isUsed(k) ? (
                            <XCircle size={15} color="#f97316" />
                          ) : (
                            <CheckCircle size={15} color="#22c55e" />
                          )}
                        </button>
                        {k["QR Code"] && (
                          <a
                            href={k["QR Code"]}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: 6, display: "flex" }}
                            title="QR"
                          >
                            <QrCode size={15} color="#64748b" />
                          </a>
                        )}
                        {k.fiscalInvoiceUrl && (
                          <a
                            href={k.fiscalInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: 6, display: "flex" }}
                            title="Račun"
                          >
                            <Receipt size={15} color="#2563eb" />
                          </a>
                        )}
                        <button
                          onClick={() => setSendingKarta(k)}
                          style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                          title="Pošalji sve karte kupcu"
                        >
                          <Send size={15} color="#059669" />
                        </button>
                        <button
                          onClick={() => copySessionLinks(k)}
                          style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                          title="Kopiraj linkove svih karata"
                        >
                          <ExternalLink size={15} color="#6366f1" />
                        </button>
                        <button
                          onClick={() => setDeletingKarta(k)}
                          style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                          title="Obriši"
                        >
                          <Trash2 size={15} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasNextPage && (
            <div style={{ padding: 16, textAlign: "center", borderTop: "1px solid #e2e8f0" }}>
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
                {isFetchingNextPage
                  ? "Učitavam..."
                  : `Učitaj još (${(totalCount - allKarte.length).toLocaleString()} preostalo)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating mass action bar */}
      {(selectedIds.size > 0 || allResultsSelected) && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#1e293b",
            color: "#fff",
            padding: "14px 24px",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            zIndex: 1000,
            fontSize: 14,
            maxWidth: "90vw",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600 }}>
              {allResultsSelected
                ? `Svih ${totalCount.toLocaleString()} karata selektovano`
                : <>
                    {selectedIds.size} {selectedIds.size === 1 ? "karta" : selectedIds.size < 5 ? "karte" : "karata"}
                    <span style={{ color: "#94a3b8", fontWeight: 400, marginLeft: 4 }}>
                      → {uniqueSessionCount} {uniqueSessionCount === 1 ? "email" : "emailova"}
                    </span>
                  </>}
            </span>
            {/* Ponudi "selektuj sve iz baze" ako su selektovani svi učitani ali ima još u bazi */}
            {!allResultsSelected && selectedIds.size === allKarte.length && totalCount > allKarte.length && (
              <>
                <div style={{ width: 1, height: 24, backgroundColor: "#475569" }} />
                <button
                  onClick={selectAllResults}
                  style={{
                    padding: "6px 14px",
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Selektuj svih {totalCount.toLocaleString()} rezultata
                </button>
              </>
            )}
            <div style={{ width: 1, height: 24, backgroundColor: "#475569" }} />
            <button
              onClick={clearSelection}
              style={{
                padding: "6px 14px",
                backgroundColor: "#334155",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Poništi
            </button>
            <button
              onClick={handleMassSend}
              disabled={isMassSending}
              style={{
                padding: "8px 20px",
                backgroundColor: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: isMassSending ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: isMassSending ? 0.8 : 1,
              }}
            >
              {isMassSending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Šaljem {massSendProgress.sent}/{massSendProgress.total}...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Pošalji podsjetnik
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal - detaljni sa svim poljima */}
      <Dialog open={!!editingKarta} onOpenChange={() => setEditingKarta(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "#fff" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#0f172a" }}>Uredi kartu - {editingKarta?.ticketId}</DialogTitle>
          </DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "16px 0" }}>
            {[
              { label: "Ticket ID", key: "ticketId" },
              { label: "Order Number", key: "order number" },
              { label: "Session ID", key: "sessionId" },
              { label: "Ime kupca", key: "customerName" },
              { label: "Email", key: "Customer Email" },
              { label: "Telefon", key: "customerPhone" },
              { label: "Spol", key: "customerGender" },
              { label: "Grad", key: "city" },
              { label: "Država", key: "country" },
              { label: "Događaj", key: "eventName" },
              { label: "Event ID", key: "eventId" },
              { label: "Datum događaja", key: "eventDate" },
              { label: "Vrijeme događaja", key: "eventTime" },
              { label: "Lokacija", key: "Lokacija" },
              { label: "Sjedište", key: "seatId" },
              { label: "Kategorija", key: "category" },
              { label: "Section Label", key: "sectionLabel" },
              { label: "Ulaz", key: "entrance" },
              { label: "View", key: "View" },
              { label: "View Quality", key: "viewQuality" },
              { label: "Cijena", key: "price" },
              { label: "Service Fee", key: "serviceFee" },
              { label: "Ukupna cijena", key: "totalPrice" },
              { label: "Valuta", key: "Valuta" },
              { label: "Datum kupovine", key: "Purchasedate" },
              { label: "Vrijeme kupovine", key: "purchaseTime" },
              { label: "Sales Channel", key: "salesChannel" },
              { label: "Validation Count", key: "validationCount" },
              { label: "Card Brand", key: "cardBrand" },
              { label: "Card Last 4", key: "cardLast4" },
              { label: "Card Country", key: "cardCountry" },
              { label: "Card Issuer", key: "cardIssuer" },
              { label: "QR Code Raw", key: "qrCodeRaw" },
              { label: "QR Code URL", key: "QR Code" },
              { label: "Fiscal Invoice URL", key: "fiscalInvoiceUrl" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                  {label}
                </label>
                <input
                  type="text"
                  value={(editForm as any)[key] || ""}
                  onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 8,
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    color: "#0f172a",
                    backgroundColor: "#fff",
                  }}
                />
              </div>
            ))}

            {/* Status dropdown */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Status
              </label>
              <select
                value={editForm.status || ""}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                style={{
                  width: "100%",
                  padding: 8,
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  color: "#0f172a",
                  backgroundColor: "#fff",
                }}
              >
                <option value="active">active</option>
                <option value="cancelled">cancelled</option>
                <option value="refunded">refunded</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                gap: 24,
                paddingTop: 8,
                borderTop: "1px solid #e2e8f0",
                marginTop: 8,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editForm.used === "true" || editForm.isUsed === "true"}
                  onChange={(e) => {
                    const v = e.target.checked ? "true" : "false";
                    setEditForm({ ...editForm, used: v, isUsed: v });
                  }}
                />
                <span style={{ fontSize: 14, color: "#334155" }}>Iskorištena</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editForm.isFiscalized === "true"}
                  onChange={(e) => setEditForm({ ...editForm, isFiscalized: e.target.checked ? "true" : "false" })}
                />
                <span style={{ fontSize: 14, color: "#334155" }}>Fiskalizovano</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editForm.termsOfServiceAccepted === true}
                  onChange={(e) => setEditForm({ ...editForm, termsOfServiceAccepted: e.target.checked })}
                />
                <span style={{ fontSize: 14, color: "#334155" }}>Terms prihvaćeni</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setEditingKarta(null)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#f1f5f9",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                color: "#334155",
                fontWeight: 500,
              }}
            >
              Odustani
            </button>
            <button
              onClick={saveEdit}
              disabled={updateKarta.isPending}
              style={{
                padding: "10px 20px",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 500,
              }}
            >
              {updateKarta.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Sačuvaj
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingKarta} onOpenChange={() => setDeletingKarta(null)}>
        <AlertDialogContent style={{ backgroundColor: "#fff" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši kartu?</AlertDialogTitle>
            <AlertDialogDescription>Ova akcija se ne može poništiti.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ backgroundColor: "#ef4444" }}>
              {deleteKarta.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Dialog */}
      <AlertDialog open={!!cloningKarta} onOpenChange={() => setCloningKarta(null)}>
        <AlertDialogContent style={{ backgroundColor: "#fff", maxWidth: 500 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Dodaj novu kartu?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p style={{ marginBottom: 16 }}>Kreiraće se nova karta sa sljedećim podacima:</p>
                <div style={{ backgroundColor: "#f8fafc", padding: 16, borderRadius: 8, fontSize: 14 }}>
                  <p style={{ margin: "0 0 8px" }}><strong>Događaj:</strong> {cloningKarta?.eventName}</p>
                  <p style={{ margin: "0 0 8px" }}><strong>Kupac:</strong> {cloningKarta?.customerName}</p>
                  <p style={{ margin: "0 0 8px" }}><strong>Email:</strong> {cloningKarta?.["Customer Email"]}</p>
                  <p style={{ margin: "0 0 8px" }}><strong>Telefon:</strong> {cloningKarta?.customerPhone}</p>
                  <p style={{ margin: "0 0 8px" }}><strong>Sjedište:</strong> {cloningKarta?.seatId}</p>
                  <p style={{ margin: "0 0 8px" }}><strong>Cijena:</strong> {cloningKarta?.totalPrice} €</p>
                  <p style={{ margin: 0 }}>
                    <strong>Session ID:</strong>{" "}
                    {cloningKarta?.sessionId ? (
                      <span style={{ fontFamily: "monospace", fontSize: 12 }}>...{cloningKarta.sessionId.slice(-8)}</span>
                    ) : (
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>NEMA - nova karta neće biti vidljiva kupcu!</span>
                    )}
                  </p>
                </div>
                <p style={{ marginTop: 16, fontSize: 13, color: "#64748b" }}>
                  Nova karta će dobiti novi Ticket ID, novi QR kod, današnji datum i neće biti fiskalizovana.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={handleClone} style={{ backgroundColor: "#8b5cf6" }}>
              {cloneKarta.isPending ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />} Dodaj kartu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Tickets Dialog */}
      <Dialog open={!!sendingKarta} onOpenChange={() => setSendingKarta(null)}>
        <DialogContent style={{ backgroundColor: "#fff", maxWidth: 600, overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Send size={18} color="#059669" /> Pošalji karte kupcu
            </DialogTitle>
          </DialogHeader>

          {sendingKarta && (() => {
            if (isLoadingSendTickets) {
              return (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 32 }}>
                  <Loader2 size={20} className="animate-spin" /> Učitavam karte...
                </div>
              );
            }
            const sessionTickets = getSessionTickets(sendingKarta);
            const realSessionId = getRealSessionId(sendingKarta);
            const sessionLink = realSessionId
              ? buildSessionLink(realSessionId, sendingKarta)
              : buildTicketLink(sendingKarta);

            return (
              <div style={{ overflow: "hidden" }}>
                {/* Customer info */}
                <div style={{ backgroundColor: "#f8fafc", padding: 16, borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
                  <p style={{ margin: "0 0 6px" }}><strong>Kupac:</strong> {sendingKarta.customerName}</p>
                  <p style={{ margin: "0 0 6px" }}><strong>Email:</strong> {sendingKarta["Customer Email"]}</p>
                  <p style={{ margin: "0 0 6px" }}><strong>Događaj:</strong> {sendingKarta.eventName}</p>
                  <p style={{ margin: 0 }}>
                    <strong>Session ID:</strong>{" "}
                    {realSessionId ? (
                      <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                        ...{realSessionId.slice(-8)}
                        {realSessionId !== sendingKarta.sessionId && (
                          <span style={{ color: "#059669", marginLeft: 6 }}>(originalni)</span>
                        )}
                      </span>
                    ) : sendingKarta.sessionId?.startsWith("clone_") ? (
                      <span style={{ color: "#f59e0b", fontWeight: 600 }}>Klonirani: ...{sendingKarta.sessionId.slice(-8)}</span>
                    ) : (
                      <span style={{ color: "#ef4444" }}>NEMA</span>
                    )}
                  </p>
                </div>

                {/* All session link */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#334155" }}>
                    Link za sve karte ({sessionTickets.length}):
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                    <input
                      readOnly
                      value={sessionLink}
                      style={{ flex: 1, minWidth: 0, padding: "8px 12px", fontSize: 12, fontFamily: "monospace", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6 }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(sessionLink);
                        toast.success("Link kopiran!");
                      }}
                      style={{ padding: "8px 12px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500, flexShrink: 0 }}
                    >
                      Kopiraj
                    </button>
                  </div>
                </div>

                {/* Individual ticket links */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#334155" }}>
                    Pojedinačni linkovi:
                  </p>
                  <div style={{ maxHeight: 200, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 6 }}>
                    {sessionTickets.map((t, i) => (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          background: "#f8fafc",
                          borderRadius: 6,
                          border: "1px solid #e2e8f0",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#6366f1", whiteSpace: "nowrap", flexShrink: 0 }}>
                          Karta {i + 1}
                        </span>
                        <span style={{ color: "#64748b", whiteSpace: "nowrap", flexShrink: 0 }}>{t.seatId || ""}</span>
                        <span style={{ flex: 1, fontFamily: "monospace", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                          {buildTicketLink(t)}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(buildTicketLink(t));
                            toast.success(`Link karte ${i + 1} kopiran!`);
                          }}
                          style={{ padding: "4px 8px", background: "#e2e8f0", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, whiteSpace: "nowrap", flexShrink: 0 }}
                        >
                          Kopiraj
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copy all links button */}
                <button
                  onClick={() => copySessionLinks(sendingKarta)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#6366f1",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <ExternalLink size={16} /> Kopiraj sve linkove
                </button>

                {/* Send email button */}
                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !sendingKarta["Customer Email"]}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: !sendingKarta["Customer Email"] ? "#94a3b8" : "#059669",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: !sendingKarta["Customer Email"] ? "not-allowed" : "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: isSendingEmail ? 0.7 : 1,
                  }}
                >
                  {isSendingEmail ? (
                    <><Loader2 size={16} className="animate-spin" /> Šaljem...</>
                  ) : (
                    <><Mail size={16} /> Pošalji email sa svim kartama</>
                  )}
                </button>
                {!sendingKarta["Customer Email"] && (
                  <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4, textAlign: "center" }}>
                    Kupac nema email adresu
                  </p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PregledKarata;
