import { useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EventCard } from "@/components/EventCard";
import SEO from "@/components/SEO";
import {
  getImageUrl,
  parseCategories,
  getLowestPrice,
  formatEventDate,
  getCurrencySymbol,
} from "@/hooks/useAboutEvents";

// Cache keys
const EVENTS_CACHE_KEY = "events_cache";
const EVENTS_CACHE_TS_KEY = "events_cache_ts";
const EVENTS_CACHE_TTL = 1000 * 60 * 10; // 10 minuta

const getEventsFromCache = (lang: string): any[] | null => {
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

const saveEventsToCache = (lang: string, data: any[]) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(`${EVENTS_CACHE_KEY}_${lang}`, JSON.stringify(data));
    localStorage.setItem(`${EVENTS_CACHE_TS_KEY}_${lang}`, Date.now().toString());
  } catch {
    // localStorage full
  }
};

// Translations
const translations: Record<string, Record<string, string>> = {
  pageTitle: {
    bs: "Svi događaji",
    en: "All Events",
  },
  metaTitle: {
    bs: "Događaji - Koncerti, festivali i sportski događaji | etickets",
    en: "Events - Concerts, festivals and sports events | etickets",
  },
  metaDescription: {
    bs: "Pregledajte sve nadolazeće koncerte, festivale, pozorišne predstave i sportske događaje u Bosni i Hercegovini. Kupite karte online brzo i sigurno.",
    en: "Browse all upcoming concerts, festivals, theater performances and sports events in Bosnia and Herzegovina. Buy tickets online quickly and securely.",
  },
  upcoming: { bs: "Nadolazeći", en: "Upcoming" },
  events: { bs: "Događaji", en: "Events" },
  loadingError: { bs: "Greška pri učitavanju događaja", en: "Error loading events" },
  noEvents: { bs: "Nema dostupnih događaja.", en: "No events available." },
};

interface GroupedEvent {
  representative: any;
  variants: any[];
  variantsType: "dates" | "times" | "locations" | "both";
  lowestPrice: number;
  nameSlug: string;
}

const generateNameSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đ]/g, "dj")
    .replace(/[ž]/g, "z")
    .replace(/[ć]/g, "c")
    .replace(/[č]/g, "c")
    .replace(/[š]/g, "s")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const EventCardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-card border border-border animate-pulse">
    <div className="aspect-[4/3] bg-muted" />
    <div className="p-5 space-y-3">
      <div className="h-6 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="flex justify-between items-center">
        <div className="h-8 bg-muted rounded w-20" />
        <div className="h-10 bg-muted rounded w-24" />
      </div>
    </div>
  </div>
);

const Events = () => {
  const { lang: urlLang } = useParams<{ lang?: string }>();
  const currentLang = urlLang && ["en"].includes(urlLang) ? urlLang : "bs";

  const t = (key: string) => translations[key]?.[currentLang] || translations[key]?.bs || key;

  const { data: aboutEvents, isLoading, error } = useQuery({
    queryKey: ["events-i18n", currentLang],
    queryFn: async () => {
      const response = await fetch(
        `https://e-tickets-cache.rade-milosevic87.workers.dev/functions/v1/get-events-i18n?lang=${currentLang}`,
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      saveEventsToCache(currentLang, data);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: () => getEventsFromCache(currentLang) || undefined,
  });

  // Group events by name
  const groupedEvents = useMemo(() => {
    if (!aboutEvents) return [];

    const visibleEvents = aboutEvents.filter((e: any) => e.hide !== "true" && e.hide !== true && e.country === "BA");

    const groupMap = new Map<string, any[]>();

    visibleEvents.forEach((event: any) => {
      const name = event.name.trim().toLowerCase();
      if (!groupMap.has(name)) {
        groupMap.set(name, []);
      }
      groupMap.get(name)!.push(event);
    });

    const result: GroupedEvent[] = [];

    groupMap.forEach((variants) => {
      variants.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        const timeA = a.event_time || "00:00";
        const timeB = b.event_time || "00:00";
        return timeA.localeCompare(timeB);
      });

      const uniqueDates = new Set(variants.map((v) => v.date?.split("T")[0]));
      const uniqueVenues = new Set(variants.map((v) => v.venue?.toLowerCase().trim()).filter(Boolean));
      const uniqueTimes = new Set(variants.map((v) => v.event_time || "").filter(Boolean));

      let variantsType: "dates" | "times" | "locations" | "both" = "dates";

      if (variants.length === 1) {
        variantsType = "dates";
      } else if (uniqueDates.size === 1) {
        if (uniqueVenues.size > 1) {
          variantsType = "locations";
        } else if (uniqueTimes.size > 1) {
          variantsType = "times";
        } else {
          variantsType = "times";
        }
      } else {
        if (uniqueVenues.size > 1) {
          variantsType = "both";
        } else {
          variantsType = "dates";
        }
      }

      let lowestPrice = Infinity;
      variants.forEach((v) => {
        const cats = parseCategories(v.categories);
        const price = getLowestPrice(cats);
        if (price < lowestPrice) {
          lowestPrice = price;
        }
      });

      result.push({
        representative: variants[0],
        variants,
        variantsType,
        lowestPrice: lowestPrice === Infinity ? 0 : lowestPrice,
        nameSlug: generateNameSlug(variants[0].name),
      });
    });

    result.sort((a, b) => new Date(a.representative.date).getTime() - new Date(b.representative.date).getTime());

    return result;
  }, [aboutEvents]);

  const hasData = aboutEvents && aboutEvents.length > 0;
  const showLoading = isLoading && !hasData;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={t("metaTitle")}
        description={t("metaDescription")}
        canonical="/dogadjaji"
        lang={currentLang}
      />
      <Header />

      <main className="flex-grow">
        <section className="pt-8 md:pt-12 pb-12 md:pb-20">
          <div className="container mx-auto px-4">
            {/* Page Header */}
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t("upcoming")} <span className="text-gradient">{t("events")}</span>
              </h1>
            </div>

            {/* Error State */}
            {error && !hasData && (
              <div className="text-center py-20">
                <p className="text-lg text-destructive">{t("loadingError")}</p>
              </div>
            )}

            {/* Loading State */}
            {showLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {[...Array(6)].map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* No Events */}
            {!showLoading && !error && groupedEvents.length === 0 && (
              <div className="text-center py-20">
                <p className="text-lg text-muted-foreground">{t("noEvents")}</p>
              </div>
            )}

            {/* Events Grid */}
            {groupedEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {groupedEvents.map((group, index) => {
                  const eventId = group.representative.id;
                  return (
                    <EventCard
                      key={eventId}
                      event={{
                        id: eventId,
                        title: group.representative.name,
                        slug: group.representative.slug,
                        date: formatEventDate(group.representative.date),
                        time: group.representative.event_time || "",
                        venue: group.representative.venue,
                        image: getImageUrl(group.representative.image),
                        category: group.representative.category || "Događaj",
                        priceFrom: group.lowestPrice,
                        currency: getCurrencySymbol(group.representative.currency),
                        info: group.representative.info,
                      }}
                      lazy={index >= 6}
                      variantsCount={group.variants.length}
                      variantsType={group.variantsType}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Events;
