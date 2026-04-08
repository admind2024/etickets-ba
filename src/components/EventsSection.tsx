import { useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EventCard } from "./EventCard";
import {
  getImageUrl,
  parseCategories,
  getLowestPrice,
  formatEventDate,
  getCurrencySymbol,
} from "@/hooks/useAboutEvents";
import { useSponsors, trackSponsorEvent } from "@/hooks/useSponsors";

// ============================================
// EVENTS LOKALNI KEŠ
// ============================================
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
    // localStorage pun
  }
};

// Preload slike prvih 6 eventova
const preloadEventImages = (events: any[]) => {
  if (typeof document === "undefined" || !events?.length) return;

  events.slice(0, 6).forEach((event, index) => {
    const src = getImageUrl(event.image);
    if (!src || document.querySelector(`link[href="${src}"]`)) return;

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

// Helper za određivanje jezika iz URL-a
const useCurrentLang = () => {
  const location = useLocation();
  const pathname = location.pathname;
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return "bs";
};

// Prevodi za UI
const translations: Record<string, Record<string, string>> = {
  h1Title: {
    bs: "etickets – Online prodaja ulaznica u Bosni i Hercegovini i regionu",
    en: "etickets – Online ticket sales in Bosnia and Herzegovina and the region",
  },
  introParagraph1: {
    bs: "Platforma etickets je regionalni sistem za online kupovinu karata za koncerte, pozorišne predstave, festivale i sportske događaje u Bosni i Hercegovini, Srbiji i širem regionu.",
    en: "The etickets platform is a regional system for online ticket purchases for concerts, theater performances, festivals and sports events in Bosnia and Herzegovina, Serbia and the wider region.",
  },
  introParagraph2: {
    bs: "Putem etickets servisa korisnici mogu brzo i sigurno kupiti ulaznice, bez čekanja u redovima, uz instant isporuku karata direktno na email ili mobilni telefon.",
    en: "Through the etickets service, users can quickly and securely purchase tickets without waiting in lines, with instant ticket delivery directly to email or mobile phone.",
  },
  upcoming: { bs: "Nadolazeći", en: "Upcoming" },
  events: { bs: "Događaji", en: "Events" },
  description: {
    bs: "Pronađite i rezervišite karte za najbolje koncerte, festivale, pozorišne predstave i sportske događaje u Bosni i Hercegovini.",
    en: "Find and book tickets for the best concerts, festivals, theater performances and sports events in Bosnia and Herzegovina.",
  },
  loadingError: { bs: "Greška pri učitavanju događaja", en: "Error loading events" },
  noEvents: { bs: "Nema dostupnih događaja.", en: "No events available." },
};

// Hook za dohvat eventova sa keširanjem
const useEventsI18n = (lang: string) => {
  const query = useQuery({
    queryKey: ["events-i18n", lang],
    queryFn: async () => {
      const response = await fetch(
        `https://e-tickets-cache.rade-milosevic87.workers.dev/functions/v1/get-events-i18n?lang=${lang}`,
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();

      // Sačuvaj u localStorage
      saveEventsToCache(lang, data);

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minuta
    gcTime: 1000 * 60 * 15, // 15 minuta
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // INSTANT prikaz iz localStorage
    placeholderData: () => getEventsFromCache(lang) || undefined,
  });

  // Preload slike kad dobijemo podatke
  useEffect(() => {
    if (query.data) {
      preloadEventImages(query.data);
    }
  }, [query.data]);

  return query;
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

const SponsorBannerSkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-muted animate-pulse aspect-[1000/300]" />
);

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

const EventsSection = () => {
  const currentLang = useCurrentLang();
  const { data: aboutEvents, isLoading, error } = useEventsI18n(currentLang);
  const { data: sponsorsData, isLoading: sponsorsLoading } = useSponsors();
  const sponsorBanners = sponsorsData?.topBanners || [];
  const bottomBanner = sponsorsData?.bottomBanner || null;

  const t = (key: string) => translations[key]?.[currentLang] || translations[key]?.bs || key;

  // GRUPIRANJE DOGAĐAJA PO IMENU
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

  // FEATURED EVENTS
  const featuredGroups = useMemo(() => {
    if (!groupedEvents.length) return [];

    const withPriority = groupedEvents.filter((g) => g.variants.some((v) => v.prioritet != null && v.prioritet !== ""));

    if (withPriority.length === 0) return [];

    return withPriority.sort((a, b) => {
      const pA = Math.min(...a.variants.map((v) => Number(v.prioritet) || 999));
      const pB = Math.min(...b.variants.map((v) => Number(v.prioritet) || 999));
      return pA - pB;
    });
  }, [groupedEvents]);

  const displayGroups = groupedEvents;

  // Prikaži sadržaj čak i dok se učitava ako imamo placeholder data
  const hasData = aboutEvents && aboutEvents.length > 0;
  const showLoading = isLoading && !hasData;

  if (error && !hasData) {
    return (
      <section className="pt-6 md:pt-8 pb-12 md:pb-20 bg-background">
        <div className="container mx-auto px-4 text-center py-20">
          <p className="text-lg text-destructive">{t("loadingError")}</p>
        </div>
      </section>
    );
  }

  // Tracking impresija sponzora
  useEffect(() => {
    if (sponsorBanners.length > 0) {
      sponsorBanners.forEach((banner) => {
        trackSponsorEvent(banner.id, "impression", banner.alt, banner.image, banner.link);
      });
    }
    if (bottomBanner) {
      trackSponsorEvent(bottomBanner.id, "impression", bottomBanner.alt, bottomBanner.image, bottomBanner.link);
    }
  }, [sponsorBanners, bottomBanner]);

  const renderBanner = (
    banner: { id: string; image: string; link: string; alt: string },
    className: string,
    imgClassName: string,
    width: number,
    height: number,
    priority: boolean = false,
  ) => {
    const imgElement = (
      <img
        src={banner.image}
        alt={banner.alt}
        className={imgClassName}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        width={width}
        height={height}
      />
    );

    if (banner.link) {
      return (
        <a
          key={banner.id}
          href={banner.link}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={() => trackSponsorEvent(banner.id, "click", banner.alt, banner.image, banner.link)}
        >
          {imgElement}
        </a>
      );
    }

    return (
      <div key={banner.id} className={className}>
        {imgElement}
      </div>
    );
  };

  return (
    <section id="events" className="pt-6 md:pt-8 pb-12 md:pb-20 bg-background">
      <div className="container mx-auto px-4">
        {/* FEATURED EVENTS */}
        {featuredGroups.length > 0 && (
          <div className="mb-6 md:mb-10 flex flex-col md:flex-row justify-center gap-4 md:gap-8">
            {featuredGroups.map((featuredGroup) => {
              const eventId = featuredGroup.representative.id;
              return (
                <div key={eventId} className="w-full md:w-auto">
                  <EventCard
                    event={{
                      id: eventId,
                      title: featuredGroup.representative.name,
                      slug: featuredGroup.representative.slug,
                      date: formatEventDate(featuredGroup.representative.date),
                      time: featuredGroup.representative.event_time || "",
                      venue: featuredGroup.representative.venue,
                      image: getImageUrl(featuredGroup.representative.image),
                      category: featuredGroup.representative.category || "Događaj",
                      priceFrom: featuredGroup.lowestPrice,
                      currency: getCurrencySymbol(featuredGroup.representative.currency),
                      info: featuredGroup.representative.info,
                      is_match: featuredGroup.representative.is_match || false,
                      eventType: featuredGroup.representative.eventType,
                    }}
                    featured
                    lazy={false}
                    variantsCount={featuredGroup.variants.length}
                    variantsType={featuredGroup.variantsType}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* ✅ GLAVNI H1 – JEDINI NA STRANICI – ODMAH ISPOD FEATURED KARTICA */}
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 md:mb-4">{t("h1Title")}</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-3xl mx-auto mb-2 leading-relaxed">
            {t("introParagraph1")}
          </p>
          <p className="text-muted-foreground text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
            {t("introParagraph2")}
          </p>
        </div>

        {/* TOP SPONSOR BANNERS */}
        {(sponsorsLoading || sponsorBanners.length > 0) && (
          <div className="mb-6 md:mb-10">
            {sponsorsLoading && !sponsorBanners.length ? (
              <div className="hidden md:grid md:grid-cols-2 gap-4 md:gap-6">
                <SponsorBannerSkeleton />
                <SponsorBannerSkeleton />
              </div>
            ) : sponsorBanners.length > 0 ? (
              <div
                className={
                  "hidden md:grid gap-4 md:gap-6 " +
                  (sponsorBanners.length === 1 ? "md:grid-cols-1 max-w-[600px] mx-auto" : "md:grid-cols-2")
                }
              >
                {sponsorBanners
                  .slice(0, 2)
                  .map((banner, index) =>
                    renderBanner(
                      banner,
                      "block rounded-2xl overflow-hidden hover:opacity-90 hover:scale-[1.01] transition-all duration-300 shadow-card hover:shadow-glow",
                      "w-full h-auto object-cover aspect-[1000/300]",
                      1000,
                      300,
                      index === 0,
                    ),
                  )}
              </div>
            ) : null}

            {/* Mobile */}
            {sponsorsLoading && !sponsorBanners.length ? (
              <div className="md:hidden flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex-shrink-0 w-[90%]">
                  <SponsorBannerSkeleton />
                </div>
                <div className="flex-shrink-0 w-[90%]">
                  <SponsorBannerSkeleton />
                </div>
              </div>
            ) : sponsorBanners.length > 0 ? (
              sponsorBanners.length === 1 ? (
                <div className="md:hidden px-4">
                  {renderBanner(
                    sponsorBanners[0],
                    "block rounded-xl overflow-hidden shadow-card mx-auto",
                    "w-full h-auto object-contain aspect-[1000/300] bg-muted",
                    1000,
                    300,
                    true,
                  )}
                </div>
              ) : (
                <div className="md:hidden flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 pb-2">
                  {sponsorBanners.map((banner, index) => (
                    <div key={banner.id} className="flex-shrink-0 w-[90%] snap-start">
                      {renderBanner(
                        banner,
                        "block rounded-xl overflow-hidden shadow-card",
                        "w-full h-auto object-cover aspect-[1000/300]",
                        1000,
                        300,
                        index === 0,
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </div>
        )}

        {/* Nadolazeći Događaji Header */}
        <div className="text-center mb-4 md:mb-8">
          <h2 className="text-xl md:text-3xl font-bold text-foreground mb-2">
            {t("upcoming")} <span className="text-gradient">{t("events")}</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">{t("description")}</p>
        </div>

        {/* Loading - samo ako nema keširanih podataka */}
        {showLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Events Grid */}
        {!showLoading && displayGroups.length > 0 && (
          <div className={`grid ${displayGroups.length > 5 ? "grid-cols-2" : "grid-cols-1"} lg:grid-cols-3 gap-3 md:gap-8`}>
            {displayGroups.map((group, index) => {
              const event = group.representative;
              return (
                <EventCard
                  key={event.id}
                  event={{
                    id: event.id,
                    title: event.name,
                    slug: event.slug,
                    date: formatEventDate(event.date),
                    time: event.event_time || "",
                    venue: event.venue,
                    image: getImageUrl(event.image),
                    category: event.category || "Događaj",
                    priceFrom: group.lowestPrice,
                    currency: getCurrencySymbol(event.currency),
                    info: event.info,
                    is_match: event.is_match || false,
                    eventType: event.eventType,
                  }}
                  index={index}
                  lazy={index > 5}
                  variantsCount={group.variants.length}
                  variantsType={group.variantsType}
                />
              );
            })}
          </div>
        )}

        {/* No Results */}
        {!showLoading && displayGroups.length === 0 && featuredGroups.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-base">{t("noEvents")}</p>
          </div>
        )}

        {/* BOTTOM SPONSOR BANNER */}
        {bottomBanner && (
          <div className="mt-8 md:mt-12">
            {renderBanner(
              bottomBanner,
              "block rounded-xl md:rounded-2xl overflow-hidden hover:opacity-90 md:hover:scale-[1.005] transition-all duration-300 shadow-card hover:shadow-glow",
              "w-full h-auto object-cover aspect-[2080/408]",
              2080,
              408,
              false,
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default EventsSection;
