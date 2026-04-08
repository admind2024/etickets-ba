import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  X,
  Image as ImageIcon,
  Building2,
  Map,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  useVenues,
  useCreateVenue,
  useUpdateVenue,
  useDeleteVenue,
  type Venue,
  type VenueInput,
} from "@/hooks/useVenues";
import { generateSlug } from "@/hooks/usePerformers";

// ============================================
// 💾 LOCAL STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  FORM_DATA: "admin_venues_form_data",
  SEARCH_QUERY: "admin_venues_search",
  EDITING_VENUE: "admin_venues_editing",
  GOOGLE_MAPS_URL: "admin_venues_google_maps_url",
  MODAL_OPEN: "admin_venues_modal_open",
};

// ============================================
// 🌐 FUNKCIJA ZA PREVOD LOKACIJE
// ============================================
const translateVenue = async (venueId: number | string): Promise<boolean> => {
  try {
    console.log(`🌐 Pokrećem prevod za lokaciju ID: ${venueId}`);

    const { data, error } = await supabase.functions.invoke("translate-venues", {
      body: { venue_id: venueId },
    });

    if (error) {
      console.error("❌ Greška pri prevodu lokacije:", error);
      return false;
    }

    console.log("✅ Prevod lokacije uspješan:", data);
    return true;
  } catch (err) {
    console.error("❌ Prevod lokacije nije uspio:", err);
    return false;
  }
};

// ============================================
// 💾 LOCAL STORAGE HELPERS
// ============================================
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    return defaultValue;
  }
};

const clearFromLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing from localStorage:", error);
  }
};

const AdminVenues = () => {
  // 💾 Load initial state from localStorage
  const [searchQuery, setSearchQuery] = useState(() => loadFromLocalStorage(STORAGE_KEYS.SEARCH_QUERY, ""));

  const [isModalOpen, setIsModalOpen] = useState(() => loadFromLocalStorage(STORAGE_KEYS.MODAL_OPEN, false));
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingVenue, setEditingVenue] = useState<Venue | null>(() =>
    loadFromLocalStorage(STORAGE_KEYS.EDITING_VENUE, null),
  );

  const [deletingVenue, setDeletingVenue] = useState<Venue | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const [formData, setFormData] = useState<VenueInput>(() =>
    loadFromLocalStorage(STORAGE_KEYS.FORM_DATA, {
      name: "",
      slug: "",
      city: "",
      address: "",
      capacity: null,
      description: "",
      image: "",
      latitude: null,
      longitude: null,
      google_maps_url: null,
    }),
  );

  const [googleMapsUrl, setGoogleMapsUrl] = useState(() => loadFromLocalStorage(STORAGE_KEYS.GOOGLE_MAPS_URL, ""));

  const { data: venues = [], isLoading } = useVenues();
  const createMutation = useCreateVenue();
  const updateMutation = useUpdateVenue();
  const deleteMutation = useDeleteVenue();

  // ============================================
  // 💾 SAVE TO LOCALSTORAGE ON CHANGES
  // ============================================
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.SEARCH_QUERY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.FORM_DATA, formData);
  }, [formData]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.EDITING_VENUE, editingVenue);
  }, [editingVenue]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.GOOGLE_MAPS_URL, googleMapsUrl);
  }, [googleMapsUrl]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.MODAL_OPEN, isModalOpen);
  }, [isModalOpen]);

  const filteredVenues = venues.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.city.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group by city
  const groupedVenues = filteredVenues.reduce(
    (acc, venue) => {
      if (!acc[venue.city]) acc[venue.city] = [];
      acc[venue.city].push(venue);
      return acc;
    },
    {} as Record<string, Venue[]>,
  );

  // Parse Google Maps URL to extract coordinates
  const parseGoogleMapsUrl = (url: string) => {
    if (!url) return;

    try {
      let lat: number | null = null;
      let lng: number | null = null;

      // Različiti formati Google Maps URL-ova:
      // 1: https://www.google.com/maps?q=42.4411,19.2636
      // 2: https://www.google.com/maps/@42.4411,19.2636,15z
      // 3: https://maps.google.com/?ll=42.4411,19.2636
      // 4: https://www.google.com/maps/place/.../@42.4411,19.2636,17z
      // 5: https://www.google.com/maps/search/?api=1&query=42.4411,19.2636
      // 6: https://www.google.com/maps/dir//...!1d19.2644!2d42.4458 (directions - LNG pa LAT!)
      // 7: https://maps.app.goo.gl/... (short URL - ne može se parsirati)

      // Prvo probaj directions format: !1d{lng}!2d{lat}
      const directionsMatch = url.match(/!1d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/);
      if (directionsMatch) {
        lng = parseFloat(directionsMatch[1]); // PRVO je longitude
        lat = parseFloat(directionsMatch[2]); // DRUGO je latitude
      }

      // Ako nije directions, probaj ostale formate
      if (!lat || !lng) {
        const patterns = [
          /@(-?\d+\.?\d*),(-?\d+\.?\d*)/, // @lat,lng format
          /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/, // ?q=lat,lng format
          /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/, // ?ll=lat,lng format
          /[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/, // ?query=lat,lng format
          /place\/[^/]+\/(-?\d+\.?\d*),(-?\d+\.?\d*)/, // place/.../lat,lng format
          /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/, // !3d lat !4d lng format
        ];

        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) {
            lat = parseFloat(match[1]);
            lng = parseFloat(match[2]);
            break;
          }
        }
      }

      if (lat && lng && !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        toast({
          title: "✅ Koordinate preuzete!",
          description: `Lat: ${lat}, Lng: ${lng}`,
        });
      } else if (url.includes("google.com/maps") || url.includes("maps.app.goo.gl")) {
        toast({
          title: "ℹ️ Link sačuvan",
          description: "Koordinate nisu pronađene. Unesi ih ručno ili koristi link sa koordinatama iz Google Maps.",
          variant: "default",
        });
      }
    } catch (e) {
      console.error("Error parsing Google Maps URL:", e);
    }
  };

  const handleOpenCreate = () => {
    setEditingVenue(null);
    clearFromLocalStorage(STORAGE_KEYS.EDITING_VENUE);

    const newFormData = {
      name: "",
      slug: "",
      city: "",
      address: "",
      capacity: null,
      description: "",
      image: "",
      latitude: null,
      longitude: null,
      google_maps_url: null,
    };

    setFormData(newFormData);
    saveToLocalStorage(STORAGE_KEYS.FORM_DATA, newFormData);

    setGoogleMapsUrl("");
    clearFromLocalStorage(STORAGE_KEYS.GOOGLE_MAPS_URL);

    setIsModalOpen(true);
  };

  const handleOpenEdit = (venue: Venue) => {
    setEditingVenue(venue);

    const editFormData = {
      name: venue.name,
      slug: venue.slug,
      city: venue.city,
      address: venue.address || "",
      capacity: venue.capacity,
      description: venue.description || "",
      image: venue.image || "",
      latitude: venue.latitude,
      longitude: venue.longitude,
      google_maps_url: venue.google_maps_url,
    };

    setFormData(editFormData);
    saveToLocalStorage(STORAGE_KEYS.FORM_DATA, editFormData);
    saveToLocalStorage(STORAGE_KEYS.EDITING_VENUE, venue);

    // Koristi sačuvan URL iz baze, ili generiši iz koordinata
    const mapsUrl = venue.google_maps_url || "";
    setGoogleMapsUrl(mapsUrl);
    saveToLocalStorage(STORAGE_KEYS.GOOGLE_MAPS_URL, mapsUrl);

    setIsModalOpen(true);
  };

  const handleOpenDelete = (venue: Venue) => {
    setDeletingVenue(venue);
    setIsDeleteDialogOpen(true);
  };

  const handleNameOrCityChange = (field: "name" | "city", value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (!editingVenue) {
        updated.slug = generateSlug(`${updated.name}-${updated.city}`);
      }
      return updated;
    });
  };

  const handleGoogleMapsUrlChange = (url: string) => {
    setGoogleMapsUrl(url);
    // Sačuvaj originalni link u formData
    setFormData((prev) => ({ ...prev, google_maps_url: url || null }));
    // Pokušaj izvući koordinate
    if (url.includes("google.com/maps") || url.includes("goo.gl/maps")) {
      parseGoogleMapsUrl(url);
    }
  };

  // ============================================
  // 📝 HANDLE SUBMIT SA PREVODOM I ČIŠĆENJEM STORAGE-A
  // ============================================
  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.city.trim()) {
      toast({
        title: "Greška",
        description: "Ime i grad su obavezni",
        variant: "destructive",
      });
      return;
    }

    try {
      let venueId: number | string | null = null;

      if (editingVenue) {
        await updateMutation.mutateAsync({ id: editingVenue.id, ...formData });
        venueId = editingVenue.id;
        toast({ title: "✅ Uspjeh", description: "Lokacija ažurirana" });
      } else {
        // Kreiraj novu lokaciju i dobij ID
        const result = await createMutation.mutateAsync(formData);
        // Ako hook vraća podatke, uzmi ID
        if (result && typeof result === "object" && "id" in result) {
          venueId = result.id;
        } else {
          // Ako ne vraća, probaj naći po slug-u
          const { data: newVenue } = await supabase.from("venues").select("id").eq("slug", formData.slug).single();
          if (newVenue) venueId = newVenue.id;
        }
        toast({ title: "✅ Uspjeh", description: "Lokacija kreirana" });
      }

      setIsModalOpen(false);

      // 💾 OČISTI LOKALNI STORAGE NAKON USPJEŠNOG ČUVANJA
      clearFromLocalStorage(STORAGE_KEYS.FORM_DATA);
      clearFromLocalStorage(STORAGE_KEYS.EDITING_VENUE);
      clearFromLocalStorage(STORAGE_KEYS.GOOGLE_MAPS_URL);
      clearFromLocalStorage(STORAGE_KEYS.MODAL_OPEN);

      // ============================================
      // 🌐 AUTOMATSKI PREVOD NAKON KREIRANJA/AŽURIRANJA
      // ============================================
      if (venueId) {
        setIsTranslating(true);

        toast({
          title: "🌐 Prevod u toku...",
          description: "Prevodim lokaciju na engleski jezik...",
        });

        const translationSuccess = await translateVenue(venueId);

        setIsTranslating(false);

        if (translationSuccess) {
          toast({
            title: "✅ Prevod završen!",
            description: "Lokacija je prevedena na EN",
          });
        } else {
          toast({
            title: "⚠️ Prevod nije uspio",
            description: "Lokacija je sačuvana ali nije prevedena",
            variant: "destructive",
          });
        }
      }
      // ============================================
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingVenue) return;
    try {
      await deleteMutation.mutateAsync(deletingVenue.id);
      toast({ title: "Uspjeh", description: "Lokacija obrisana" });
      setIsDeleteDialogOpen(false);
      setDeletingVenue(null);
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške",
        variant: "destructive",
      });
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || isTranslating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a1f36]">Lokacije</h1>
            <p className="text-sm text-[#697386]">
              Upravljanje dvoranama i objektima
              {isTranslating && (
                <span className="ml-2 text-blue-600 inline-flex items-center gap-1">
                  <Languages className="w-3 h-3 animate-pulse" />
                  Prevod...
                </span>
              )}
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="bg-green-600 hover:bg-green-700" disabled={isTranslating}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj lokaciju
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#697386]" />
        <Input
          placeholder="Pretraži lokacije..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List grouped by city */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : Object.keys(groupedVenues).length === 0 ? (
        <div className="text-center py-12 text-[#697386]">
          {searchQuery ? "Nema rezultata pretrage" : "Nema lokacija. Dodajte prvu!"}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedVenues).map(([city, cityVenues]) => (
            <div key={city}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-green-600" />
                <h2 className="font-semibold text-[#1a1f36]">{city}</h2>
                <span className="text-sm text-[#697386]">({cityVenues.length})</span>
              </div>
              <div className="grid gap-3">
                {cityVenues.map((venue) => (
                  <div
                    key={venue.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    {/* Image */}
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {venue.image ? (
                        <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1a1f36] truncate">{venue.name}</h3>
                      <p className="text-sm text-[#697386] truncate">
                        {venue.address || venue.slug}
                        {venue.capacity && ` • ${venue.capacity} mjesta`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {venue.google_maps_url && <span className="text-xs text-green-600">📍 Mapa</span>}
                        {(venue as any).name_en && <span className="text-xs text-blue-600">🌐 EN</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Google Maps link - koristi sačuvani URL ili fallback na search */}
                      <a
                        href={
                          venue.google_maps_url
                            ? venue.google_maps_url
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + " " + venue.city)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg hover:bg-gray-100 ${
                          venue.google_maps_url
                            ? "text-green-600 hover:text-green-700"
                            : "text-[#697386] hover:text-blue-600"
                        }`}
                        title={venue.google_maps_url ? "Otvori sačuvanu lokaciju" : "Pretraži na mapi"}
                      >
                        <Map className="w-4 h-4" />
                      </a>
                      <Link
                        to={`/lokacije/${venue.slug}`}
                        target="_blank"
                        className="p-2 rounded-lg hover:bg-gray-100 text-[#697386] hover:text-green-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(venue)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-[#697386] hover:text-green-600"
                        disabled={isTranslating}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(venue)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-[#697386] hover:text-red-600"
                        disabled={isTranslating}
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

      {/* Create/Edit Modal - NE ZATVARA SE KAD SWITCHUJEŠ TAB */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingVenue ? "Uredi lokaciju" : "Nova lokacija"}
              <span className="text-xs text-blue-600 font-normal flex items-center gap-1">
                <Languages className="w-3 h-3" />
                Auto-prevod
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Naziv *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameOrCityChange("name", e.target.value)}
                  placeholder="Naziv dvorane"
                />
              </div>
              <div>
                <Label htmlFor="city">Grad *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleNameOrCityChange("city", e.target.value)}
                  placeholder="Grad"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="url-slug"
              />
            </div>

            <div>
              <Label htmlFor="address">Adresa</Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Ulica i broj"
              />
            </div>

            <div>
              <Label htmlFor="capacity">Kapacitet</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    capacity: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                placeholder="Broj mjesta"
              />
            </div>

            <div>
              <Label htmlFor="image">Slika (URL)</Label>
              <Input
                id="image"
                value={formData.image || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                placeholder="https://..."
              />
              {formData.image && (
                <div className="mt-2 relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Kratki opis lokacije..."
                rows={3}
              />
            </div>

            {/* Google Maps Link - NOVO! */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <Label htmlFor="googleMapsUrl" className="flex items-center gap-2 text-blue-700">
                <Map className="w-4 h-4" />
                Google Maps Link
              </Label>
              <Input
                id="googleMapsUrl"
                value={googleMapsUrl}
                onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                placeholder="Zalijepi link sa Google Maps..."
                className="mt-2"
              />
              <p className="text-xs text-blue-600 mt-2">
                💡 Zalijepi link sa Google Maps i koordinate će se automatski popuniti. Ili unesi koordinate ručno
                ispod.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      latitude: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="42.4411"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      longitude: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="19.2636"
                />
              </div>
            </div>

            {/* Preview koordinata i linka */}
            {(formData.latitude && formData.longitude) || googleMapsUrl ? (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                {formData.latitude && formData.longitude && (
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <span>✅</span>
                    Koordinate: {formData.latitude}, {formData.longitude}
                  </p>
                )}
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline mt-1 inline-block"
                  >
                    🗺️ Otvori sačuvani link →
                  </a>
                )}
              </div>
            ) : null}

            {/* Info o auto-prevodu */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 flex items-center gap-2">
                <Languages className="w-4 h-4" />
                Lokacija će biti automatski prevedena na engleski nakon čuvanja
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isMutating}>
              Otkaži
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating} className="bg-green-600 hover:bg-green-700">
              {isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isTranslating ? (
                <>
                  <Languages className="w-4 h-4 mr-2 animate-pulse" />
                  Prevod...
                </>
              ) : editingVenue ? (
                "Sačuvaj"
              ) : (
                "Kreiraj"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši lokaciju?</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite obrisati lokaciju "{deletingVenue?.name}"? Ova akcija se ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminVenues;
