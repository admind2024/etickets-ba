import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Calendar,
  ExternalLink,
  ChevronRight,
  Loader2,
  Check,
  X,
  Edit2,
  Save,
  Link as LinkIcon,
  Mail,
  Phone,
  MapPin,
  FileText,
  Image,
  Upload,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface OrganizerData {
  name: string;
  url: string | null;
  description: string | null;
  logo: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  eventCount: number;
  eventIds: string[];
  events: {
    id: string;
    name: string;
    date: string;
    venue: string;
    slug: string;
  }[];
}

interface OrganizerForm {
  url: string;
  description: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

// ============================================
// 💾 LOCAL STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  SEARCH_TERM: "admin_organizers_search",
  EDITING_ORGANIZER: "admin_organizers_editing",
  EXPANDED_ORGANIZER: "admin_organizers_expanded",
  EDIT_FORM: "admin_organizers_edit_form",
};

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

const emptyForm: OrganizerForm = {
  url: "",
  description: "",
  logo: "",
  email: "",
  phone: "",
  address: "",
  city: "",
};

const AdminOrganizers = () => {
  const { toast } = useToast();
  const [organizers, setOrganizers] = useState<OrganizerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => loadFromLocalStorage(STORAGE_KEYS.SEARCH_TERM, ""));
  const [expandedOrganizer, setExpandedOrganizer] = useState<string | null>(() => loadFromLocalStorage(STORAGE_KEYS.EXPANDED_ORGANIZER, null));
  const [editingOrganizer, setEditingOrganizer] = useState<string | null>(() => loadFromLocalStorage(STORAGE_KEYS.EDITING_ORGANIZER, null));
  const [editForm, setEditForm] = useState<OrganizerForm>(() => loadFromLocalStorage(STORAGE_KEYS.EDIT_FORM, emptyForm));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    loadOrganizers();
  }, []);

  // 💾 Auto-save to localStorage
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.SEARCH_TERM, searchTerm); }, [searchTerm]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.EXPANDED_ORGANIZER, expandedOrganizer); }, [expandedOrganizer]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.EDITING_ORGANIZER, editingOrganizer); }, [editingOrganizer]);
  useEffect(() => { saveToLocalStorage(STORAGE_KEYS.EDIT_FORM, editForm); }, [editForm]);

  const loadOrganizers = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch events from AboutEvents (organizer names + event list)
      const { data: events, error } = await supabase
        .from("AboutEvents")
        .select(
          "id, name, date, venue, slug, organizer, organizer_url, organizer_description, organizer_logo, organizer_email, organizer_phone, organizer_address, organizer_city",
        )
        .not("organizer", "is", null)
        .not("organizer", "eq", "")
        .order("date", { ascending: false });

      if (error) {
        console.error("Load error:", error);
        throw error;
      }

      // 2. Fetch profile data from organizers table
      const { data: orgProfiles, error: orgError } = await supabase
        .from("organizers")
        .select("name, slug, logo, description, email, phone, website, address, city");

      if (orgError) {
        console.error("Organizers table error:", orgError);
      }

      // Build case-insensitive lookup from organizers table
      const profileMap = new Map<string, typeof orgProfiles extends (infer T)[] ? T : never>();
      (orgProfiles || []).forEach((p) => {
        if (p.name) profileMap.set(p.name.toLowerCase(), p);
      });

      // 3. Group events by organizer name (case-insensitive)
      const organizerMap = new Map<string, OrganizerData>();

      (events || []).forEach((event) => {
        const orgName = event.organizer?.trim();
        if (!orgName) return;

        const key = orgName.toLowerCase();

        if (!organizerMap.has(key)) {
          // Try to get profile data from organizers table
          const profile = profileMap.get(key);

          organizerMap.set(key, {
            name: orgName,
            url: profile?.website || null,
            description: profile?.description || null,
            logo: profile?.logo || null,
            email: profile?.email || null,
            phone: profile?.phone || null,
            address: profile?.address || null,
            city: profile?.city || null,
            eventCount: 0,
            eventIds: [],
            events: [],
          });
        }

        const org = organizerMap.get(key)!;
        org.eventCount++;
        org.eventIds.push(event.id);

        // Fill from AboutEvents only if organizers table didn't have data
        if (event.organizer_url && !org.url) org.url = event.organizer_url;
        if (event.organizer_description && !org.description) org.description = event.organizer_description;
        if (event.organizer_logo && !org.logo) org.logo = event.organizer_logo;
        if (event.organizer_email && !org.email) org.email = event.organizer_email;
        if (event.organizer_phone && !org.phone) org.phone = event.organizer_phone;
        if (event.organizer_address && !org.address) org.address = event.organizer_address;
        if (event.organizer_city && !org.city) org.city = event.organizer_city;

        org.events.push({
          id: event.id,
          name: event.name,
          date: event.date,
          venue: event.venue,
          slug: event.slug,
        });
      });

      const sortedOrganizers = Array.from(organizerMap.values()).sort((a, b) => b.eventCount - a.eventCount);

      setOrganizers(sortedOrganizers);
    } catch (error) {
      console.error("Error loading organizers:", error);
      toast({
        title: "Greška",
        description: "Nije moguće učitati organizatore",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (org: OrganizerData) => {
    setEditingOrganizer(org.name);
    setEditForm({
      url: org.url || "",
      description: org.description || "",
      logo: org.logo || "",
      email: org.email || "",
      phone: org.phone || "",
      address: org.address || "",
      city: org.city || "",
    });
    setExpandedOrganizer(null);
  };

  const cancelEditing = () => {
    clearFromLocalStorage(STORAGE_KEYS.EDITING_ORGANIZER);
    clearFromLocalStorage(STORAGE_KEYS.EDIT_FORM);
    setEditingOrganizer(null);
    setEditForm(emptyForm);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Greška", description: "Maksimalna veličina je 2MB", variant: "destructive" });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Greška", description: "Koristite JPG, PNG ili WebP", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = "organizer-" + Date.now() + "." + fileExt;
      const filePath = "organizers/" + fileName;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(filePath);

      setEditForm((prev) => ({ ...prev, logo: urlData.publicUrl }));

      toast({ title: "Uspješno", description: "Logo je uploadovan" });
    } catch (error: any) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const saveOrganizer = async (org: OrganizerData) => {
    setIsSaving(true);
    try {
      console.log("=== SAVING ORGANIZER ===");
      console.log("Organizer name:", org.name);
      console.log("Form data:", editForm);
      console.log("Event IDs:", org.eventIds);

      // Use eventIds from the organizer object (already grouped case-insensitively)
      const eventIds = org.eventIds;
      console.log("Event IDs to update:", eventIds.length);

      if (eventIds.length === 0) {
        toast({
          title: "Greška",
          description: "Nema događaja za ovog organizatora",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Generiši URL naše stranice ako korisnik nije unio eksterni URL
      const organizerSlug = encodeURIComponent(org.name);
      const defaultOrganizerUrl = "https://etickets.ba/organizatori/" + organizerSlug;
      const finalUrl = editForm.url && editForm.url.trim() !== "" ? editForm.url : defaultOrganizerUrl;

      const updateData: Record<string, any> = {
        organizer: org.name, // Normalize name across all events
        organizer_url: finalUrl,
        organizer_description: editForm.description || null,
        organizer_logo: editForm.logo || null,
        organizer_email: editForm.email || null,
        organizer_phone: editForm.phone || null,
        organizer_address: editForm.address || null,
        organizer_city: editForm.city || null,
      };

      console.log("Update data:", updateData);

      let updatedCount = 0;
      const errors: string[] = [];

      for (const eventId of org.eventIds) {
        console.log("Updating event ID:", eventId);

        const { data: updateResult, error: updateError } = await supabase
          .from("AboutEvents")
          .update(updateData)
          .eq("id", eventId)
          .select();

        if (updateError) {
          console.error("Update error for event " + eventId + ":", updateError);
          errors.push(eventId + ": " + updateError.message);
        } else if (updateResult && updateResult.length > 0) {
          console.log("Updated event:", updateResult[0].id);
          updatedCount++;
        } else {
          console.log("No rows updated for event:", eventId);
        }
      }

      console.log("Total updated:", updatedCount);
      console.log("Errors:", errors);

      if (updatedCount === 0) {
        toast({
          title: "⚠️ Upozorenje",
          description: "Nijedan događaj nije ažuriran. Greške: " + errors.join(", "),
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      setOrganizers((prev) =>
        prev.map((o) =>
          o.name.toLowerCase() === org.name.toLowerCase()
            ? {
                ...o,
                url: finalUrl,
                description: editForm.description || null,
                logo: editForm.logo || null,
                email: editForm.email || null,
                phone: editForm.phone || null,
                address: editForm.address || null,
                city: editForm.city || null,
              }
            : o,
        ),
      );

      toast({
        title: "✅ Sačuvano",
        description: "Ažurirano " + updatedCount + " od " + org.eventIds.length + ' događaja za "' + org.name + '"',
      });

      // Also save to organizers table (upsert by name)
      const organizerSlugValue = org.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/č/g, "c").replace(/ć/g, "c").replace(/š/g, "s").replace(/ž/g, "z").replace(/đ/g, "dj")
        .replace(/&/g, "and").replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");

      const { error: orgUpsertError } = await supabase
        .from("organizers")
        .upsert({
          name: org.name,
          slug: organizerSlugValue,
          logo: editForm.logo || null,
          description: editForm.description || null,
          email: editForm.email || null,
          phone: editForm.phone || null,
          website: finalUrl,
          address: editForm.address || null,
          city: editForm.city || null,
        }, { onConflict: "name" });

      if (orgUpsertError) {
        console.error("Organizers table upsert error:", orgUpsertError);
      }

      if (editForm.description && editForm.description.trim() !== "") {
        toast({
          title: "🌐 Prevod u toku...",
          description: "Prevodim opis organizatora na EN i RU...",
        });

        try {
          const { error: translateError } = await supabase.functions.invoke("translate-organizer", {
            body: { organizer_name: org.name },
          });

          if (translateError) {
            console.error("Translation error:", translateError);
            toast({
              title: "⚠️ Prevod nije uspio",
              description: "Podaci su sačuvani ali prevod nije uspio",
              variant: "destructive",
            });
          } else {
            toast({
              title: "✅ Prevod završen",
              description: "Opis je preveden na engleski i ruski",
            });
          }
        } catch (translateErr: any) {
          console.error("Translation error:", translateErr);
        }
      }

      // 💾 Očisti localStorage nakon uspješnog save-a
      clearFromLocalStorage(STORAGE_KEYS.EDITING_ORGANIZER);
      clearFromLocalStorage(STORAGE_KEYS.EDIT_FORM);

      setEditingOrganizer(null);
      setEditForm(emptyForm);
    } catch (error: any) {
      console.error("Error saving organizer:", error);
      toast({
        title: "Greška",
        description: error.message || "Nije moguće sačuvati podatke",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOrganizers = organizers.filter((org) => org.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("sr-Latn-ME", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const toggleExpand = (name: string) => {
    if (editingOrganizer) return;
    setExpandedOrganizer(expandedOrganizer === name ? null : name);
  };

  const hasCompleteProfile = (org: OrganizerData) => {
    return org.url && org.description && org.logo;
  };

  const organizersComplete = organizers.filter(hasCompleteProfile).length;
  const organizersPartial = organizers.filter(
    (o) => (o.url || o.description || o.logo) && !hasCompleteProfile(o),
  ).length;
  const organizersEmpty = organizers.filter((o) => !o.url && !o.description && !o.logo).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Organizatori</h2>
              <p className="text-sm text-gray-500">Upravljanje profilima organizatora za Google SEO</p>
            </div>
          </div>
          <Button onClick={loadOrganizers} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Osvježi
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pretraži organizatore..."
            className="pl-10 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{organizers.length}</p>
              <p className="text-sm text-gray-500">Ukupno</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{organizersComplete}</p>
              <p className="text-sm text-gray-500">Kompletni</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{organizersPartial}</p>
              <p className="text-sm text-gray-500">Djelimični</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{organizersEmpty}</p>
              <p className="text-sm text-gray-500">Bez podataka</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Lista organizatora</h3>
        </div>

        {filteredOrganizers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? "Nema rezultata pretrage" : "Nema organizatora"}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredOrganizers.map((org) => (
              <div key={org.name} className="bg-white">
                <div
                  onClick={() => toggleExpand(org.name)}
                  className={
                    "flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors " +
                    (editingOrganizer === org.name ? "bg-purple-50" : "")
                  }
                >
                  <div className="flex items-center gap-4 flex-1">
                    {org.logo ? (
                      <img
                        src={org.logo}
                        alt={org.name}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                      />
                    ) : (
                      <div
                        className={
                          "w-12 h-12 rounded-xl flex items-center justify-center " +
                          (hasCompleteProfile(org)
                            ? "bg-green-100"
                            : org.url || org.description
                              ? "bg-amber-100"
                              : "bg-gray-100")
                        }
                      >
                        <Building2
                          className={
                            "w-6 h-6 " +
                            (hasCompleteProfile(org)
                              ? "text-green-600"
                              : org.url || org.description
                                ? "text-amber-600"
                                : "text-gray-400")
                          }
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{org.name}</h4>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {org.eventCount} događaja
                        </span>
                        {hasCompleteProfile(org) && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            ✓ Kompletan
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                        {org.url && (
                          <span className="flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" />
                            Web
                          </span>
                        )}
                        {org.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email
                          </span>
                        )}
                        {org.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Tel
                          </span>
                        )}
                        {org.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {org.city}
                          </span>
                        )}
                        {!org.url && !org.email && !org.phone && !org.city && (
                          <span className="text-amber-600">Nema podataka</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(org);
                      }}
                      className="h-9 px-3"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Uredi
                    </Button>
                    <Link
                      to={"/organizatori/" + encodeURIComponent(org.name)}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <ChevronRight
                      className={
                        "w-5 h-5 text-gray-400 transition-transform " +
                        (expandedOrganizer === org.name ? "rotate-90" : "")
                      }
                    />
                  </div>
                </div>

                {editingOrganizer === org.name && (
                  <div className="bg-purple-50 border-t border-purple-100 px-5 py-6">
                    <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                      <Edit2 className="w-4 h-4" />
                      Uredi profil: {org.name}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <Image className="w-4 h-4 inline mr-1" />
                          Logo
                        </label>
                        <div className="flex items-center gap-4">
                          {editForm.logo ? (
                            <img
                              src={editForm.logo}
                              alt="Logo preview"
                              className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
                              <Image className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <Input
                              value={editForm.logo}
                              onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
                              placeholder="https://... ili uploaduj"
                              className="mb-2"
                            />
                            <div className="flex gap-2">
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={handleLogoUpload}
                                  className="hidden"
                                />
                                <Button type="button" variant="outline" size="sm" asChild>
                                  <span>
                                    {isUploadingLogo ? (
                                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                    ) : (
                                      <Upload className="w-4 h-4 mr-1" />
                                    )}
                                    Upload
                                  </span>
                                </Button>
                              </label>
                              {editForm.logo && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditForm({ ...editForm, logo: "" })}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <LinkIcon className="w-4 h-4 inline mr-1" />
                          Web stranica (eksterni URL)
                        </label>
                        <Input
                          value={editForm.url}
                          onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                          placeholder="https://www.organizator.com (opciono)"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ako ostavite prazno, koristit će se naša stranica organizatora
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Email
                        </label>
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="kontakt@organizator.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <Phone className="w-4 h-4 inline mr-1" />
                          Telefon
                        </label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="+382 69 123 456"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Grad
                        </label>
                        <Input
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          placeholder="Podgorica"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Adresa
                        </label>
                        <Input
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          placeholder="Ulica i broj"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          <FileText className="w-4 h-4 inline mr-1" />
                          Opis organizatora
                        </label>
                        <Textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Kratki opis organizatora za SEO..."
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-purple-200">
                      <p className="text-sm text-purple-700">
                        Promjene će se primijeniti na <strong>{org.eventCount}</strong> događaja
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={cancelEditing}>
                          Otkaži
                        </Button>
                        <Button
                          onClick={() => saveOrganizer(org)}
                          disabled={isSaving}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Sačuvaj
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {expandedOrganizer === org.name && editingOrganizer !== org.name && (
                  <div className="bg-gray-50 border-t border-gray-100 px-5 py-4">
                    <h5 className="text-sm font-medium text-gray-600 mb-3">Događaji:</h5>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {org.events.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{event.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(event.date)} • {event.venue || "N/A"}
                              </p>
                            </div>
                          </div>
                          <Link
                            to={"/dogadjaj/" + event.slug}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Pogledaj →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Google SEO:</strong> Dodajte logo, opis i kontakt podatke organizatora. Podaci se automatski
          kopiraju na sve događaje istog organizatora. Opis se automatski prevodi na EN i RU nakon čuvanja.
        </p>
      </div>
    </div>
  );
};

export default AdminOrganizers;
