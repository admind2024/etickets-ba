import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AboutEvent, TicketCategory } from "@/types/aboutEvent";
import { getAboutEvents, getAboutEvent, getEventsI18n, getEventI18n } from "@/lib/eventApi";
import { useLanguage } from "@/contexts/LanguageContext";

const CDN_URL = "https://e-tickets-cache.rade-milosevic87.workers.dev";
const SUPABASE_URL = "https://hvpytasddzeprgqkwlbu.supabase.co";

// ============================================
// LOKALNI KEŠ ZA EVENTS
// ============================================
const EVENTS_CACHE_KEY = "events_cache";
const EVENTS_CACHE_TS_KEY = "events_cache_ts";
const EVENTS_CACHE_TTL = 1000 * 60 * 10; // 10 minuta

const getEventsFromCache = (lang: string): AboutEvent[] | null => {
  if (typeof window === "undefined") return null;

  try {
    const ts = localStorage.getItem(`${EVENTS_CACHE_TS_KEY}_${lang}`);
    if (!ts) return null;

    if (Date.now() - parseInt(ts, 10) > EVENTS_CACHE_TTL) {
      localStorage.removeItem(`${EVENTS_CACHE_KEY}_${lang}`);
      localStorage.removeItem(`${EVENTS_CACHE_TS_KEY}_${lang}`);
      return null;
    }

    const cached = localStorage.getItem(`${EVENTS_CACHE_KEY}_${lang}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const saveEventsToCache = (lang: string, data: AboutEvent[]) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(`${EVENTS_CACHE_KEY}_${lang}`, JSON.stringify(data));
    localStorage.setItem(`${EVENTS_CACHE_TS_KEY}_${lang}`, Date.now().toString());
  } catch {
    // localStorage pun
  }
};

// Preload slike prvih N eventova
const preloadEventImages = (events: AboutEvent[], count: number = 6) => {
  if (typeof document === "undefined" || !events?.length) return;

  events.slice(0, count).forEach((event, index) => {
    const src = getImageUrl(event.image);
    if (!src || src === "/placeholder.svg") return;
    if (document.querySelector(`link[href="${src}"]`)) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    if (index < 3) {
      link.setAttribute("fetchpriority", "high");
    }
    document.head.appendChild(link);
  });
};

// ============================================
// INTERFACES
// ============================================
export interface DetailedTicketCategory {
  category: string;
  price: number;
  type?: "regular" | "table";
  tableFixedPrice?: number;
  description?: string;
}

// ============================================
// PARSE FUNKCIJE
// ============================================
export const parseCategories = (categories: any): TicketCategory[] => {
  if (!categories) return [];

  if (Array.isArray(categories)) {
    return categories;
  }

  if (typeof categories === "string") {
    if (categories.startsWith("[")) {
      try {
        return JSON.parse(categories);
      } catch {
        return [];
      }
    }

    const result: TicketCategory[] = [];
    const parts = categories.split(",");

    for (const part of parts) {
      // Try "Category - 100 EUR" format (greedy .+ to match LAST dash-number pair)
      const dashMatch = part.trim().match(/^(.+)\s*-\s*(\d+)\s*(EUR|€|RSD|MKD|CHF)?$/i);
      if (dashMatch) {
        result.push({
          category: dashMatch[1].trim(),
          price: parseInt(dashMatch[2], 10),
        });
        continue;
      }
      // Try "Category: 5.00€" format
      const colonMatch = part.trim().match(/^(.+?)\s*:\s*(\d+(?:[.,]\d+)?)\s*(€|EUR|RSD|MKD|CHF|KM|BAM)?/i);
      if (colonMatch) {
        result.push({
          category: colonMatch[1].trim(),
          price: parseFloat(colonMatch[2].replace(",", ".")),
        });
      }
    }

    return result;
  }

  return [];
};

export const parseDescription = (description: any): DetailedTicketCategory[] => {
  if (!description) return [];

  if (Array.isArray(description)) {
    return description;
  }

  if (typeof description === "string") {
    try {
      return JSON.parse(description);
    } catch {
      // Try fixing single quotes (Python-style JSON from DB)
      try {
        const fixed = description.replace(/'/g, '"');
        return JSON.parse(fixed);
      } catch {
        return [];
      }
    }
  }

  return [];
};

// ============================================
// KALKULACIJE
// ============================================
export const calculateServiceFee = (
  basePrice: number,
  ticketCount: number,
  serviceFeePercentage: string | number = "5",
): number => {
  const feePercent =
    typeof serviceFeePercentage === "string" ? parseFloat(serviceFeePercentage) || 5 : serviceFeePercentage;

  const percentageFee = basePrice * (feePercent / 100);
  const fixedFee = 0.3 * ticketCount;
  return Math.round((percentageFee + fixedFee) * 100) / 100;
};

export const calculateInsurance = (basePrice: number): number => {
  return Math.round(basePrice * 0.07 * 100) / 100;
};

// ============================================
// IMAGE URL (CDN)
// ============================================
export const getImageUrl = (imageStr: string | null | undefined): string => {
  if (!imageStr) return "/placeholder.svg";

  if (imageStr.startsWith("wix:image://")) {
    const match = imageStr.match(/wix:image:\/\/v1\/([^/]+)/);
    if (match) {
      return `https://static.wixstatic.com/media/${match[1]}`;
    }
  }

  // Preusmjeri Supabase slike kroz Cloudflare CDN
  if (imageStr.startsWith(SUPABASE_URL)) {
    return imageStr.replace(SUPABASE_URL, CDN_URL);
  }

  // Ako je relativan path za storage
  if (imageStr.startsWith("/storage/")) {
    return `${CDN_URL}${imageStr}`;
  }

  if (imageStr.startsWith("http")) {
    return imageStr;
  }

  return imageStr;
};

// ============================================
// HOOKS SA KEŠIRANJEM
// ============================================
export const useAboutEvents = () => {
  const { lang } = useLanguage();

  return useQuery({
    queryKey: ["about-events", lang],
    queryFn: async (): Promise<AboutEvent[]> => {
      const events = await getEventsI18n(lang);

      const today = new Date().toISOString().split("T")[0];
      const filtered = (events || [])
        .filter((e: AboutEvent) => !e?.date || e.date >= today)
        .sort((a: AboutEvent, b: AboutEvent) => (a.date || "").localeCompare(b.date || ""));

      // Sačuvaj u localStorage
      saveEventsToCache(lang, filtered);

      // Preload slike
      preloadEventImages(filtered);

      return filtered;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // INSTANT prikaz iz localStorage
    placeholderData: () => getEventsFromCache(lang) || undefined,
  });
};

export const useAboutEventsByCategory = (category: string | undefined) => {
  const { lang } = useLanguage();

  return useQuery({
    queryKey: ["about-events", "category", category, lang],
    queryFn: async (): Promise<AboutEvent[]> => {
      const events = await getEventsI18n(lang);

      const today = new Date().toISOString().split("T")[0];
      const filtered = (events || [])
        .filter((e: AboutEvent) => !e?.date || e.date >= today)
        .filter((e: AboutEvent) => {
          if (!category || category === "Svi") return true;
          return e.category === category;
        })
        .sort((a: AboutEvent, b: AboutEvent) => (a.date || "").localeCompare(b.date || ""));

      return filtered;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    // Koristi glavni events keš kao placeholder
    placeholderData: () => {
      const cached = getEventsFromCache(lang);
      if (!cached) return undefined;

      const today = new Date().toISOString().split("T")[0];
      return cached
        .filter((e) => !e?.date || e.date >= today)
        .filter((e) => {
          if (!category || category === "Svi") return true;
          return e.category === category;
        });
    },
  });
};

export const useAboutEventBySlug = (slug: string | undefined) => {
  const { lang } = useLanguage();

  return useQuery({
    queryKey: ["about-event", slug, lang],
    queryFn: async (): Promise<AboutEvent | null> => {
      if (!slug) return null;

      const trimmedSlug = slug.trim();
      const event = await getEventI18n(lang, trimmedSlug);

      return event ?? null;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    // Pokušaj naći u events keš
    placeholderData: () => {
      if (!slug) return undefined;
      const cached = getEventsFromCache(lang);
      if (!cached) return undefined;

      const found = cached.find((e) => e.slug?.toLowerCase().trim() === slug.toLowerCase().trim());
      return found || undefined;
    },
  });
};

export const useEventCategories = () => {
  const { lang } = useLanguage();

  return useQuery({
    queryKey: ["event-categories", lang],
    queryFn: async (): Promise<string[]> => {
      const events = await getEventsI18n(lang);
      const today = new Date().toISOString().split("T")[0];

      const categories = [
        ...new Set(
          (events || [])
            .filter((e: AboutEvent) => !e?.date || e.date >= today)
            .map((item: AboutEvent) => item.category)
            .filter(Boolean),
        ),
      ] as string[];

      return categories;
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    // Izvuci kategorije iz events keša
    placeholderData: () => {
      const cached = getEventsFromCache(lang);
      if (!cached) return undefined;

      const today = new Date().toISOString().split("T")[0];
      return [
        ...new Set(
          cached
            .filter((e) => !e?.date || e.date >= today)
            .map((item) => item.category)
            .filter(Boolean),
        ),
      ] as string[];
    },
  });
};

// ============================================
// HELPER FUNKCIJE
// ============================================
export const formatEventDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
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
    return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}.`;
  } catch {
    return dateStr;
  }
};

export const formatEventTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return "";
  const match = timeStr.match(/^(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return timeStr;
};

export const getLowestPrice = (categories: TicketCategory[]): number => {
  if (!categories || categories.length === 0) return 0;
  return Math.min(...categories.map((c) => c.price));
};

export const getCurrencySymbol = (currency: string | null | undefined): string => {
  const curr = (currency || "EUR").toLowerCase();
  if (curr === "rsd" || curr === "dinar" || curr === "rd$") return " RSD";
  if (curr === "mkd") return " MKD";
  if (curr === "chf") return " CHF";
  return "€";
};

// ============================================
// RPC HOOK (admin)
// ============================================
export const useEventBySlugRPC = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["event-detail-rpc", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase.rpc("get_event_by_slug", {
        p_slug: slug,
      });
      if (error) {
        console.error("Error fetching event by RPC:", error);
        throw error;
      }
      return data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};
