import { useState, useEffect } from "react";
import {
  CalendarPlus,
  Calendar,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Check,
  RefreshCw,
  Building2,
  Receipt,
  MapPin,
  LayoutGrid,
  X,
  Music,
  ChevronDown,
  FileText,
  HelpCircle,
  Car,
  Sparkles,
  Languages,
  Youtube,
  Key,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useVenues } from "@/hooks/useVenues";
import { usePerformers } from "@/hooks/usePerformers";
import { useOrganizersDb } from "@/hooks/useOrganizersDb";

// ============================================
// 💾 LOCALSTORAGE KLJUČEVI
// ============================================
const STORAGE_KEY = "adEvents_formData";
const IMAGE_PREVIEW_KEY = "adEvents_imagePreview";
const LAST_SAVED_KEY = "adEvents_lastSaved";

interface TicketCategory {
  category: string;
  price: number;
  type?: "regular" | "table";
  tableFixedPrice?: number;
  description?: string;
}

interface EventTerm {
  id: string;
  date: string;
  event_time: string;
  categories: TicketCategory[];
  eventKey?: string;
  image?: string;
  imagePreview?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface Organizer {
  name: string;
  email: string;
  activeStatus: boolean;
}

interface OrganizerDetails {
  businessName: string;
  pib: string;
  contactPerson: string;
  phone: string;
  email: string;
  bankAccount: string;
  organizerSlug: string;
}

interface EventFormData {
  name: string;
  venue: string;
  venueCity: string;
  category: string;
  info: string;
  seoTitle: string;
  seoDescription: string;
  longDescription: string;
  faq: FAQItem[];
  venueInfo: string;
  parkingInfo: string;
  serviceFeePercentage: string;
  pdvPercentage: string;
  biletarnicaFee: string;
  currency: string;
  workspaceKey: string;
  eventKey: string;
  eventType: "seats" | "simple";
  terms: EventTerm[];
  organizers: Organizer[];
  organizerDetails: OrganizerDetails;
  enableFiscalization: boolean;
  image: string;
  performers: string[];
  youtube: string;
}

const generateTermId = () => Math.random().toString(36).substring(2, 9);

const initialFormData: EventFormData = {
  name: "",
  venue: "",
  venueCity: "",
  category: "",
  info: "",
  seoTitle: "",
  seoDescription: "",
  longDescription: "",
  faq: [{ question: "", answer: "" }],
  venueInfo: "",
  parkingInfo: "",
  serviceFeePercentage: "5",
  pdvPercentage: "21",
  biletarnicaFee: "0",
  currency: "EUR",
  workspaceKey: "dbc346de-4a9e-4d5b-bd46-d90b8fa50323",
  eventKey: "",
  eventType: "seats",
  terms: [
    {
      id: generateTermId(),
      date: "",
      event_time: "",
      categories: [{ category: "", price: 0, type: "regular" }],
      eventKey: "",
    },
  ],
  organizers: [{ name: "", email: "", activeStatus: true }],
  organizerDetails: {
    businessName: "",
    pib: "",
    contactPerson: "",
    phone: "",
    email: "",
    bankAccount: "",
    organizerSlug: "",
  },
  enableFiscalization: false,
  image: "",
  performers: [],
  youtube: "",
};

const normalizeText = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const generateSlug = (name: string, venue: string, city: string, date: string, time: string): string => {
  const namePart = normalizeText(name);
  const venuePart = normalizeText(venue);
  const cityPart = normalizeText(city);
  const datePart = date || "";
  const timePart = time ? time.replace(":", "-") : "";
  const parts = [namePart, venuePart, cityPart, datePart];
  if (timePart) parts.push(timePart);
  return parts.filter((p) => p).join("-");
};

const formatDateForH1 = (dateStr: string): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = [
      "januar",
      "februar",
      "mart",
      "april",
      "maj",
      "jun",
      "jul",
      "avgust",
      "septembar",
      "oktobar",
      "novembar",
      "decembar",
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}. ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

const countWords = (text: string): number => {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
};

const translateEvent = async (eventId: number | string): Promise<boolean> => {
  try {
    console.log(`🌐 Pokrećem prevod za događaj ID: ${eventId}`);

    const { data, error } = await supabase.functions.invoke("translate-event", {
      body: { event_id: eventId },
    });

    if (error) {
      console.error("❌ Greška pri prevodu:", error);
      return false;
    }

    console.log("✅ Prevod uspješan:", data);
    return true;
  } catch (err) {
    console.error("❌ Prevod nije uspio:", err);
    return false;
  }
};

// ============================================
// 🖼️ HELPER: Base64 to File conversion
// ============================================
const base64ToFile = async (base64String: string, fileName: string): Promise<File | null> => {
  try {
    const response = await fetch(base64String);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type });
  } catch (error) {
    console.error("Greška pri konverziji base64 u File:", error);
    return null;
  }
};

const AdEvents = () => {
  const { toast } = useToast();

  // ============================================
  // 💾 UČITAJ PODATKE IZ LOCALSTORAGE
  // ============================================
  const [formData, setFormData] = useState<EventFormData>(() => {
    if (typeof window === "undefined") return initialFormData;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const updatedTerms = (parsed.terms || initialFormData.terms).map((term: EventTerm) => ({
          ...term,
          eventKey: term.eventKey || "",
        }));
        return { ...initialFormData, ...parsed, youtube: parsed.youtube || "", terms: updatedTerms };
      }
    } catch (error) {
      console.error("Greška pri učitavanju podataka iz localStorage:", error);
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [hasApplicationsTable, setHasApplicationsTable] = useState(true);
  const [isSavingToStorage, setIsSavingToStorage] = useState(false);

  const { data: venues = [] } = useVenues();
  const { data: performers = [] } = usePerformers();
  const { data: organizersFromDb = [] } = useOrganizersDb();

  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [showPerformerDropdown, setShowPerformerDropdown] = useState(false);
  const [showOrganizerDropdown, setShowOrganizerDropdown] = useState(false);
  const [venueSearch, setVenueSearch] = useState("");
  const [performerSearch, setPerformerSearch] = useState("");
  const [organizerSearch, setOrganizerSearch] = useState("");

  const firstTerm = formData.terms[0];

  const generatedH1 = [formData.name, formData.venueCity, firstTerm?.date ? formatDateForH1(firstTerm.date) : ""]
    .filter(Boolean)
    .join(" | ");

  const wordCount = countWords(formData.longDescription);
  const wordCountColor = wordCount >= 300 ? "text-green-600" : wordCount >= 150 ? "text-amber-600" : "text-red-500";

  const allSlugs = formData.terms
    .map((term) => generateSlug(formData.name, formData.venue, formData.venueCity, term.date, term.event_time))
    .filter((s) => s);

  // ============================================
  // 💾 SAČUVAJ PODATKE U LOCALSTORAGE AUTOMATSKI
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
        console.error("Greška pri čuvanju u localStorage:", error);
        toast({
          title: "⚠️ Greška pri auto-čuvanju",
          description: "Podaci se možda nisu ispravno sačuvali",
          variant: "destructive",
        });
      } finally {
        setIsSavingToStorage(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData, toast]);

  // 🖼️ Sačuvaj sliku preview u localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (imagePreview) {
        localStorage.setItem(IMAGE_PREVIEW_KEY, imagePreview);
      } else {
        localStorage.removeItem(IMAGE_PREVIEW_KEY);
      }
    } catch (error) {
      console.error("Greška pri čuvanju slike:", error);
    }
  }, [imagePreview]);

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    if (generatedH1 && !formData.seoTitle) {
      setFormData((prev) => ({ ...prev, seoTitle: generatedH1 }));
    }
  }, [formData.name, formData.venueCity, firstTerm?.date]);

  const loadApplications = async () => {
    setIsLoadingApplications(true);
    try {
      const { data, error } = await supabase
        .from("EventApplications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        setHasApplicationsTable(false);
        setApplications([]);
      } else {
        setHasApplicationsTable(true);
        setApplications(data || []);
      }
    } catch (error) {
      setHasApplicationsTable(false);
      setApplications([]);
    } finally {
      setIsLoadingApplications(false);
    }
  };

  const handleApplicationSelect = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    if (!applicationId) return;

    const app = applications.find((a) => a.id === applicationId);
    if (!app) return;

    let categories: TicketCategory[] = [{ category: "", price: 0, type: "regular" }];
    if (app.categoriesJson) {
      try {
        const parsed = typeof app.categoriesJson === "string" ? JSON.parse(app.categoriesJson) : app.categoriesJson;
        if (Array.isArray(parsed) && parsed.length > 0) {
          categories = parsed.map((c: any) => ({
            category: c.category || c.name || "",
            price: parseFloat(c.price || 0),
            type: c.type || "regular",
          }));
        }
      } catch (e) {
        console.error("Error parsing categories:", e);
      }
    }

    const isVatRegistered = app.vatRegistered === "DA" || app.vatRegistered === true;

    setFormData({
      ...formData,
      name: app.eventName || "",
      venue: app.venueName || "",
      venueCity: app.venueCity || "",
      category: app.category || "",
      info: app.eventDescription || "",
      currency: app.currency || "EUR",
      pdvPercentage: isVatRegistered ? "21" : "0",
      terms: [
        {
          id: generateTermId(),
          date: app.eventDate ? String(app.eventDate).split("T")[0] : "",
          event_time: app.eventTime || "",
          categories,
          eventKey: "",
        },
      ],
      organizers: [
        {
          name: app.contactPerson || app.authorizedPerson || "",
          email: app.email || "",
          activeStatus: true,
        },
      ],
      organizerDetails: {
        businessName: app.businessName || "",
        pib: app.pib || "",
        contactPerson: app.contactPerson || "",
        phone: app.phone || "",
        email: app.email || "",
        bankAccount: app.bankAccount || "",
        organizerSlug: "",
      },
      image: app.poster || "",
      performers: [],
      youtube: app.youtube || "",
    });

    // 🖼️ ISPRAVKA: Postavi i imagePreview i formData.image
    if (app.poster) {
      setImagePreview(app.poster);
    }

    toast({ title: "Podaci učitani", description: "Podaci iz prijave su automatski popunjeni" });
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOrganizerDetailsChange = (field: keyof OrganizerDetails, value: string) => {
    setFormData((prev) => ({
      ...prev,
      organizerDetails: { ...prev.organizerDetails, [field]: value },
    }));
  };

  const handleVenueSelect = (venue: any) => {
    setFormData((prev) => ({
      ...prev,
      venue: venue.name,
      venueCity: venue.city || "",
      venueInfo: venue.description || prev.venueInfo,
      parkingInfo: venue.parking || prev.parkingInfo,
    }));
    setVenueSearch("");
    setShowVenueDropdown(false);
  };

  const handlePerformerSelect = (performer: any) => {
    if (!formData.performers.includes(performer.name)) {
      setFormData((prev) => ({
        ...prev,
        performers: [...prev.performers, performer.name],
      }));
    }
    setPerformerSearch("");
    setShowPerformerDropdown(false);
  };

  const removePerformer = (performerName: string) => {
    setFormData((prev) => ({
      ...prev,
      performers: prev.performers.filter((p) => p !== performerName),
    }));
  };

  const addFAQItem = () => {
    setFormData((prev) => ({
      ...prev,
      faq: [...prev.faq, { question: "", answer: "" }],
    }));
  };

  const removeFAQItem = (index: number) => {
    if (formData.faq.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      faq: prev.faq.filter((_, i) => i !== index),
    }));
  };

  const updateFAQItem = (index: number, field: "question" | "answer", value: string) => {
    setFormData((prev) => ({
      ...prev,
      faq: prev.faq.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addTerm = () => {
    const defaultCategories = formData.terms[0]?.categories || [{ category: "", price: 0, type: "regular" }];
    setFormData((prev) => ({
      ...prev,
      terms: [
        ...prev.terms,
        {
          id: generateTermId(),
          date: "",
          event_time: "",
          categories: defaultCategories.map((c) => ({ ...c })),
          eventKey: "",
        },
      ],
    }));
  };

  const removeTerm = (termId: string) => {
    if (formData.terms.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.filter((t) => t.id !== termId),
    }));
  };

  const updateTerm = (termId: string, field: keyof EventTerm, value: any) => {
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.map((t) => (t.id === termId ? { ...t, [field]: value } : t)),
    }));
  };

  const addCategoryToTerm = (termId: string) => {
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.map((t) =>
        t.id === termId ? { ...t, categories: [...t.categories, { category: "", price: 0, type: "regular" }] } : t,
      ),
    }));
  };

  const removeCategoryFromTerm = (termId: string, catIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.map((t) =>
        t.id === termId ? { ...t, categories: t.categories.filter((_, i) => i !== catIndex) } : t,
      ),
    }));
  };

  const updateCategoryInTerm = (termId: string, catIndex: number, field: keyof TicketCategory, value: any) => {
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.map((t) =>
        t.id === termId
          ? {
              ...t,
              categories: t.categories.map((cat, i) => (i === catIndex ? { ...cat, [field]: value } : cat)),
            }
          : t,
      ),
    }));
  };

  const copyPricesToAllTerms = () => {
    if (formData.terms.length <= 1) return;
    const firstTermCategories = formData.terms[0].categories;
    setFormData((prev) => ({
      ...prev,
      terms: prev.terms.map((t, i) => (i === 0 ? t : { ...t, categories: firstTermCategories.map((c) => ({ ...c })) })),
    }));
    toast({ title: "Kopirano", description: "Cijene su kopirane u sve termine" });
  };

  const filteredVenues = venues.filter(
    (v) =>
      v.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
      v.city.toLowerCase().includes(venueSearch.toLowerCase()),
  );

  const filteredPerformers = performers.filter((p) => {
    const search = performerSearch.toLowerCase().trim();
    if (!search) return true;
    const searchWords = search.split(/\s+/);
    const name = p.name.toLowerCase();
    return searchWords.every((word) => {
      const nameWords = name.split(/\s+/);
      return nameWords.some((nw) => nw.startsWith(word));
    });
  });

  const filteredOrganizersFromDb = organizersFromDb.filter(
    (o) =>
      o.name.toLowerCase().includes(organizerSearch.toLowerCase()) ||
      o.slug?.toLowerCase().includes(organizerSearch.toLowerCase()) ||
      o.city?.toLowerCase().includes(organizerSearch.toLowerCase()),
  );

  const handleOrganizerFromDbSelect = (organizer: any) => {
    setFormData((prev) => ({
      ...prev,
      organizerDetails: {
        ...prev.organizerDetails,
        businessName: organizer.name || "",
        contactPerson: organizer.name || "",
        phone: organizer.phone || "",
        email: organizer.email || "",
        organizerSlug: organizer.slug || "",
      },
    }));
    setOrganizerSearch("");
    setShowOrganizerDropdown(false);
  };

  const addOrganizer = () => {
    setFormData((prev) => ({
      ...prev,
      organizers: [...prev.organizers, { name: "", email: "", activeStatus: true }],
    }));
  };

  const removeOrganizer = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      organizers: prev.organizers.filter((_, i) => i !== index),
    }));
  };

  const updateOrganizer = (index: number, field: keyof Organizer, value: any) => {
    setFormData((prev) => ({
      ...prev,
      organizers: prev.organizers.map((org, i) => (i === index ? { ...org, [field]: value } : org)),
    }));
  };

  // ============================================
  // 🖼️ HANDLE IMAGE CHANGE - čuva kao base64
  // ============================================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Greška", description: "Maksimalna veličina je 5MB.", variant: "destructive" });
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        toast({ title: "Greška", description: "Koristite JPG, PNG, WebP ili GIF.", variant: "destructive" });
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

  // ============================================
  // 🖼️ UPLOAD IMAGE - koristi base64 iz localStorage
  // ============================================
  const uploadImage = async (slug: string): Promise<string | null> => {
    console.log("🖼️ uploadImage pozvana");
    console.log("🖼️ formData.image:", formData.image);
    console.log("🖼️ imagePreview postoji:", !!imagePreview);

    // 1. Ako postoji URL u formData.image (npr. iz prijave), koristi ga
    if (formData.image && formData.image.startsWith("http")) {
      console.log("🖼️ Koristim postojeći URL iz formData:", formData.image);
      return formData.image;
    }

    // 2. Ako postoji base64 slika u imagePreview, uploaduj je
    if (imagePreview && imagePreview.startsWith("data:")) {
      console.log("🖼️ Uploadujem base64 sliku iz localStorage...");
      setIsUploadingImage(true);

      try {
        // Konvertuj base64 u File
        const file = await base64ToFile(imagePreview, `${slug}-${Date.now()}.jpg`);
        if (!file) {
          throw new Error("Nije moguće konvertovati sliku");
        }

        console.log("🖼️ Fajl kreiran:", file.name, "veličina:", file.size);

        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${slug}-${Date.now()}.${fileExt}`;
        const filePath = `events/${fileName}`;

        const { error } = await supabase.storage.from("event-images").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

        if (error) {
          console.error("🖼️ Upload error:", error);
          throw error;
        }

        const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(filePath);
        console.log("🖼️ Upload uspješan! URL:", urlData.publicUrl);
        return urlData.publicUrl;
      } catch (error: any) {
        console.error("🖼️ Greška pri uploadu:", error);
        toast({ title: "Greška pri uploadu slike", description: error.message, variant: "destructive" });
        return null;
      } finally {
        setIsUploadingImage(false);
      }
    }

    // 3. Ako imagePreview postoji kao URL (npr. učitan iz prijave)
    if (imagePreview && imagePreview.startsWith("http")) {
      console.log("🖼️ Koristim postojeći URL iz imagePreview:", imagePreview);
      return imagePreview;
    }

    console.log("🖼️ Nema slike za upload");
    return null;
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: "" }));
  };

  // ============================================
  // KRAJ PRVE POLOVINE - ČEKAM KOMANDU ZA DRUGU
  // ============================================
  // ============================================
  // DRUGA POLOVINA - NASTAVAK OD handleSubmit
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("📸 Submit započet");
    console.log("📸 formData.image:", formData.image);
    console.log("📸 imagePreview:", imagePreview ? imagePreview.substring(0, 50) + "..." : "null");

    if (!formData.name) {
      toast({ title: "Greška", description: "Unesite naziv događaja", variant: "destructive" });
      return;
    }

    const invalidTerms = formData.terms.filter((t) => !t.date);
    if (invalidTerms.length > 0) {
      toast({ title: "Greška", description: "Svi termini moraju imati datum", variant: "destructive" });
      return;
    }

    if (formData.eventType === "seats") {
      if (!formData.workspaceKey) {
        toast({ title: "Greška", description: "Unesite Workspace Key", variant: "destructive" });
        return;
      }

      const termsWithoutKey = formData.terms.filter((t, i) => {
        if (i === 0) return !formData.eventKey && !t.eventKey;
        return !t.eventKey;
      });

      if (termsWithoutKey.length > 0) {
        toast({
          title: "Greška",
          description: `Svi termini moraju imati Event Key (nedostaje za ${termsWithoutKey.length} termin/a)`,
          variant: "destructive",
        });
        return;
      }
    }

    if (wordCount < 300) {
      const proceed = window.confirm(`Opis ima samo ${wordCount} riječi (preporučeno 300+). Nastaviti?`);
      if (!proceed) return;
    }

    setIsSubmitting(true);

    try {
      const firstSlug = generateSlug(
        formData.name,
        formData.venue,
        formData.venueCity,
        formData.terms[0].date,
        formData.terms[0].event_time,
      );

      // 🖼️ Upload slike - sada koristi base64 iz localStorage
      const imageUrl = await uploadImage(firstSlug);
      console.log("📸 imageUrl nakon uploada:", imageUrl);

      const createdEvents: string[] = [];
      const createdEventIds: number[] = [];

      for (let i = 0; i < formData.terms.length; i++) {
        const term = formData.terms[i];
        const slug = generateSlug(formData.name, formData.venue, formData.venueCity, term.date, term.event_time);

        let currentEventId: string;
        if (formData.eventType === "seats") {
          if (i === 0) {
            currentEventId = term.eventKey || formData.eventKey;
          } else {
            currentEventId = term.eventKey || "";
          }
        } else {
          currentEventId = slug;
        }

        const categoriesText = term.categories
          .filter((c) => c.category)
          .map((c) => `${c.category} - ${c.price} ${formData.currency}`)
          .join(", ");

        const descriptionJson = term.categories
          .filter((c) => c.category)
          .map((c) => ({
            category: c.category,
            price: c.price,
            type: c.type || "regular",
            tableFixedPrice: c.tableFixedPrice || 0,
            description: c.description || "",
          }));

        const validFaq = formData.faq.filter((f) => f.question.trim() && f.answer.trim());

        const aboutEventsData: any = {
          name: formData.name,
          slug,
          date: term.date,
          event_time: term.event_time,
          venue: formData.venue,
          category: formData.category,
          info: formData.info,
          seo_title: formData.seoTitle || generatedH1,
          seo_description: formData.seoDescription || formData.info?.substring(0, 160),
          long_description: formData.longDescription,
          faq: validFaq,
          venue_info: formData.venueInfo,
          parking_info: formData.parkingInfo,
          serviceFeePercentage: formData.serviceFeePercentage,
          pdvPercentage: formData.pdvPercentage,
          biletarnicaFee: formData.biletarnicaFee,
          currency: formData.currency,
          eventType: formData.eventType,
          categories: categoriesText,
          description: descriptionJson,
          link: `/event/${slug}`,
          organizer: formData.organizers[0]?.name || formData.organizerDetails.contactPerson || "",
          email: formData.organizers[0]?.email || formData.organizerDetails.email || "",
          performer: formData.performers.length > 0 ? formData.performers.join(", ") : null,
          status: "active",
          hide: "false",
          eventId: currentEventId,
          organizer_slug: formData.organizerDetails.organizerSlug || null,
          youtube: formData.youtube || null,
        };

        // 🖼️ Slika: koristi sliku termina ako postoji, inače globalnu
        let termImageUrl: string | null = null;

        if (term.imagePreview && term.imagePreview.startsWith("data:")) {
          // Upload base64 slike termina
          try {
            const termFile = await base64ToFile(term.imagePreview, `${slug}-${Date.now()}.jpg`);
            if (termFile) {
              const fileExt = termFile.name.split(".").pop() || "jpg";
              const fileName = `${slug}-${Date.now()}.${fileExt}`;
              const filePath = `events/${fileName}`;
              const { error: uploadErr } = await supabase.storage.from("event-images").upload(filePath, termFile, {
                cacheControl: "3600",
                upsert: false,
              });
              if (!uploadErr) {
                const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(filePath);
                termImageUrl = urlData.publicUrl;
              }
            }
          } catch (err) {
            console.error("🖼️ Greška pri uploadu slike termina:", err);
          }
        } else if (term.image && term.image.startsWith("http")) {
          termImageUrl = term.image;
        }

        const finalImage = termImageUrl || imageUrl;
        if (finalImage) {
          aboutEventsData.image = finalImage;
          console.log("📸 Dodajem sliku u event data:", finalImage);
        }

        if (formData.eventType === "seats") {
          aboutEventsData.workspaceKey = formData.workspaceKey;
          aboutEventsData.eventKey = currentEventId;
        }

        console.log("📤 Šaljem u bazu:", {
          termin: i + 1,
          eventKey: currentEventId,
          organizer_slug: aboutEventsData.organizer_slug,
          youtube: aboutEventsData.youtube,
          image: aboutEventsData.image,
        });

        const { data: insertedEvent, error: insertError } = await supabase
          .from("AboutEvents")
          .insert(aboutEventsData)
          .select()
          .single();

        if (insertError) {
          console.error("❌ Greška pri insertu:", insertError);
          throw insertError;
        }

        console.log("✅ Upisano u bazu:", insertedEvent);

        createdEvents.push(slug);

        if (insertedEvent?.id) {
          createdEventIds.push(insertedEvent.id);
        }

        if (formData.organizers.length > 0) {
          const organizersData = formData.organizers
            .filter((o) => o.email)
            .map((o) => ({
              eventName: formData.name,
              eventId: currentEventId,
              name: o.name || null,
              email: o.email,
              activeStatus: o.activeStatus ? "true" : "false",
            }));

          if (organizersData.length > 0) {
            await supabase.from("Organizers").insert(organizersData);
          }
        }

        if (formData.enableFiscalization) {
          await supabase.from("Fiscalization").insert({
            eventId: currentEventId,
            title: formData.name,
            enableFiscalization: true,
            businessName: formData.organizerDetails.businessName || null,
            pib: formData.organizerDetails.pib || null,
          });
        }
      }

      if (selectedApplicationId && hasApplicationsTable) {
        await supabase
          .from("EventApplications")
          .update({
            status: "Processed",
            processedDate: new Date().toISOString(),
            createdEventId: createdEvents.join(", "),
          })
          .eq("id", selectedApplicationId);
      }

      toast({
        title: "✅ Događaj kreiran!",
        description: `Kreirano ${createdEvents.length} događaj: ${formData.name}`,
      });

      if (createdEventIds.length > 0) {
        setIsTranslating(true);

        toast({
          title: "🌐 Prevod u toku...",
          description: "Prevodim događaj na engleski jezik...",
        });

        let translationSuccessCount = 0;

        for (const eventId of createdEventIds) {
          const success = await translateEvent(eventId);
          if (success) {
            translationSuccessCount++;
          }
        }

        setIsTranslating(false);

        if (translationSuccessCount === createdEventIds.length) {
          toast({
            title: "✅ Prevod završen!",
            description: `Svi događaji (${translationSuccessCount}) su prevedeni na EN`,
          });
        } else if (translationSuccessCount > 0) {
          toast({
            title: "⚠️ Djelimičan prevod",
            description: `Prevedeno ${translationSuccessCount}/${createdEventIds.length} događaja`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "❌ Prevod nije uspio",
            description: "Događaji su kreirani ali nisu prevedeni. Pokušajte ručno.",
            variant: "destructive",
          });
        }
      }

      // ✅ OČISTI NAKON USPJEŠNOG SLANJA
      setFormData(initialFormData);
      setImagePreview(null);
      setSelectedApplicationId("");

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(IMAGE_PREVIEW_KEY);
          localStorage.removeItem(LAST_SAVED_KEY);
        } catch (error) {
          console.error("Greška pri čišćenju localStorage:", error);
        }
      }

      loadApplications();
    } catch (error: any) {
      toast({ title: "Greška", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsTranslating(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setImagePreview(null);
    setSelectedApplicationId("");

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(IMAGE_PREVIEW_KEY);
        localStorage.removeItem(LAST_SAVED_KEY);
      } catch (error) {
        console.error("Greška pri čišćenju localStorage:", error);
      }
    }

    toast({ title: "Forma očišćena", description: "Svi podaci su obrisani" });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <CalendarPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Kreiraj novi događaj</h2>
              <p className="text-sm text-gray-500">Popunite informacije za kreiranje događaja</p>
            </div>
          </div>

          {/* Auto-save indikator */}
          <div className="text-right">
            {isSavingToStorage ? (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Čuva se...</span>
              </div>
            ) : lastSaved ? (
              <div className="text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-600" />
                  <span>Sačuvano: {lastSaved}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Import Panel */}
      {hasApplicationsTable && applications.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 shadow-lg">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span>📥</span> Import iz prijava
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedApplicationId}
              onChange={(e) => handleApplicationSelect(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white text-gray-900 rounded-lg text-sm"
            >
              <option value="">-- Izaberi prijavu ({applications.length}) --</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.eventName || "Bez naziva"} - {app.businessName || ""}{" "}
                  {app.status === "Processed" ? "(Obrađen)" : ""}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={loadApplications}
              disabled={isLoadingApplications}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              {isLoadingApplications ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-2">Osvježi</span>
            </Button>
          </div>
        </div>
      )}

      {/* H1 Preview */}
      {generatedH1 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
            <Sparkles className="w-4 h-4" />
            Generisani H1 naslov (SEO):
          </div>
          <h1 className="text-xl font-bold text-green-900">{generatedH1}</h1>
        </div>
      )}

      {/* Slug Preview */}
      {allSlugs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium mb-2">
            <span>🔗</span>
            {allSlugs.length === 1 ? "Generisani slug:" : `Generisani slugovi (${allSlugs.length} termina):`}
          </div>
          <div className="space-y-1">
            {allSlugs.map((slug, i) => (
              <code key={i} className="block text-amber-900 bg-amber-100 px-2 py-1 rounded text-sm break-all">
                {i + 1}. {slug}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Event Type Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Tip događaja *</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label
            className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
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
              onChange={(e) => handleInputChange("eventType", e.target.value)}
              className="sr-only"
            />
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                formData.eventType === "seats" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              <MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <span className="font-semibold text-gray-900">Sa mapom sjedišta</span>
              <p className="text-sm text-gray-500 mt-1">Koristi Seats.io za interaktivnu mapu.</p>
            </div>
          </label>

          <label
            className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
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
              onChange={(e) => handleInputChange("eventType", e.target.value)}
              className="sr-only"
            />
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                formData.eventType === "simple" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <span className="font-semibold text-gray-900">Jednostavna prodaja</span>
              <p className="text-sm text-gray-500 mt-1">Prodaja po kategorijama bez mape.</p>
            </div>
          </label>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Event Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Osnovne informacije</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Naziv događaja *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Npr. Aco Pejović"
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                    required
                  />
                </div>

                {/* Venue */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Lokacija</label>
                  <div className="relative">
                    <Input
                      value={formData.venue}
                      onChange={(e) => {
                        handleInputChange("venue", e.target.value);
                        setVenueSearch(e.target.value);
                        setShowVenueDropdown(true);
                      }}
                      onFocus={() => setShowVenueDropdown(true)}
                      placeholder="Mjesto održavanja"
                      className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900 pr-10"
                    />
                    {venues.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowVenueDropdown(!showVenueDropdown)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showVenueDropdown && filteredVenues.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredVenues.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleVenueSelect(v)}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3"
                        >
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{v.name}</div>
                            <div className="text-xs text-gray-500">{v.city}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Grad</label>
                  <Input
                    value={formData.venueCity}
                    onChange={(e) => handleInputChange("venueCity", e.target.value)}
                    placeholder="Podgorica, Beograd..."
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                  />
                </div>

                {/* Performers */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                    <Music className="w-4 h-4" /> Izvođači
                    {formData.performers.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                        {formData.performers.length}
                      </span>
                    )}
                  </label>

                  {formData.performers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.performers.map((performer, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          <Music className="w-3 h-3" />
                          {performer}
                          <button
                            type="button"
                            onClick={() => removePerformer(performer)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <Input
                    value={performerSearch}
                    onChange={(e) => {
                      setPerformerSearch(e.target.value);
                      setShowPerformerDropdown(true);
                    }}
                    onFocus={() => setShowPerformerDropdown(true)}
                    placeholder={formData.performers.length > 0 ? "Dodaj još izvođača..." : "Pretraži izvođače..."}
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                  />
                  {showPerformerDropdown && filteredPerformers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredPerformers
                        .filter((p) => !formData.performers.includes(p.name))
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handlePerformerSelect(p)}
                            className="w-full px-4 py-2 text-left hover:bg-purple-50 flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4 text-purple-500" />
                            {p.name}
                          </button>
                        ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Možete dodati više izvođača za jedan događaj</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Kategorija</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange("category", e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 bg-gray-50 text-gray-900 text-sm"
                  >
                    <option value="">-- Izaberi --</option>
                    <option value="Koncert">Koncert</option>
                    <option value="Predstava">Predstava</option>
                    <option value="Stand Up">Stand Up</option>
                    <option value="Festival">Festival</option>
                    <option value="Sport">Sport</option>
                    <option value="Ostalo">Ostalo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Kratki opis</label>
                  <Textarea
                    value={formData.info}
                    onChange={(e) => handleInputChange("info", e.target.value)}
                    placeholder="Kratki opis (1-2 rečenice)"
                    rows={2}
                    className="bg-gray-50 border-gray-200 focus:bg-white resize-none text-gray-900"
                  />
                </div>

                {/* YouTube Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-500" /> YouTube Video
                  </label>
                  <Input
                    type="url"
                    value={formData.youtube}
                    onChange={(e) => handleInputChange("youtube", e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Link na YouTube video za promociju događaja</p>
                </div>
              </div>
            </div>

            {/* SEO & Content */}
            <div className="bg-white rounded-xl border border-green-200 shadow-sm">
              <div className="px-5 py-4 border-b border-green-100 bg-green-50 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">SEO & Sadržaj</h3>
                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">Važno</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    SEO Naslov (H1) - auto-generisan
                  </label>
                  <Input
                    value={formData.seoTitle}
                    onChange={(e) => handleInputChange("seoTitle", e.target.value)}
                    placeholder="Naziv | Grad | Datum"
                    className="bg-gray-50 border-gray-200 focus:bg-white text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Predlog: {generatedH1}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">SEO Opis (meta description)</label>
                  <Textarea
                    value={formData.seoDescription}
                    onChange={(e) => handleInputChange("seoDescription", e.target.value)}
                    placeholder="Opis za Google (max 160 karaktera)"
                    rows={2}
                    maxLength={160}
                    className="bg-gray-50 border-gray-200 focus:bg-white resize-none text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.seoDescription.length}/160 karaktera</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Dugi opis (300+ riječi)
                    <span className={`ml-2 font-bold ${wordCountColor}`}>({wordCount} riječi)</span>
                  </label>
                  <Textarea
                    value={formData.longDescription}
                    onChange={(e) => handleInputChange("longDescription", e.target.value)}
                    placeholder="Detaljan opis događaja za SEO. Minimum 300 riječi za dobro rangiranje na Google-u..."
                    rows={8}
                    className="bg-gray-50 border-gray-200 focus:bg-white resize-none text-gray-900"
                  />
                  {wordCount < 300 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Potrebno još {300 - wordCount} riječi za optimalan SEO
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Venue & Parking Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-800">Informacije o lokaciji</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> O dvorani/lokaciji
                  </label>
                  <Textarea
                    value={formData.venueInfo}
                    onChange={(e) => handleInputChange("venueInfo", e.target.value)}
                    placeholder="Opis dvorane, kapacitet, pogodnosti..."
                    rows={3}
                    className="bg-gray-50 border-gray-200 focus:bg-white resize-none text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                    <Car className="w-4 h-4" /> Parking informacije
                  </label>
                  <Textarea
                    value={formData.parkingInfo}
                    onChange={(e) => handleInputChange("parkingInfo", e.target.value)}
                    placeholder="Informacije o parkingu, cijena, lokacija..."
                    rows={2}
                    className="bg-gray-50 border-gray-200 focus:bg-white resize-none text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-xl border border-purple-200 shadow-sm">
              <div className="px-5 py-4 border-b border-purple-100 bg-purple-50 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-800">FAQ (Često postavljana pitanja)</h3>
                  <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                    {formData.faq.filter((f) => f.question).length}/5
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {formData.faq.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Pitanje {index + 1}</span>
                      {formData.faq.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFAQItem(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <Input
                      value={item.question}
                      onChange={(e) => updateFAQItem(index, "question", e.target.value)}
                      placeholder="Npr. Kako mogu kupiti karte?"
                      className="mb-2 bg-white text-gray-900"
                    />
                    <Textarea
                      value={item.answer}
                      onChange={(e) => updateFAQItem(index, "answer", e.target.value)}
                      placeholder="Odgovor na pitanje..."
                      rows={2}
                      className="bg-white resize-none text-gray-900"
                    />
                  </div>
                ))}
                {formData.faq.length < 5 && (
                  <Button type="button" variant="outline" size="sm" onClick={addFAQItem} className="w-full">
                    <Plus size={16} className="mr-2" /> Dodaj pitanje
                  </Button>
                )}
              </div>
            </div>

            {/* Financial */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Finansije</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Servis %</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.serviceFeePercentage}
                      onChange={(e) => handleInputChange("serviceFeePercentage", e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">PDV %</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.pdvPercentage}
                      onChange={(e) => handleInputChange("pdvPercentage", e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Biletarnica</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.biletarnicaFee}
                      onChange={(e) => handleInputChange("biletarnicaFee", e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Valuta</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange("currency", e.target.value)}
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

            {/* Seats.io - SAMO WORKSPACE KEY */}
            {formData.eventType === "seats" && (
              <div className="bg-white rounded-xl border border-blue-200 shadow-sm">
                <div className="px-5 py-4 border-b border-blue-100 bg-blue-50 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">Seats.io</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Workspace Key *</label>
                    <Input
                      value={formData.workspaceKey}
                      onChange={(e) => handleInputChange("workspaceKey", e.target.value)}
                      className="bg-gray-50 text-gray-900"
                      placeholder="dbc346de-4a9e-4d5b-bd46-d90b8fa50323"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Event Key se unosi za svaki termin posebno (ispod u sekciji Termini)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Organizer Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-800">Podaci o firmi</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Naziv firme</label>
                    <Input
                      value={formData.organizerDetails.businessName}
                      onChange={(e) => handleOrganizerDetailsChange("businessName", e.target.value)}
                      className="bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">PIB</label>
                    <Input
                      value={formData.organizerDetails.pib}
                      onChange={(e) => handleOrganizerDetailsChange("pib", e.target.value)}
                      className="bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Kontakt osoba</label>
                    <Input
                      value={formData.organizerDetails.contactPerson}
                      onChange={(e) => handleOrganizerDetailsChange("contactPerson", e.target.value)}
                      className="bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Telefon</label>
                    <Input
                      value={formData.organizerDetails.phone}
                      onChange={(e) => handleOrganizerDetailsChange("phone", e.target.value)}
                      className="bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
                    <Input
                      type="email"
                      value={formData.organizerDetails.email}
                      onChange={(e) => handleOrganizerDetailsChange("email", e.target.value)}
                      className="bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Izaberi organizatora iz baze
                      {formData.organizerDetails.organizerSlug && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          {formData.organizerDetails.organizerSlug}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Input
                        value={organizerSearch}
                        onChange={(e) => {
                          setOrganizerSearch(e.target.value);
                          setShowOrganizerDropdown(true);
                        }}
                        onFocus={() => setShowOrganizerDropdown(true)}
                        placeholder={formData.organizerDetails.organizerSlug || "Pretraži organizatore..."}
                        className="bg-gray-50 text-gray-900 pr-10"
                      />
                      {organizersFromDb.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowOrganizerDropdown(!showOrganizerDropdown)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {showOrganizerDropdown && filteredOrganizersFromDb.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredOrganizersFromDb.map((org) => (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => handleOrganizerFromDbSelect(org)}
                            className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3"
                          >
                            {org.logo ? (
                              <img src={org.logo} alt={org.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <Building2 className="w-8 h-8 p-1.5 bg-gray-100 rounded-full text-gray-400" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">{org.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span className="text-blue-600 font-mono">{org.slug}</span>
                                {org.city && <span>• {org.city}</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Izaberi organizatora da automatski popuniš podatke i slug
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fiscalization */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-800">Fiskalizacija</h3>
              </div>
              <div className="p-5">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border">
                  <input
                    type="checkbox"
                    checked={formData.enableFiscalization}
                    onChange={(e) => handleInputChange("enableFiscalization", e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-medium text-gray-800">Omogući fiskalizaciju</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Termini */}
            <div className="bg-white rounded-xl border border-purple-200 shadow-sm">
              <div className="px-5 py-4 border-b border-purple-100 bg-purple-50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-800">Termini i cijene</h3>
                    <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                      {formData.terms.length}
                    </span>
                  </div>
                  {formData.terms.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={copyPricesToAllTerms}>
                      <RefreshCw size={14} className="mr-1" /> Kopiraj cijene
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-6">
                {formData.terms.map((term, termIndex) => (
                  <div key={term.id} className="rounded-xl border-2 border-purple-200 bg-purple-50/30 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                          {termIndex + 1}
                        </span>
                        <span className="font-medium text-gray-800">
                          {term.date ? formatDateForH1(term.date) : "Novi termin"}
                        </span>
                      </div>
                      {formData.terms.length > 1 && (
                        <button type="button" onClick={() => removeTerm(term.id)} className="text-red-400">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Datum *</label>
                        <Input
                          type="date"
                          value={term.date}
                          onChange={(e) => updateTerm(term.id, "date", e.target.value)}
                          className="bg-white text-gray-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Vrijeme</label>
                        <Input
                          type="time"
                          value={term.event_time}
                          onChange={(e) => updateTerm(term.id, "event_time", e.target.value)}
                          className="bg-white text-gray-900"
                        />
                      </div>
                    </div>

                    {/* EVENT KEY ZA SVAKI TERMIN (samo ako je seats tip) */}
                    {formData.eventType === "seats" && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                          <Key className="w-4 h-4 text-blue-500" />
                          Event Key (Seats.io) *
                          {term.eventKey && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">✓</span>
                          )}
                        </label>
                        <Input
                          value={termIndex === 0 ? term.eventKey || formData.eventKey : term.eventKey}
                          onChange={(e) => {
                            if (termIndex === 0 && !term.eventKey) {
                              handleInputChange("eventKey", e.target.value);
                            }
                            updateTerm(term.id, "eventKey", e.target.value);
                          }}
                          placeholder="npr. bijelo-dugme-2025-02-15"
                          className="bg-white text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">Unesite Event Key iz Seats.io za ovaj termin</p>
                      </div>
                    )}

                    {/* Slika za termin (opciono) - prikazuje se samo kad ima više termina */}
                    {formData.terms.length > 1 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-2">
                          <Upload className="w-4 h-4 text-purple-500" />
                          Slika za ovaj termin
                          <span className="text-xs text-gray-400 font-normal">(opciono)</span>
                        </label>
                        {!term.imagePreview ? (
                          <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-purple-300 bg-white cursor-pointer">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) {
                                  toast({ title: "Greška", description: "Maksimalna veličina je 5MB.", variant: "destructive" });
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const base64 = reader.result as string;
                                  updateTerm(term.id, "imagePreview", base64);
                                  updateTerm(term.id, "image", "");
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="hidden"
                              id={`term-img-${term.id}`}
                            />
                            <label htmlFor={`term-img-${term.id}`} className="cursor-pointer flex items-center justify-center gap-2 text-sm text-gray-500">
                              <Upload className="w-4 h-4" />
                              <span>Upload sliku</span>
                            </label>
                          </div>
                        ) : (
                          <div className="relative">
                            <img src={term.imagePreview} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={() => {
                                updateTerm(term.id, "imagePreview", "");
                                updateTerm(term.id, "image", "");
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                            >
                              <X size={12} />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <Check size={10} />
                              Sačuvano
                            </div>
                          </div>
                        )}
                        {!term.imagePreview && (
                          <div className="mt-1.5">
                            <Input
                              type="url"
                              value={term.image || ""}
                              onChange={(e) => {
                                updateTerm(term.id, "image", e.target.value);
                                if (e.target.value) {
                                  updateTerm(term.id, "imagePreview", e.target.value);
                                }
                              }}
                              placeholder="Ili URL slike"
                              className="bg-white text-gray-900 h-8 text-sm"
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Ako ne dodate sliku, koristiće se glavna slika događaja</p>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Kategorije</label>
                      <div className="space-y-2">
                        {term.categories.map((cat, catIndex) => (
                          <div key={catIndex} className="flex gap-2 items-center bg-white rounded-lg p-2 border">
                            <Input
                              value={cat.category}
                              onChange={(e) => updateCategoryInTerm(term.id, catIndex, "category", e.target.value)}
                              placeholder="Naziv"
                              className="flex-1 h-9 text-sm text-gray-900"
                            />
                            <Input
                              type="number"
                              value={cat.price || ""}
                              onChange={(e) =>
                                updateCategoryInTerm(term.id, catIndex, "price", parseFloat(e.target.value) || 0)
                              }
                              placeholder="€"
                              className="w-24 h-9 text-sm text-gray-900"
                            />
                            <select
                              value={cat.type}
                              onChange={(e) => updateCategoryInTerm(term.id, catIndex, "type", e.target.value)}
                              className="h-9 px-2 rounded-md border bg-white text-gray-900 text-sm"
                            >
                              <option value="regular">Std</option>
                              <option value="table">Sto</option>
                            </select>
                            {term.categories.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCategoryFromTerm(term.id, catIndex)}
                                className="text-red-400"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addCategoryToTerm(term.id)}
                        className="w-full mt-2"
                      >
                        <Plus size={14} className="mr-1" /> Dodaj kategoriju
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addTerm}
                  className="w-full border-dashed border-2 border-purple-300"
                >
                  <Plus size={18} className="mr-2" /> Dodaj termin
                </Button>
              </div>
            </div>

            {/* Organizers */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Organizatori (notifikacije)</h3>
              </div>
              <div className="p-5 space-y-3">
                {formData.organizers.map((org, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border flex gap-3 items-center">
                    <Input
                      value={org.name}
                      onChange={(e) => updateOrganizer(index, "name", e.target.value)}
                      placeholder="Ime"
                      className="bg-white text-gray-900 flex-1"
                    />
                    <Input
                      type="email"
                      value={org.email}
                      onChange={(e) => updateOrganizer(index, "email", e.target.value)}
                      placeholder="Email"
                      className="bg-white text-gray-900 flex-1"
                    />
                    {formData.organizers.length > 1 && (
                      <button type="button" onClick={() => removeOrganizer(index)} className="text-red-400">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addOrganizer} className="w-full">
                  <Plus size={16} className="mr-2" /> Dodaj organizatora
                </Button>
              </div>
            </div>

            {/* Image Upload */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Slika događaja</h3>
              </div>
              <div className="p-5">
                {!imagePreview ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 bg-gray-50/50">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageChange}
                      className="hidden"
                      id="img-upload"
                    />
                    <label htmlFor="img-upload" className="cursor-pointer">
                      <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                      <span className="text-sm font-medium text-gray-600 block">Kliknite za upload</span>
                      <span className="text-xs text-gray-400">Max 5MB</span>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full"
                    >
                      <X size={16} />
                    </button>
                    {/* Indikator da je slika sačuvana */}
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Check size={12} />
                      Sačuvano
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <Input
                    type="url"
                    value={formData.image}
                    onChange={(e) => {
                      handleInputChange("image", e.target.value);
                      if (e.target.value) {
                        setImagePreview(e.target.value);
                      }
                    }}
                    placeholder="Ili unesite URL slike"
                    className="bg-gray-50 text-gray-900"
                    disabled={!!imagePreview && imagePreview.startsWith("data:")}
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 text-white">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                Pregled
                {isTranslating && (
                  <span className="flex items-center gap-1 text-blue-400 text-sm">
                    <Languages className="w-4 h-4 animate-pulse" />
                    Prevod...
                  </span>
                )}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">H1:</span>
                  <span className="font-medium text-green-400 truncate ml-2">{generatedH1 || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Opis:</span>
                  <span className={wordCountColor}>{wordCount} riječi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">FAQ:</span>
                  <span>{formData.faq.filter((f) => f.question).length} pitanja</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dvorana:</span>
                  <span className={formData.venueInfo ? "text-green-400" : "text-gray-500"}>
                    {formData.venueInfo ? "✓" : "–"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Parking:</span>
                  <span className={formData.parkingInfo ? "text-green-400" : "text-gray-500"}>
                    {formData.parkingInfo ? "✓" : "–"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Termini:</span>
                  <span className="text-purple-400">{formData.terms.length}</span>
                </div>
                {formData.eventType === "seats" && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Event Keys:</span>
                    <span
                      className={
                        formData.terms.every((t, i) => (i === 0 ? t.eventKey || formData.eventKey : t.eventKey))
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {formData.terms.filter((t, i) => (i === 0 ? t.eventKey || formData.eventKey : t.eventKey)).length}
                      /{formData.terms.length}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Slika:</span>
                  <span className={imagePreview ? "text-green-400" : "text-gray-500"}>{imagePreview ? "✓" : "–"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">YouTube:</span>
                  <span className={formData.youtube ? "text-red-400" : "text-gray-500"}>
                    {formData.youtube ? "✓" : "–"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Org. Slug:</span>
                  <span className={formData.organizerDetails.organizerSlug ? "text-green-400" : "text-gray-500"}>
                    {formData.organizerDetails.organizerSlug || "–"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-gray-400">Auto-prevod:</span>
                  <span className="text-blue-400 flex items-center gap-1">
                    <Languages className="w-4 h-4" />
                    Automatski EN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting || isTranslating}>
            Očisti formu
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isUploadingImage || isTranslating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kreiranje...
              </span>
            ) : isTranslating ? (
              <span className="flex items-center">
                <Languages className="w-4 h-4 mr-2 animate-pulse" />
                Prevod...
              </span>
            ) : (
              <span className="flex items-center">
                <Check className="w-4 h-4 mr-2" />
                Kreiraj događaj
              </span>
            )}
          </Button>
        </div>
      </form>

      {(showVenueDropdown || showPerformerDropdown || showOrganizerDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowVenueDropdown(false);
            setShowPerformerDropdown(false);
            setShowOrganizerDropdown(false);
          }}
        />
      )}
    </div>
  );
};

export default AdEvents;
