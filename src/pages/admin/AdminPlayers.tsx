import { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Users,
  Star,
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
import {
  usePlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
  POSITION_OPTIONS,
  type Player,
  type PlayerInput,
} from "@/hooks/usePlayers";
import { useTeams, getSportLabel } from "@/hooks/useTeams";

interface PlayerFormData {
  team_id: string;
  name: string;
  number: string;
  position: string;
  image: string;
  nationality: string;
  is_captain: boolean;
}

const emptyFormData: PlayerFormData = {
  team_id: "",
  name: "",
  number: "",
  position: "",
  image: "",
  nationality: "ME",
  is_captain: false,
};

const AdminPlayers = () => {
  const { data: players = [], isLoading } = usePlayers();
  const { data: teams = [] } = useTeams();
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();

  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>(emptyFormData);

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = filterTeam === "all" || p.team_id === filterTeam;
    return matchesSearch && matchesTeam;
  });

  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.name || "Nepoznat tim";
  };

  const openCreate = () => {
    setEditingPlayer(null);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  };

  const openEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      team_id: player.team_id,
      name: player.name,
      number: player.number?.toString() || "",
      position: player.position || "",
      image: player.image || "",
      nationality: player.nationality || "ME",
      is_captain: player.is_captain,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.team_id) {
      toast.error("Ime i tim su obavezni.");
      return;
    }

    const input: PlayerInput = {
      team_id: formData.team_id,
      name: formData.name.trim(),
      number: formData.number ? parseInt(formData.number) : null,
      position: formData.position || null,
      image: formData.image.trim() || null,
      nationality: formData.nationality.trim() || null,
      is_captain: formData.is_captain,
    };

    try {
      if (editingPlayer) {
        await updatePlayer.mutateAsync({ ...input, id: editingPlayer.id });
        toast.success("Igrač ažuriran.");
      } else {
        await createPlayer.mutateAsync(input);
        toast.success("Igrač dodat.");
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error("Greška: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePlayer.mutateAsync(deleteId);
      toast.success("Igrač obrisan.");
    } catch (err: any) {
      toast.error("Greška: " + err.message);
    }
    setDeleteId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Igrači
          </h1>
          <p className="text-sm text-muted-foreground">{players.length} igrača ukupno</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj igrača
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pretraži igrače..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="all">Svi timovi</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} ({getSportLabel(team.sport)})
            </option>
          ))}
        </select>
      </div>

      {/* Players Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">#</th>
              <th className="text-left p-3 font-medium">Ime</th>
              <th className="text-left p-3 font-medium">Tim</th>
              <th className="text-left p-3 font-medium">Pozicija</th>
              <th className="text-left p-3 font-medium">Nacionalnost</th>
              <th className="text-center p-3 font-medium">Kapiten</th>
              <th className="text-right p-3 font-medium">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Nema pronađenih igrača.
                </td>
              </tr>
            ) : (
              filteredPlayers.map((player) => (
                <tr key={player.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-muted-foreground">{player.number || "-"}</td>
                  <td className="p-3 font-medium flex items-center gap-2">
                    {player.image && (
                      <img
                        src={player.image}
                        alt={player.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    {player.name}
                  </td>
                  <td className="p-3 text-muted-foreground">{getTeamName(player.team_id)}</td>
                  <td className="p-3">
                    {player.position && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                        {POSITION_OPTIONS.find((p) => p.value === player.position)?.label || player.position}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{player.nationality || "-"}</td>
                  <td className="p-3 text-center">
                    {player.is_captain && <Star className="w-4 h-4 text-yellow-500 mx-auto fill-yellow-500" />}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(player)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(player.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlayer ? "Uredi igrača" : "Dodaj igrača"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tim *</Label>
              <select
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background mt-1"
              >
                <option value="">Izaberi tim...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({getSportLabel(team.sport)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Ime *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ime i prezime"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Broj</Label>
                <Input
                  type="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Pozicija</Label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background mt-1"
                >
                  <option value="">Izaberi...</option>
                  {POSITION_OPTIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Slika (URL)</Label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Nacionalnost (country code)</Label>
              <Input
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                placeholder="ME"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_captain"
                checked={formData.is_captain}
                onChange={(e) => setFormData({ ...formData, is_captain: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_captain">Kapiten</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Otkaži
            </Button>
            <Button
              onClick={handleSave}
              disabled={createPlayer.isPending || updatePlayer.isPending}
            >
              {(createPlayer.isPending || updatePlayer.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingPlayer ? "Sačuvaj" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši igrača?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija se ne može poništiti. Igrač će biti trajno obrisan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPlayers;
