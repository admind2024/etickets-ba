import { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Shield,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  SPORT_OPTIONS,
  getSportLabel,
  type Team,
  type TeamInput,
} from "@/hooks/useTeams";

interface TeamFormData {
  name: string;
  short_name: string;
  sport: string;
  city: string;
  country: string;
  logo: string;
}

const emptyFormData: TeamFormData = {
  name: "",
  short_name: "",
  sport: "football",
  city: "",
  country: "ME",
  logo: "",
};

const AdminTeams = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState<TeamFormData>(emptyFormData);
  const [isUploading, setIsUploading] = useState(false);

  const { data: teams = [], isLoading } = useTeams();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  const deleteMutation = useDeleteTeam();

  // Filter teams by search query
  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.short_name && t.short_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.city && t.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      getSportLabel(t.sport).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group by sport
  const groupedTeams = filteredTeams.reduce(
    (acc, team) => {
      const sportLabel = getSportLabel(team.sport);
      if (!acc[sportLabel]) acc[sportLabel] = [];
      acc[sportLabel].push(team);
      return acc;
    },
    {} as Record<string, Team[]>,
  );

  const handleOpenCreate = () => {
    setEditingTeam(null);
    setFormData(emptyFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      short_name: team.short_name || "",
      sport: team.sport,
      city: team.city || "",
      country: team.country || "ME",
      logo: team.logo || "",
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (team: Team) => {
    setDeletingTeam(team);
    setIsDeleteDialogOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setIsUploading(true);
    try {
      const filePath = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("team-logos")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (error) {
        toast.error("Greška pri uploadu: " + error.message);
        setIsUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("team-logos")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, logo: urlData.publicUrl }));
      toast.success("Logo uploadovan!");
    } catch (err: any) {
      toast.error("Greška pri uploadu: " + (err.message || "Nepoznata greška"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Naziv tima je obavezan");
      return;
    }
    if (!formData.sport) {
      toast.error("Sport je obavezan");
      return;
    }

    try {
      const input: TeamInput = {
        name: formData.name.trim(),
        short_name: formData.short_name.trim() || null,
        sport: formData.sport,
        city: formData.city.trim() || null,
        country: formData.country.trim() || "ME",
        logo: formData.logo || null,
      };

      if (editingTeam) {
        await updateMutation.mutateAsync({ id: editingTeam.id, ...input });
        toast.success("Tim ažuriran!");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Tim kreiran!");
      }

      setIsModalOpen(false);
      setEditingTeam(null);
      setFormData(emptyFormData);
    } catch (error: any) {
      toast.error(error.message || "Došlo je do greške");
    }
  };

  const handleDelete = async () => {
    if (!deletingTeam) return;
    try {
      await deleteMutation.mutateAsync(deletingTeam.id);
      toast.success("Tim obrisan!");
      setIsDeleteDialogOpen(false);
      setDeletingTeam(null);
    } catch (error: any) {
      toast.error(error.message || "Došlo je do greške");
    }
  };

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#6366f1" }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#1a1f36" }}>
              Timovi
            </h1>
            <p className="text-sm" style={{ color: "#697386" }}>
              Upravljanje sportskim timovima
            </p>
          </div>
        </div>
        <Button
          onClick={handleOpenCreate}
          style={{ backgroundColor: "#6366f1" }}
          className="hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Dodaj tim
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "#697386" }}
        />
        <Input
          placeholder="Pretraži timove..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List grouped by sport */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#6366f1" }} />
        </div>
      ) : Object.keys(groupedTeams).length === 0 ? (
        <div className="text-center py-12" style={{ color: "#697386" }}>
          {searchQuery ? "Nema rezultata pretrage" : "Nema timova. Dodajte prvi!"}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTeams).map(([sport, sportTeams]) => (
            <div key={sport}>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4" style={{ color: "#6366f1" }} />
                <h2 className="font-semibold" style={{ color: "#1a1f36" }}>
                  {sport}
                </h2>
                <span className="text-sm" style={{ color: "#697386" }}>
                  ({sportTeams.length})
                </span>
              </div>
              <div className="grid gap-3">
                {sportTeams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    {/* Logo */}
                    <div
                      className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: "#f3f4f6" }}
                    >
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Shield className="w-6 h-6" style={{ color: "#9ca3af" }} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-semibold truncate"
                        style={{ color: "#1a1f36" }}
                      >
                        {team.name}
                      </h3>
                      <p className="text-sm truncate" style={{ color: "#697386" }}>
                        {team.short_name && `${team.short_name} • `}
                        {team.city && `${team.city}`}
                        {team.country && `, ${team.country}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(team)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{ color: "#697386" }}
                        disabled={isMutating}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(team)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{ color: "#697386" }}
                        disabled={isMutating}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? "Uredi tim" : "Novi tim"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <Label htmlFor="team-name">Naziv *</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Naziv tima"
              />
            </div>

            {/* Short Name */}
            <div>
              <Label htmlFor="team-short-name">Skraćeni naziv</Label>
              <Input
                id="team-short-name"
                value={formData.short_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, short_name: e.target.value }))
                }
                placeholder="npr. FCB, BUD"
              />
            </div>

            {/* Sport */}
            <div>
              <Label htmlFor="team-sport">Sport *</Label>
              <select
                id="team-sport"
                value={formData.sport}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sport: e.target.value }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {SPORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* City & Country */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team-city">Grad</Label>
                <Input
                  id="team-city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="Grad"
                />
              </div>
              <div>
                <Label htmlFor="team-country">Država</Label>
                <Input
                  id="team-country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, country: e.target.value }))
                  }
                  placeholder="ME"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <Label htmlFor="team-logo">Logo</Label>
              <div className="mt-1">
                <input
                  id="team-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  disabled={isUploading}
                />
              </div>
              {isUploading && (
                <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: "#697386" }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Upload u toku...
                </div>
              )}
              {formData.logo && (
                <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden" style={{ backgroundColor: "#f3f4f6" }}>
                  <img
                    src={formData.logo}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, logo: "" }))}
                    className="absolute top-1 right-1 p-1 rounded-full text-white"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Logo URL (manual) */}
            <div>
              <Label htmlFor="team-logo-url">Ili unesite URL loga</Label>
              <Input
                id="team-logo-url"
                value={formData.logo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logo: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isMutating || isUploading}
            >
              Otkaži
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isMutating || isUploading}
              style={{ backgroundColor: "#6366f1" }}
              className="hover:opacity-90"
            >
              {isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTeam ? "Sačuvaj" : "Kreiraj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši tim?</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite obrisati tim "{deletingTeam?.name}"? Ova
              akcija se ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTeams;
