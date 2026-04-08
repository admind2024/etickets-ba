import { useState, useEffect } from "react";
import {
  Trophy,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Check,
  MapPin,
  LayoutGrid,
  Key,
  Building2,
  Receipt,
  Calendar,
  FileText,
  Shield,
  Image,
  DollarSign,
  Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTeamsBySport, SPORT_OPTIONS } from "@/hooks/useTeams";

// ============================================
// LOCALSTORAGE KEY
// ============================================
const STORAGE_KEY = "adMatch_formData";
const IMAGE_PREVIEW_KEY = "adMatch_imagePreview";
const LAST_SAVED_KEY = "adMatch_lastSaved";

// ============================================
// INTERFACES
// ============================================
interface TicketCategory {
  category: string;
  price: number;
}

interface MatchFormData {
  sport: string;
  homeTeamId: string;
  awayTeamId: string;
  competition: string;
  matchRound: string;
  venue: string;
  venueCity: string;
  date: string;
  event_time: string;
  info: string;
  longDescription: string;
  categories: TicketCategory[];
  serviceFeePercentage: string;
  pdvPercentage: string;
  biletarnicaFee: string;
  currency: string;
  organizerName: string;
  organizerEmail: string;
  eventType: "simple" | "seats";
  workspaceKey: string;
  eventKey: string;
  enableFiscalization: boolean;
  image: string;
}

const initialFormData: MatchFormData = {
  sport: "",
  homeTeamId: "",
  awayTeamId: "",
  competition: "",
  matchRound: "",
  venue: "",
  venueCity: "",
  date: "",
  event_time: "",
  info: "",
  longDescription: "",
  categories: [{ category: "", price: 0 }],
  serviceFeePercentage: "5",
  pdvPercentage: "21",
  biletarnicaFee: "0",
  currency: "EUR",
  organizerName: "",
  organizerEmail: "",
  eventType: "simple",
  workspaceKey: "dbc346de-4a9e-4d5b-bd46-d90b8fa50323",
  eventKey: "",
  enableFiscalization: false,
  image: "",
};

// ============================================
// HELPERS
// ============================================
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const base64ToFile = async (base64String: string, fileName: string): Promise<File | null> => {
  try {
    const response = await fetch(base64String);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
  } catch (error) {
    console.error("Greska pri konverziji base64 u File:", error);
    return null;
  }
};

// ============================================
// COMPONENT
// ============================================
const AdMatch = () => {
  // ============================================
  // STATE: Load from localStorage
  // ============================================
  const [formData, setFormData] = useState<MatchFormData>(() => {
    if (typeof window === "undefined") return initialFormData;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialFormData, ...parsed };
      }
    } catch (error) {
      console.error("Greska pri ucitavanju iz localStorage:", error);
    }
    return initialFormData;
  });

  const [imagePreview, setImagePreview] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(IMAGE_PREVIEW_KEY);
    } catch {
      return null;
    }
  });

  const [lastSaved, setLastSaved] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(LAST_SAVED_KEY) || "";
    } catch {
      return "";
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingToStorage, setIsSavingToStorage] = useState(false);

  // ============================================
  // TEAM HOOKS
  // ============================================
  const { data: teamsBySport = [], isLoading: isLoadingTeams } = useTeamsBySport(
    formData.sport || undefined
  );

  // ============================================
  // DERIVED: find selected teams
  // ============================================
  const homeTeam = teamsBySport.find((t) => t.id === formData.homeTeamId) || null;
  const awayTeam = teamsBySport.find((t) => t.id === formData.awayTeamId) || null;

  const matchName =
    homeTeam && awayTeam ? `${homeTeam.name} vs ${awayTeam.name}` : "";

  const previewSlug =
    homeTeam && awayTeam
      ? generateSlug(
          `${homeTeam.name}-vs-${awayTeam.name}-${formData.venue}-${formData.date}`
        )
      : "";

  // ============================================
  // AUTO-SAVE to localStorage
  // ============================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsSavingToStorage(true);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        localStorage.setItem(LAST_SAVED_KEY, new Date().toLocaleTimeString("sr-Latn-ME"));
        setLastSaved(new Date().toLocaleTimeString("sr-Latn-ME"));
      } catch (error) {
        console.error("Greska pri cuvanju u localStorage:", error);
      } finally {
        setIsSavingToStorage(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (imagePreview) {
        localStorage.setItem(IMAGE_PREVIEW_KEY, imagePreview);
      } else {
        localStorage.removeItem(IMAGE_PREVIEW_KEY);
      }
    } catch (error) {
      console.error("Greska pri cuvanju slike:", error);
    }
  }, [imagePreview]);

  // ============================================
  // FORM HANDLERS
  // ============================================
  const handleInputChange = (field: keyof MatchFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSportChange = (sport: string) => {
    setFormData((prev) => ({
      ...prev,
      sport,
      homeTeamId: "",
      awayTeamId: "",
    }));
  };

  // ============================================
  // CATEGORY HANDLERS
  // ============================================
  const addCategory = () => {
    setFormData((prev) => ({
      ...prev,
      categories: [...prev.categories, { category: "", price: 0 }],
    }));
  };

  const removeCategory = (index: number) => {
    if (formData.categories.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const updateCategory = (index: number, field: keyof TicketCategory, value: any) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.map((cat, i) =>
        i === index ? { ...cat, [field]: value } : cat
      ),
    }));
  };

  // ============================================
  // IMAGE HANDLERS
  // ============================================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Maksimalna velicina je 5MB.");
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        toast.error("Koristite JPG, PNG, WebP ili GIF.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setFormData((prev) => ({ ...prev, image: "" }));
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (slug: string): Promise<string | null> => {
    // If existing URL
    if (formData.image && formData.image.startsWith("http")) {
      return formData.image;
    }

    // If base64 image
    if (imagePreview && imagePreview.startsWith("data:")) {
      setIsUploadingImage(true);
      try {
        const file = await base64ToFile(imagePreview, `${slug}-${Date.now()}.jpg`);
        if (!file) {
          throw new Error("Nije moguce konvertovati sliku");
        }

        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${slug}-${Date.now()}.${fileExt}`;
        const filePath = `events/${fileName}`;

        const { error } = await supabase.storage
          .from("event-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(filePath);
        return urlData.publicUrl;
      } catch (error: any) {
        console.error("Greska pri uploadu slike:", error);
        toast.error("Greska pri uploadu slike: " + error.message);
        return null;
      } finally {
        setIsUploadingImage(false);
      }
    }

    // If imagePreview is URL
    if (imagePreview && imagePreview.startsWith("http")) {
      return imagePreview;
    }

    return null;
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: "" }));
  };

  // ============================================
  // RESET FORM
  // ============================================
  const resetForm = () => {
    setFormData(initialFormData);
    setImagePreview(null);

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(IMAGE_PREVIEW_KEY);
        localStorage.removeItem(LAST_SAVED_KEY);
      } catch (error) {
        console.error("Greska pri ciscenju localStorage:", error);
      }
    }

    toast.success("Forma ociscena - svi podaci su obrisani.");
  };

  // ============================================
  // HANDLE SUBMIT
  // ============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.sport) {
      toast.error("Izaberite sport.");
      return;
    }
    if (!formData.homeTeamId) {
      toast.error("Izaberite domaci tim.");
      return;
    }
    if (!formData.awayTeamId) {
      toast.error("Izaberite gostujuci tim.");
      return;
    }
    if (formData.homeTeamId === formData.awayTeamId) {
      toast.error("Domaci i gostujuci tim ne mogu biti isti.");
      return;
    }
    if (!formData.date) {
      toast.error("Unesite datum utakmice.");
      return;
    }
    if (!formData.venue) {
      toast.error("Unesite lokaciju/stadion.");
      return;
    }

    if (formData.eventType === "seats") {
      if (!formData.workspaceKey) {
        toast.error("Unesite Workspace Key za sjedista.");
        return;
      }
      if (!formData.eventKey) {
        toast.error("Unesite Event Key za sjedista.");
        return;
      }
    }

    const validCategories = formData.categories.filter((c) => c.category);
    if (validCategories.length === 0) {
      toast.error("Dodajte barem jednu kategoriju ulaznice.");
      return;
    }

    if (!homeTeam || !awayTeam) {
      toast.error("Greska: timovi nisu pronadjeni.");
      return;
    }

    setIsSubmitting(true);

    try {
      const slug = generateSlug(
        `${homeTeam.name}-vs-${awayTeam.name}-${formData.venue}-${formData.date}`
      );

      // Upload image
      const imageUrl = await uploadImage(slug);

      // Build categories text
      const categoriesText = validCategories
        .map((c) => `${c.category}: ${Number(c.price).toFixed(2)}${formData.currency === "EUR" ? "\u20AC" : formData.currency}`)
        .join(", ");

      // Build description JSON
      const descriptionJson = validCategories.map((c) => ({
        category: c.category,
        price: c.price,
        type: "regular",
      }));

      // Build info if not provided
      const infoText =
        formData.info ||
        `${formData.competition}${formData.matchRound ? ` - ${formData.matchRound}` : ""} | ${formData.venue}`;

      // Construct aboutEventsData
      const aboutEventsData: any = {
        name: `${homeTeam.name} vs ${awayTeam.name}`,
        slug,
        date: formData.date,
        event_time: formData.event_time,
        venue: formData.venue,
        category: "Sport",
        info: infoText,
        seo_title: `${homeTeam.name} vs ${awayTeam.name} | Kupi ulaznice | etickets`,
        seo_description: `Kupi ulaznice za ${homeTeam.name} vs ${awayTeam.name}. ${formData.competition}${formData.matchRound ? `, ${formData.matchRound}` : ""}. ${formData.venue}, ${formData.date}.`,
        long_description: formData.longDescription,
        categories: categoriesText,
        description: JSON.stringify(descriptionJson),
        currency: formData.currency,
        serviceFeePercentage: formData.serviceFeePercentage,
        pdvPercentage: formData.pdvPercentage,
        biletarnicaFee: parseFloat(formData.biletarnicaFee) || 0,
        eventType: formData.eventType,
        link: `/mec/${slug}`,
        status: "active",
        hide: "false",
        is_match: true,
        sport: formData.sport,
        home_team_id: formData.homeTeamId,
        away_team_id: formData.awayTeamId,
        competition: formData.competition,
        match_round: formData.matchRound,
        organizer: formData.organizerName,
        email: formData.organizerEmail,
      };

      if (imageUrl) {
        aboutEventsData.image = imageUrl;
      }

      if (formData.eventType === "seats") {
        aboutEventsData.workspaceKey = formData.workspaceKey;
        aboutEventsData.eventKey = formData.eventKey;
        aboutEventsData.eventId = formData.eventKey;
      } else {
        aboutEventsData.eventId = slug;
      }

      console.log("Saljem u bazu:", aboutEventsData);

      const { data, error } = await supabase
        .from("AboutEvents")
        .insert(aboutEventsData)
        .select()
        .single();

      if (error) {
        console.error("Greska pri insertu:", error);
        throw error;
      }

      console.log("Upisano u bazu:", data);

      // Insert fiscalization if enabled
      if (formData.enableFiscalization && data?.id) {
        const eventId =
          formData.eventType === "seats" ? formData.eventKey : slug;
        await supabase.from("Fiscalization").insert({
          eventId,
          title: `${homeTeam.name} vs ${awayTeam.name}`,
          enableFiscalization: true,
        });
      }

      toast.success(`Utakmica kreirana: ${homeTeam.name} vs ${awayTeam.name}`);

      // Clear form after success
      setFormData(initialFormData);
      setImagePreview(null);

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(IMAGE_PREVIEW_KEY);
          localStorage.removeItem(LAST_SAVED_KEY);
        } catch (error) {
          console.error("Greska pri ciscenju localStorage:", error);
        }
      }
    } catch (error: any) {
      toast.error("Greska: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Kreiraj novu utakmicu</h2>
              <p className="text-sm text-gray-500">
                Popunite informacije za kreiranje sportskog dogadjaja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto-save indicator */}
            <div className="text-right">
              {isSavingToStorage ? (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Cuva se...</span>
                </div>
              ) : lastSaved ? (
                <div className="text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-600" />
                    <span>Sacuvano: {lastSaved}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetForm}
              className="text-gray-600"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Ocisti
            </Button>
          </div>
        </div>
      </div>

      {/* Match Name Preview */}
      {matchName && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
            <Trophy className="w-4 h-4" />
            Naziv utakmice:
          </div>
          <h1 className="text-xl font-bold text-green-900">{matchName}</h1>
          {formData.competition && (
            <p className="text-sm text-green-700 mt-1">
              {formData.competition}
              {formData.matchRound ? ` | ${formData.matchRound}` : ""}
            </p>
          )}
        </div>
      )}

      {/* Slug Preview */}
      {previewSlug && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium mb-2">
            Generisani slug:
          </div>
          <code className="block text-amber-900 bg-amber-100 px-2 py-1 rounded text-sm break-all">
            /mec/{previewSlug}
          </code>
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ======================================== */}
          {/* LEFT COLUMN */}
          {/* ======================================== */}
          <div className="space-y-6">
            {/* ---- Sport & Teams Section ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  Sport i Timovi
                </h3>
              </div>
              <div className="p-5 space-y-4">
                {/* Sport */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Sport *
                  </label>
                  <select
                    value={formData.sport}
                    onChange={(e) => handleSportChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 bg-gray-50 text-gray-900 text-sm"
                    required
                  >
                    <option value="">-- Izaberi sport --</option>
                    {SPORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Home Team */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Domaci tim *
                  </label>
                  <div className="space-y-2">
                    <select
                      value={formData.homeTeamId}
                      onChange={(e) => handleInputChange("homeTeamId", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-gray-200 bg-gray-50 text-gray-900 text-sm"
                      disabled={!formData.sport || isLoadingTeams}
                      required
                    >
                      <option value="">
                        {isLoadingTeams
                          ? "Ucitava se..."
                          : !formData.sport
                            ? "Prvo izaberite sport"
                            : "-- Izaberi domaci tim --"}
                      </option>
                      {teamsBySport.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                          {team.city ? ` (${team.city})` : ""}
                        </option>
                      ))}
                    </select>
                    {formData.homeTeamId && (() => {
                      const t = teamsBySport.find((t) => t.id === formData.homeTeamId);
                      return t ? (
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                          {t.logo ? (
                            <img src={t.logo} alt={t.name} className="w-8 h-8 object-contain rounded" />
                          ) : (
                            <Shield className="w-8 h-8 text-gray-300" />
                          )}
                          <span className="text-sm font-medium text-gray-800">{t.name}</span>
                          {!t.logo && <span className="text-xs text-orange-500 ml-auto">Nema logo</span>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Away Team */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Gostujuci tim *
                  </label>
                  <div className="space-y-2">
                    <select
                      value={formData.awayTeamId}
                      onChange={(e) => handleInputChange("awayTeamId", e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-gray-200 bg-gray-50 text-gray-900 text-sm"
                      disabled={!formData.sport || isLoadingTeams}
                      required
                    >
                      <option value="">
                        {isLoadingTeams
                          ? "Ucitava se..."
                          : !formData.sport
                            ? "Prvo izaberite sport"
                            : "-- Izaberi gostujuci tim --"}
                      </option>
                      {teamsBySport
                        .filter((team) => team.id !== formData.homeTeamId)
                        .map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                            {team.city ? ` (${team.city})` : ""}
                          </option>
                        ))}
                    </select>
                    {formData.awayTeamId && (() => {
                      const t = teamsBySport.find((t) => t.id === formData.awayTeamId);
                      return t ? (
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-red-50 rounded-lg border border-red-100">
                          {t.logo ? (
                            <img src={t.logo} alt={t.name} className="w-8 h-8 object-contain rounded" />
                          ) : (
                            <Shield className="w-8 h-8 text-gray-300" />
                          )}
                          <span className="text-sm font-medium text-gray-800">{t.name}</span>
                          {!t.logo && <span className="text-xs text-orange-500 ml-auto">Nema logo</span>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Competition */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Takmicenje / Liga
                  </label>
                  <Input
                    value={formData.competition}
                    onChange={(e) => handleInputChange("competition", e.target.value)}
                    placeholder="Npr. Meridianbet 1. CFL"
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                  />
                </div>

                {/* Match Round */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Kolo / Runda
                  </label>
                  <Input
                    value={formData.matchRound}
                    onChange={(e) => handleInputChange("matchRound", e.target.value)}
                    placeholder="Npr. Kolo 25"
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* ---- Venue Section ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Lokacija
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Stadion / Dvorana *
                  </label>
                  <Input
                    value={formData.venue}
                    onChange={(e) => handleInputChange("venue", e.target.value)}
                    placeholder="Npr. Stadion pod Goricom"
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Grad
                  </label>
                  <Input
                    value={formData.venueCity}
                    onChange={(e) => handleInputChange("venueCity", e.target.value)}
                    placeholder="Npr. Podgorica"
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* ---- Date & Time Section ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Datum i Vrijeme
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Datum *
                    </label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange("date", e.target.value)}
                      className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Vrijeme
                    </label>
                    <Input
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => handleInputChange("event_time", e.target.value)}
                      className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Description Section ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  Opis (opciono)
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Kratki opis
                  </label>
                  <Textarea
                    value={formData.info}
                    onChange={(e) => handleInputChange("info", e.target.value)}
                    placeholder="Kratki opis utakmice (1-2 recenice)"
                    rows={2}
                    className="bg-gray-50 border-gray-200 focus:bg-white resize-none text-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Ako ostavite prazno, generise se automatski iz takmicenja i lokacije.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Dugi opis
                  </label>
                  <Textarea
                    value={formData.longDescription}
                    onChange={(e) =>
                      handleInputChange("longDescription", e.target.value)
                    }
                    placeholder="Detaljniji opis utakmice, istorija duela, vaznost meca..."
                    rows={5}
                    className="bg-gray-50 border-gray-200 focus:bg-white resize-none text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================== */}
          {/* RIGHT COLUMN */}
          {/* ======================================== */}
          <div className="space-y-6">
            {/* ---- Ticket Categories ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Kategorije ulaznica
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCategory}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Dodaj kategoriju
                  </Button>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {formData.categories.map((cat, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex-1">
                      <Input
                        value={cat.category}
                        onChange={(e) =>
                          updateCategory(index, "category", e.target.value)
                        }
                        placeholder="Naziv (npr. Tribina, VIP...)"
                        className="bg-white border-gray-200 text-gray-900 text-sm"
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cat.price || ""}
                        onChange={(e) =>
                          updateCategory(index, "price", parseFloat(e.target.value) || 0)
                        }
                        placeholder="Cijena"
                        className="bg-white border-gray-200 text-gray-900 text-sm"
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8">
                      {formData.currency}
                    </span>
                    {formData.categories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCategory(index)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {formData.categories.filter((c) => c.category).length > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-xs text-emerald-700 font-medium mb-1">
                      Pregled kategorija:
                    </p>
                    <p className="text-sm text-emerald-900">
                      {formData.categories
                        .filter((c) => c.category)
                        .map(
                          (c) =>
                            `${c.category}: ${Number(c.price).toFixed(2)}${formData.currency === "EUR" ? "\u20AC" : " " + formData.currency}`
                        )
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ---- Image Upload ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Image className="w-4 h-4 text-pink-600" />
                  Slika
                </h3>
              </div>
              <div className="p-5 space-y-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">
                      Kliknite za upload slike
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      JPG, PNG, WebP, GIF (max 5MB)
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* ---- Financial Settings ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-600" />
                  Finansijske postavke
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Servisna naknada (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.serviceFeePercentage}
                      onChange={(e) =>
                        handleInputChange("serviceFeePercentage", e.target.value)
                      }
                      className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      PDV (%)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.pdvPercentage}
                      onChange={(e) =>
                        handleInputChange("pdvPercentage", e.target.value)
                      }
                      className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Biletarnica naknada
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.biletarnicaFee}
                      onChange={(e) =>
                        handleInputChange("biletarnicaFee", e.target.value)
                      }
                      className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Valuta
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        handleInputChange("currency", e.target.value)
                      }
                      className="w-full h-10 px-3 rounded-md border border-gray-200 bg-gray-50 text-gray-900 text-sm"
                    >
                      <option value="EUR">EUR</option>
                      <option value="RSD">RSD</option>
                      <option value="BAM">BAM</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Organizer ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Organizator
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Naziv organizatora
                  </label>
                  <Input
                    value={formData.organizerName}
                    onChange={(e) =>
                      handleInputChange("organizerName", e.target.value)
                    }
                    placeholder="Npr. FK Buducnost"
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    Email organizatora
                  </label>
                  <Input
                    type="email"
                    value={formData.organizerEmail}
                    onChange={(e) =>
                      handleInputChange("organizerEmail", e.target.value)
                    }
                    placeholder="email@organizator.com"
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* ---- Event Type ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                  Tip prodaje
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.eventType === "simple"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300 bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="eventType"
                      value="simple"
                      checked={formData.eventType === "simple"}
                      onChange={(e) =>
                        handleInputChange("eventType", e.target.value)
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.eventType === "simple"
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">
                        Slobodna prodaja
                      </span>
                      <p className="text-xs text-gray-500">Bez mape sjedista</p>
                    </div>
                  </label>

                  <label
                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.eventType === "seats"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="eventType"
                      value="seats"
                      checked={formData.eventType === "seats"}
                      onChange={(e) =>
                        handleInputChange("eventType", e.target.value)
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.eventType === "seats"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">
                        Sa sjedistima
                      </span>
                      <p className="text-xs text-gray-500">Seats.io mapa</p>
                    </div>
                  </label>
                </div>

                {/* Seats.io keys */}
                {formData.eventType === "seats" && (
                  <div className="space-y-4 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                        <Key className="w-3.5 h-3.5" />
                        Workspace Key *
                      </label>
                      <Input
                        value={formData.workspaceKey}
                        onChange={(e) =>
                          handleInputChange("workspaceKey", e.target.value)
                        }
                        placeholder="Workspace Key"
                        className="bg-white border-gray-200 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                        <Key className="w-3.5 h-3.5" />
                        Event Key *
                      </label>
                      <Input
                        value={formData.eventKey}
                        onChange={(e) =>
                          handleInputChange("eventKey", e.target.value)
                        }
                        placeholder="Event Key"
                        className="bg-white border-gray-200 text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ---- Fiscalization ---- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableFiscalization}
                    onChange={(e) =>
                      handleInputChange("enableFiscalization", e.target.checked)
                    }
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <span className="font-semibold text-gray-800">
                      Fiskalizacija
                    </span>
                    <p className="text-xs text-gray-500">
                      Omoguci fiskalizaciju za ovu utakmicu
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================== */}
        {/* SUBMIT BUTTON */}
        {/* ======================================== */}
        <div className="mt-8 mb-12">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Spreman za kreiranje?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {matchName
                    ? `Utakmica: ${matchName}`
                    : "Popunite obavezna polja za kreiranje utakmice"}
                </p>
                {formData.competition && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formData.competition}
                    {formData.matchRound ? ` | ${formData.matchRound}` : ""}
                    {formData.venue ? ` | ${formData.venue}` : ""}
                    {formData.date ? ` | ${formData.date}` : ""}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !matchName}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-semibold rounded-xl shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Kreira se...
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5 mr-2" />
                    Kreiraj utakmicu
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdMatch;
