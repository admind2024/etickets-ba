import { useQuery } from "@tanstack/react-query";
import { getSponsors } from "@/lib/eventApi";
import { useEffect } from "react";

export interface SponsorBanner {
  id: string;
  image: string;
  link: string;
  alt: string;
}

export interface SponsorsData {
  topBanners: SponsorBanner[];
  bottomBanner: SponsorBanner | null;
}

// ============================================
// TRACKING SPONZORSKIH IMPRESIJA I KLIKOVA
// ============================================
const TRACK_URL = "https://analytics-gateway.rade-milosevic87.workers.dev/sponsor";

// Deduplikacija: ne šalji istu impresiju više puta po sesiji
const trackedImpressions = new Set<string>();

export const trackSponsorEvent = async (
  sponsorId: string,
  eventType: "impression" | "click",
  sponsorName?: string,
  sponsorImage?: string,
  sponsorLink?: string,
) => {
  // Za impresije, provjeri da li je već trackovan u ovoj sesiji
  if (eventType === "impression") {
    const key = `${sponsorId}_${eventType}`;
    if (trackedImpressions.has(key)) return;
    trackedImpressions.add(key);
  }

  try {
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);

    await fetch(TRACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sponsor_id: sponsorId,
        event_type: eventType,
        sponsor_name: sponsorName || "",
        sponsor_image: sponsorImage || "",
        sponsor_link: sponsorLink || "",
        user_agent: ua,
        referrer: document.referrer || "",
        device: isMobile ? "mobile" : "desktop",
      }),
    });
  } catch (error) {
    // Tiha greška – tracking ne smije blokirati UX
    console.error("Sponsor tracking error:", error);
  }
};

// ============================================
// LOKALNI KEŠ (localStorage)
// ============================================
const CACHE_KEY = "sponsors_cache";
const CACHE_TS_KEY = "sponsors_cache_ts";
const CACHE_TTL = 1000 * 60 * 30; // 30 minuta

const getFromCache = (): SponsorsData | null => {
  if (typeof window === "undefined") return null;

  try {
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!ts) return null;

    if (Date.now() - parseInt(ts, 10) > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TS_KEY);
      return null;
    }

    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const saveToCache = (data: SponsorsData) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TS_KEY, Date.now().toString());
  } catch {
    // localStorage pun ili nedostupan
  }
};

// ============================================
// PRELOAD SLIKA
// ============================================
const preloadImages = (data: SponsorsData) => {
  if (typeof document === "undefined") return;

  const images = [...data.topBanners.map((b) => b.image), data.bottomBanner?.image].filter(Boolean) as string[];

  images.forEach((src, index) => {
    // Provjeri da li već postoji
    if (document.querySelector(`link[href="${src}"]`)) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    // Prvi banner ima najviši prioritet
    if (index === 0) {
      link.setAttribute("fetchpriority", "high");
    }
    document.head.appendChild(link);
  });
};

// ============================================
// HOOK
// ============================================
export const useSponsors = () => {
  const query = useQuery({
    queryKey: ["sponsors"],
    queryFn: async (): Promise<SponsorsData> => {
      try {
        // Poziva CF Worker koji kešira 10 min
        const data = await getSponsors();
        const sponsorsData = data as SponsorsData;

        // Sačuvaj u localStorage za instant prikaz
        saveToCache(sponsorsData);

        return sponsorsData;
      } catch (err) {
        console.error("useSponsors error:", err);
        // Fallback na keš ako API ne radi
        return getFromCache() || { topBanners: [], bottomBanner: null };
      }
    },
    staleTime: 1000 * 60 * 10, // 10 min
    gcTime: 1000 * 60 * 30, // 30 min
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // INSTANT prikaz iz localStorage keša
    placeholderData: () => getFromCache() || undefined,
  });

  // Preload slike kad dobijemo podatke
  useEffect(() => {
    if (query.data) {
      preloadImages(query.data);
    }
  }, [query.data]);

  return query;
};
