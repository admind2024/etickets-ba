import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Users,
  Lock,
  Unlock,
  UserX,
  ChevronDown,
  ChevronRight,
  Armchair,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useSectionSummary,
  useEventSeats,
  useBulkCreateSeats,
  useUpdateSeatsByRange,
  useDeleteSectionSeats,
  type SectionAvailability,
  type StadiumSeat,
  type SeatStatus,
} from "@/hooks/useStadiumSeats";
import { useQuery } from "@tanstack/react-query";

// ═══════════════════════════════════════════════════════════════
// TYPES & HELPERS
// ═══════════════════════════════════════════════════════════════

interface MatchEvent {
  id: string;
  name: string;
  date: string;
  venue?: string;
}

const STATUS_LABELS: Record<SeatStatus, string> = {
  available: "Slobodno",
  reserved: "Rezervisano",
  sold: "Prodato",
  away_fans: "Gostujući",
  blocked: "Blokirano",
};

const STATUS_COLORS: Record<SeatStatus, string> = {
  available: "bg-green-100 text-green-800",
  reserved: "bg-yellow-100 text-yellow-800",
  sold: "bg-blue-100 text-blue-800",
  away_fans: "bg-orange-100 text-orange-800",
  blocked: "bg-red-100 text-red-800",
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const AdminStadiumSeats = () => {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [actionSection, setActionSection] = useState<string>("");
  const [deleteSection, setDeleteSection] = useState<string>("");

  // Add seats form
  const [addForm, setAddForm] = useState({
    section: "",
    rowType: "letters" as "letters" | "numbers",
    rowStart: "A",
    rowEnd: "Z",
    seatsPerRow: 30,
  });

  // Action form (mark as away_fans, blocked, available)
  const [actionForm, setActionForm] = useState({
    action: "away_fans" as SeatStatus,
    rowStart: "",
    rowEnd: "",
    allRows: true,
  });

  // ─── Queries ───
  const { data: matchEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["match-events-for-seats"],
    queryFn: async (): Promise<MatchEvent[]> => {
      const { data, error } = await supabase
        .from("AboutEvents")
        .select("id, name, date, venue")
        .eq("is_match", true)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []) as MatchEvent[];
    },
    staleTime: 60000,
  });

  const { data: sectionSummary = [], isLoading: loadingSummary } = useSectionSummary(
    selectedEventId || undefined,
  );

  const { data: sectionSeats = [], isLoading: loadingSeats } = useEventSeats(
    expandedSection && selectedEventId ? selectedEventId : undefined,
  );

  // ─── Mutations ───
  const bulkCreateMutation = useBulkCreateSeats();
  const updateByRangeMutation = useUpdateSeatsByRange();
  const deleteSectionMutation = useDeleteSectionSeats();

  // ─── Computed ───
  const selectedEvent = matchEvents.find((e) => e.id === selectedEventId);

  const totalStats = useMemo(() => {
    return sectionSummary.reduce(
      (acc, s) => ({
        total: acc.total + s.total,
        available: acc.available + s.available,
        reserved: acc.reserved + s.reserved,
        sold: acc.sold + s.sold,
        away_fans: acc.away_fans + s.away_fans,
        blocked: acc.blocked + s.blocked,
      }),
      { total: 0, available: 0, reserved: 0, sold: 0, away_fans: 0, blocked: 0 },
    );
  }, [sectionSummary]);

  const expandedSectionSeats = useMemo(() => {
    if (!expandedSection) return [];
    return sectionSeats.filter((s) => s.section === expandedSection);
  }, [sectionSeats, expandedSection]);

  // Group expanded section seats by row
  const seatsByRow = useMemo(() => {
    const groups: Record<string, StadiumSeat[]> = {};
    expandedSectionSeats.forEach((seat) => {
      if (!groups[seat.row]) groups[seat.row] = [];
      groups[seat.row].push(seat);
    });
    // Sort rows
    return Object.entries(groups).sort(([a], [b]) => {
      const numA = parseInt(a), numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [expandedSectionSeats]);

  // ─── Handlers ───

  const handleAddSeats = async () => {
    if (!selectedEventId || !addForm.section.trim()) {
      toast.error("Unesite naziv sekcije");
      return;
    }

    try {
      const count = await bulkCreateMutation.mutateAsync({
        event_id: selectedEventId,
        section: addForm.section.trim(),
        rowStart: addForm.rowStart,
        rowEnd: addForm.rowEnd,
        seatsPerRow: addForm.seatsPerRow,
        rowType: addForm.rowType,
      });
      toast.success(`Kreirano ${count} sjedišta u sekciji "${addForm.section}"`);
      setIsAddModalOpen(false);
      setAddForm({
        section: "",
        rowType: "letters",
        rowStart: "A",
        rowEnd: "Z",
        seatsPerRow: 30,
      });
    } catch (err: any) {
      toast.error("Greška: " + err.message);
    }
  };

  const handleOpenAction = (section: string) => {
    setActionSection(section);
    setActionForm({
      action: "away_fans",
      rowStart: "",
      rowEnd: "",
      allRows: true,
    });
    setIsActionModalOpen(true);
  };

  const handleApplyAction = async () => {
    if (!selectedEventId || !actionSection) return;

    try {
      let rows: string[] | undefined;
      if (!actionForm.allRows && actionForm.rowStart && actionForm.rowEnd) {
        // Determine if rows are letters or numbers
        const isNum = !isNaN(parseInt(actionForm.rowStart));
        const type = isNum ? "numbers" : "letters";
        rows = generateRowRange(actionForm.rowStart, actionForm.rowEnd, type);
      }

      const count = await updateByRangeMutation.mutateAsync({
        eventId: selectedEventId,
        section: actionSection,
        rows,
        status: actionForm.action,
      });

      toast.success(
        `${count} sjedišta u sekciji "${actionSection}" označeno kao ${STATUS_LABELS[actionForm.action]}`,
      );
      setIsActionModalOpen(false);
    } catch (err: any) {
      toast.error("Greška: " + err.message);
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedEventId || !deleteSection) return;
    try {
      await deleteSectionMutation.mutateAsync({
        eventId: selectedEventId,
        section: deleteSection,
      });
      toast.success(`Sekcija "${deleteSection}" obrisana`);
      setIsDeleteDialogOpen(false);
      setDeleteSection("");
      if (expandedSection === deleteSection) setExpandedSection(null);
    } catch (err: any) {
      toast.error("Greška: " + err.message);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stadionska sjedišta</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upravljanje sjedištima za sportske mečeve
          </p>
        </div>
      </div>

      {/* ─── Event Selector ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <Label className="text-sm font-medium mb-2 block">Izaberi utakmicu</Label>
        {loadingEvents ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Učitavanje...
          </div>
        ) : matchEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nema kreiranih utakmica. Prvo dodajte meč u "Dodaj meč" sekciji.
          </p>
        ) : (
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Izaberi utakmicu..." />
            </SelectTrigger>
            <SelectContent>
              {matchEvents.map((ev) => (
                <SelectItem key={ev.id} value={ev.id}>
                  {ev.name} {ev.date ? `(${ev.date})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ─── Content when event selected ─── */}
      {selectedEventId && (
        <>
          {/* Stats bar */}
          {sectionSummary.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <StatCard label="Ukupno" value={totalStats.total} color="bg-slate-100 text-slate-800" />
              <StatCard label="Slobodno" value={totalStats.available} color="bg-green-100 text-green-800" />
              <StatCard label="Rezervisano" value={totalStats.reserved} color="bg-yellow-100 text-yellow-800" />
              <StatCard label="Prodato" value={totalStats.sold} color="bg-blue-100 text-blue-800" />
              <StatCard label="Gostujući" value={totalStats.away_fans} color="bg-orange-100 text-orange-800" />
              <StatCard label="Blokirano" value={totalStats.blocked} color="bg-red-100 text-red-800" />
            </div>
          )}

          {/* Add seats button */}
          <div className="flex justify-end">
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Dodaj sjedišta
            </Button>
          </div>

          {/* Sections list */}
          {loadingSummary ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sectionSummary.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <Armchair className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Nema sjedišta za ovu utakmicu. Kliknite "Dodaj sjedišta" da započnete.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sectionSummary.map((section) => (
                <div key={section.section} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Section header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection(section.section)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedSection === section.section ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <h3 className="font-semibold text-foreground">{section.section}</h3>
                        <p className="text-sm text-muted-foreground">
                          {section.total} sjedišta ukupno
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge label="Slobodno" count={section.available} status="available" />
                      <StatusBadge label="Gostujući" count={section.away_fans} status="away_fans" />
                      <StatusBadge label="Prodato" count={section.sold} status="sold" />
                      <StatusBadge label="Blokirano" count={section.blocked} status="blocked" />

                      {/* Action buttons */}
                      <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAction(section.section)}
                          title="Promijeni status"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleteSection(section.section);
                            setIsDeleteDialogOpen(true);
                          }}
                          title="Obriši sekciju"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded section: seat grid by row */}
                  {expandedSection === section.section && (
                    <div className="border-t border-border p-4 bg-muted/20">
                      {loadingSeats ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      ) : seatsByRow.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">
                          Nema sjedišta u ovoj sekciji
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {seatsByRow.map(([rowLabel, seats]) => (
                            <div key={rowLabel} className="flex items-start gap-3">
                              <span className="text-sm font-mono font-bold text-muted-foreground min-w-[40px] pt-1">
                                Red {rowLabel}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {seats
                                  .sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number))
                                  .map((seat) => (
                                    <SeatDot key={seat.id} seat={seat} />
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ADD SEATS MODAL
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj sjedišta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Naziv sekcije</Label>
              <Input
                placeholder="npr. Tribina Sjever, VIP, Tribina Jug..."
                value={addForm.section}
                onChange={(e) => setAddForm({ ...addForm, section: e.target.value })}
              />
            </div>

            <div>
              <Label>Tip redova</Label>
              <Select
                value={addForm.rowType}
                onValueChange={(v) =>
                  setAddForm({
                    ...addForm,
                    rowType: v as "letters" | "numbers",
                    rowStart: v === "letters" ? "A" : "1",
                    rowEnd: v === "letters" ? "Z" : "30",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letters">Slova (A-Z)</SelectItem>
                  <SelectItem value="numbers">Brojevi (1-30)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Od reda</Label>
                <Input
                  value={addForm.rowStart}
                  onChange={(e) => setAddForm({ ...addForm, rowStart: e.target.value })}
                  placeholder={addForm.rowType === "letters" ? "A" : "1"}
                />
              </div>
              <div>
                <Label>Do reda</Label>
                <Input
                  value={addForm.rowEnd}
                  onChange={(e) => setAddForm({ ...addForm, rowEnd: e.target.value })}
                  placeholder={addForm.rowType === "letters" ? "Z" : "30"}
                />
              </div>
            </div>

            <div>
              <Label>Sjedišta po redu</Label>
              <Input
                type="number"
                min={1}
                max={200}
                value={addForm.seatsPerRow}
                onChange={(e) => setAddForm({ ...addForm, seatsPerRow: parseInt(e.target.value) || 1 })}
              />
            </div>

            {/* Preview */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">Pregled:</p>
              <p className="text-muted-foreground">
                {calculateTotalSeats(addForm)} sjedišta u sekciji "{addForm.section || "..."}"
              </p>
              <p className="text-muted-foreground">
                Redovi: {addForm.rowStart} - {addForm.rowEnd}, po {addForm.seatsPerRow} sjedišta
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Otkaži
            </Button>
            <Button
              onClick={handleAddSeats}
              disabled={bulkCreateMutation.isPending || !addForm.section.trim()}
            >
              {bulkCreateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Kreiranje...
                </>
              ) : (
                "Dodaj sjedišta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          ACTION MODAL (mark as away_fans / blocked / available)
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Promijeni status — {actionSection}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Akcija</Label>
              <Select
                value={actionForm.action}
                onValueChange={(v) => setActionForm({ ...actionForm, action: v as SeatStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="away_fans">
                    <span className="flex items-center gap-2">
                      <UserX className="w-4 h-4 text-orange-600" />
                      Označi kao gostujuće navijače
                    </span>
                  </SelectItem>
                  <SelectItem value="blocked">
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-red-600" />
                      Blokiraj
                    </span>
                  </SelectItem>
                  <SelectItem value="available">
                    <span className="flex items-center gap-2">
                      <Unlock className="w-4 h-4 text-green-600" />
                      Oslobodi (vrati u available)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="allRows"
                  checked={actionForm.allRows}
                  onChange={(e) => setActionForm({ ...actionForm, allRows: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="allRows" className="text-sm cursor-pointer">
                  Primijeni na sve redove
                </Label>
              </div>
              {!actionForm.allRows && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Od reda</Label>
                    <Input
                      value={actionForm.rowStart}
                      onChange={(e) => setActionForm({ ...actionForm, rowStart: e.target.value })}
                      placeholder="A"
                    />
                  </div>
                  <div>
                    <Label>Do reda</Label>
                    <Input
                      value={actionForm.rowEnd}
                      onChange={(e) => setActionForm({ ...actionForm, rowEnd: e.target.value })}
                      placeholder="E"
                    />
                  </div>
                </div>
              )}
            </div>

            {actionForm.action === "away_fans" && (
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Sjedišta označena kao "gostujući navijači" neće biti dostupna za prodaju.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionModalOpen(false)}>
              Otkaži
            </Button>
            <Button onClick={handleApplyAction} disabled={updateByRangeMutation.isPending}>
              {updateByRangeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Primjena...
                </>
              ) : (
                "Primijeni"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          DELETE SECTION DIALOG
          ═══════════════════════════════════════════════════════════════ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši sekciju "{deleteSection}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija će obrisati sva sjedišta u sekciji "{deleteSection}". Ova akcija se ne može poništiti.
              {sectionSummary.find((s) => s.section === deleteSection)?.sold
                ? " UPOZORENJE: Neka sjedišta su već prodana!"
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteSectionMutation.isPending ? "Brisanje..." : "Obriši"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 text-center ${color}`}>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

function StatusBadge({
  label,
  count,
  status,
}: {
  label: string;
  count: number;
  status: SeatStatus;
}) {
  if (count === 0) return null;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {count} {label.toLowerCase()}
    </span>
  );
}

function SeatDot({ seat }: { seat: StadiumSeat }) {
  const colorMap: Record<SeatStatus, string> = {
    available: "bg-green-400",
    reserved: "bg-yellow-400",
    sold: "bg-blue-400",
    away_fans: "bg-orange-400",
    blocked: "bg-red-400",
  };

  return (
    <div
      className={`w-6 h-6 rounded-sm ${colorMap[seat.status]} flex items-center justify-center cursor-default`}
      title={`Red ${seat.row}, Sjedište ${seat.seat_number} — ${STATUS_LABELS[seat.status]}`}
    >
      <span className="text-[9px] font-bold text-white/90">{seat.seat_number}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════

function calculateTotalSeats(form: {
  rowType: "letters" | "numbers";
  rowStart: string;
  rowEnd: string;
  seatsPerRow: number;
}): number {
  const rows = generateRowRange(form.rowStart, form.rowEnd, form.rowType);
  return rows.length * form.seatsPerRow;
}

function generateRowRange(start: string, end: string, type: "letters" | "numbers"): string[] {
  const rows: string[] = [];
  if (type === "letters") {
    const startCode = start.toUpperCase().charCodeAt(0);
    const endCode = end.toUpperCase().charCodeAt(0);
    for (let i = startCode; i <= endCode; i++) {
      rows.push(String.fromCharCode(i));
    }
  } else {
    const startNum = parseInt(start) || 1;
    const endNum = parseInt(end) || 1;
    for (let i = startNum; i <= endNum; i++) {
      rows.push(String(i));
    }
  }
  return rows;
}

export default AdminStadiumSeats;
