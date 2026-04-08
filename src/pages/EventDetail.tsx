import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Facebook,
  Twitter,
  Link2,
  ArrowLeft,
  Navigation,
  Loader2,
  Mic2,
  Music,
  Building2,
  ChevronRight,
  Drama,
  Laugh,
  Star,
  HelpCircle,
  Car,
  ParkingCircle,
  ExternalLink,
  Youtube,
  Play,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EventCard } from "@/components/EventCard";
import SEO from "@/components/SEO";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import { SITE_URL } from "@/lib/seoConfig";
import { toast } from "@/hooks/use-toast";
import {
  getImageUrl,
  parseCategories,
  getLowestPrice,
  formatEventDate,
  getCurrencySymbol,
} from "@/hooks/useAboutEvents";
import { usePerformers } from "@/hooks/usePerformers";
import { useVenues } from "@/hooks/useVenues";
import { useSponsors, trackSponsorEvent } from "@/hooks/useSponsors";
import { getEventsI18n, getEventI18n } from "@/lib/eventApi";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { AboutEvent } from "@/types/aboutEvent";

// Google Map Component - EAGER LOADING (učitava se odmah)
const GoogleMapEmbed = ({
  embedUrl,
  title,
  className = "h-[200px]",
}: {
  embedUrl: string;
  title: string;
  className?: string;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative w-full ${className} bg-slate-100 dark:bg-slate-800`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-100 dark:bg-slate-800">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
            <p className="text-sm text-muted-foreground">Učitavanje mape...</p>
          </div>
        </div>
      )}
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
        title={title}
        className="absolute inset-0"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

// YouTube Embed Component - podržava kanale i videe
const YouTubeSection = ({ url, title, currentLang }: { url: string; title: string; currentLang: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Parsiranje YouTube URL-a
  const parseYouTubeUrl = (youtubeUrl: string) => {
    // Channel ID format: /channel/UCxxxxx
    const channelIdMatch = youtubeUrl.match(/youtube\.com\/channel\/([^/?&]+)/);
    if (channelIdMatch) {
      return { type: "channel", id: channelIdMatch[1] };
    }

    // Handle format: /@username
    const handleMatch = youtubeUrl.match(/youtube\.com\/@([^/?&]+)/);
    if (handleMatch) {
      return { type: "handle", id: handleMatch[1] };
    }

    // Video ID formats
    const videoPatterns = [
      /youtube\.com\/watch\?v=([^&\n?#]+)/,
      /youtu\.be\/([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of videoPatterns) {
      const match = youtubeUrl.match(pattern);
      if (match) return { type: "video", id: match[1] };
    }

    return null;
  };

  const parsed = parseYouTubeUrl(url);

  if (!parsed) return null;

  const labels: Record<string, Record<string, string>> = {
    visitChannel: { bs: "Posjetite YouTube kanal", en: "Visit YouTube channel" },
    allVideos: { bs: "Pogledajte sve video sadržaje", en: "Watch all video content" },
    loadingVideo: { bs: "Učitavanje videa...", en: "Loading video..." },
  };

  const t = (key: string) => labels[key]?.[currentLang] || labels[key]?.bs || key;

  // Za KANAL - odmah prikaži embed sa uploads playlistom
  if (parsed.type === "channel") {
    const uploadsPlaylistId = "UU" + parsed.id.substring(2);
    const channelEmbedUrl = `https://www.youtube.com/embed/videoseries?list=${uploadsPlaylistId}`;

    return (
      <div className="space-y-4">
        <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden">
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-red-500 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-white/70">{t("loadingVideo")}</p>
              </div>
            </div>
          )}
          <iframe
            src={channelEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title + " - YouTube"}
            className="absolute inset-0"
            onLoad={() => setIsLoaded(true)}
          />
        </div>

        {/* Link ka kanalu */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-red-500/50 hover:shadow-lg transition-all group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 flex-shrink-0">
            <Youtube className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold group-hover:text-red-500 transition-colors">{t("visitChannel")}</p>
            <p className="text-sm text-muted-foreground">{t("allVideos")}</p>
          </div>
          <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-red-500 transition-colors" />
        </a>
      </div>
    );
  }

  // Za HANDLE (@username) - prikaži link
  if (parsed.type === "handle") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-5 rounded-xl border-2 border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/5 hover:border-red-500/50 hover:shadow-lg transition-all group"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 flex-shrink-0 group-hover:scale-110 transition-transform">
          <Youtube className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg group-hover:text-red-500 transition-colors">YouTube</p>
          <p className="text-muted-foreground">@{parsed.id}</p>
        </div>
        <ExternalLink className="w-6 h-6 text-red-500" />
      </a>
    );
  }

  // Za VIDEO - odmah prikaži embed
  if (parsed.type === "video") {
    const embedUrl = `https://www.youtube.com/embed/${parsed.id}?rel=0&modestbranding=1`;

    return (
      <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-red-500 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-white/70">{t("loadingVideo")}</p>
            </div>
          </div>
        )}
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
          className="absolute inset-0"
          onLoad={() => setIsLoaded(true)}
        />
      </div>
    );
  }

  return null;
};

const EventDetail = () => {
  const { slug, lang } = useParams<{ slug: string; lang?: string }>();
  const navigate = useNavigate();

  // Determine language from URL param, default to "bs"
  const currentLang = lang === "en" ? lang : "bs";

  // Date/month translations
  const monthNames: Record<string, string[]> = {
    bs: ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"],
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  };

  const dayNames: Record<string, string[]> = {
    bs: ["ned", "pon", "uto", "sri", "čet", "pet", "sub"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  };

  const getTranslatedMonth = (date: Date) => {
    return monthNames[currentLang]?.[date.getMonth()] || monthNames.bs[date.getMonth()];
  };

  const getTranslatedDay = (date: Date) => {
    return dayNames[currentLang]?.[date.getDay()] || dayNames.bs[date.getDay()];
  };

  const formatDateTranslated = (dateStr: string) => {
    // Use parseLocalDate to avoid UTC timezone shift
    const datePart = dateStr.split("T")[0];
    let y: number, m: number, d: number;
    if (datePart.includes(".")) {
      [d, m, y] = datePart.split(".").map(Number);
    } else {
      [y, m, d] = datePart.split("-").map(Number);
    }
    const date = new Date(y, m - 1, d);
    const day = date.getDate();
    const month = getTranslatedMonth(date);
    const year = date.getFullYear();
    return `${day}. ${month} ${year}`;
  };

  // UI Labels for i18n
  const labels: Record<string, Record<string, string>> = {
    aboutEvent: { bs: "O događaju", en: "About the event" },
    detailedDescription: { bs: "Detaljan opis", en: "Detailed description" },
    faq: { bs: "Često postavljana pitanja", en: "Frequently Asked Questions" },
    venueInfo: { bs: "Informacije o lokaciji", en: "Venue information" },
    parking: { bs: "Parking", en: "Parking" },
    location: { bs: "Lokacija", en: "Location" },
    organizer: { bs: "Organizator", en: "Organizer" },
    share: { bs: "Podijelite", en: "Share" },
    performers: { bs: "Izvođači", en: "Performers" },
    performer: { bs: "Izvođač", en: "Performer" },
    similarEvents: { bs: "Slični događaji", en: "Similar events" },
    seeAll: { bs: "Vidi sve", en: "See all" },
    back: { bs: "Nazad", en: "Back" },
    buy: { bs: "Kupi", en: "Buy" },
    buyTickets: { bs: "Kupi karte", en: "Buy tickets" },
    continue: { bs: "Nastavi", en: "Continue" },
    from: { bs: "od", en: "from" },
    alreadyFrom: { bs: "već od", en: "from" },
    free: { bs: "Besplatno", en: "Free" },
    pricesFrom: { bs: "Cijene od", en: "Prices from" },
    seats: { bs: "mjesta", en: "seats" },
    home: { bs: "Početna", en: "Home" },
    verifiedOrganizer: { bs: "Verifikovani organizator", en: "Verified organizer" },
    navigation: { bs: "Navigacija", en: "Navigation" },
    learnMoreAboutVenue: { bs: "Saznaj više o lokaciji", en: "Learn more about venue" },
    learnMoreAboutOrganizer: { bs: "Saznaj više", en: "Learn more" },
    viewProfile: { bs: "Pogledaj profil", en: "View profile" },
    performerBio: { bs: "Biografija izvođača", en: "Performer biography" },
    eventNotFound: { bs: "Događaj nije pronađen", en: "Event not found" },
    backToHome: { bs: "Povratak na početnu", en: "Back to home" },
    loading: { bs: "Učitavanje...", en: "Loading..." },
    videoContent: { bs: "Video sadržaj", en: "Video content" },
  };

  const t = (key: string) => labels[key]?.[currentLang] || labels[key]?.bs || key;

  // Helper za URL organizatora
  const getOrganizerUrl = (organizerName: string) => {
    const baseUrl = "/organizatori/" + encodeURIComponent(organizerName);
    return currentLang !== "bs" ? baseUrl + "/" + currentLang : baseUrl;
  };

  // Fetch events with the URL-determined language
  const {
    data: aboutEvents,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["about-events-detail", currentLang],
    queryFn: async (): Promise<AboutEvent[]> => {
      const events = await getEventsI18n(currentLang);
      const today = new Date().toISOString().split("T")[0];
      return (events || [])
        .filter((e: AboutEvent) => !e?.date || e.date >= today)
        .sort((a: AboutEvent, b: AboutEvent) => (a.date || "").localeCompare(b.date || ""));
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const { data: performers = [] } = usePerformers();
  const { data: venues = [] } = useVenues();
  const { data: sponsorsData } = useSponsors();
  const sponsorBanners = sponsorsData?.topBanners || [];
  const bottomBanner = sponsorsData?.bottomBanner || null;

  // Fetch performer translations when language is not ME
  const { data: performerTranslations = [] } = useQuery({
    queryKey: ["performer-i18n", currentLang],
    queryFn: async () => {
      if (currentLang === "bs") return [];
      const res = await fetch(
        `https://e-tickets-cache.rade-milosevic87.workers.dev/rest/v1/performer_i18n?lang=eq.${currentLang}&select=*`,
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: currentLang !== "bs",
    staleTime: 1000 * 60 * 10,
  });

  // Fetch venue translations when language is not ME
  const { data: venueTranslations = [] } = useQuery({
    queryKey: ["venue-i18n", currentLang],
    queryFn: async () => {
      if (currentLang === "bs") return [];
      const res = await fetch(
        `https://e-tickets-cache.rade-milosevic87.workers.dev/rest/v1/venue_i18n?lang=eq.${currentLang}&select=*`,
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: currentLang !== "bs",
    staleTime: 1000 * 60 * 10,
  });

  const [showSpinner, setShowSpinner] = useState(false);

  const getPerformerTypeInfo = (type?: string) => {
    const normalized = (type || "").toLowerCase();
    if (normalized.includes("glumac") || normalized.includes("glumica")) {
      return { icon: Drama, label: "Glumac/Glumica" };
    }
    if (
      normalized.includes("pjevač") ||
      normalized.includes("pjevačica") ||
      normalized.includes("pevač") ||
      normalized.includes("pevačica")
    ) {
      return { icon: Music, label: "Pjevač/Pjevačica" };
    }
    if (normalized.includes("stand up") || normalized.includes("komičar")) {
      return { icon: Laugh, label: "Stand Up komičar" };
    }
    if (normalized.includes("bend") || normalized.includes("grupa")) {
      return { icon: Music, label: "Bend/Grupa" };
    }
    if (normalized.includes("dj")) {
      return { icon: Music, label: "DJ" };
    }
    return { icon: Star, label: "Izvođač" };
  };

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSpinner(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowSpinner(false);
    }
  }, [isLoading]);

  const event = useMemo(() => {
    if (!aboutEvents || !slug) return null;
    const urlSlug = slug.trim().toLowerCase();
    let found = aboutEvents.find((e) => (e.slug || "").trim().toLowerCase() === urlSlug);
    if (found) return found;
    found = aboutEvents.find((e) => e.id === slug);
    return found || null;
  }, [aboutEvents, slug]);

  const relatedEvents = useMemo(() => {
    if (!aboutEvents || !event) return [];
    return aboutEvents.filter((e) => e.id !== event.id && e.hide !== "true" && e.hide !== true && e.country === "BA").slice(0, 6);
  }, [aboutEvents, event]);

  const sameDayVariants = useMemo(() => {
    if (!event || !aboutEvents) return [];
    const eventName = event.name.trim().toLowerCase();
    const eventDateKey = event.date?.split("T")[0];
    const variants = aboutEvents.filter(
      (e) =>
        e.name.trim().toLowerCase() === eventName &&
        e.date?.split("T")[0] === eventDateKey &&
        e.hide !== "true" &&
        e.hide !== true,
    );
    return variants.sort((a, b) => {
      const timeA = a.event_time || "00:00";
      const timeB = b.event_time || "00:00";
      return timeA.localeCompare(timeB);
    });
  }, [event, aboutEvents]);

  const matchedPerformers = useMemo(() => {
    if (!event || !performers.length) return [];
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/ž/g, "z")
        .replace(/ć/g, "c")
        .replace(/č/g, "c")
        .replace(/š/g, "s");

    const eventName = normalize(event.name);
    const eventDesc = normalize(typeof event.description === "string" ? event.description : "");
    const eventInfo = normalize(event.info || "");
    const eventPerformer = normalize(event.performer || "");

    // Create translation map
    const transMap = new Map();
    for (const t of performerTranslations) {
      transMap.set(t.performer_id, t.biography);
    }

    // Word-boundary match: provjeri da se ime pojavljuje kao cijela riječ, ne dio druge
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchesAsWord = (text: string, name: string) => {
      if (!name || !text) return false;
      return new RegExp(`(?:^|\\s|[,;.!?\\-])${escapeRegex(name)}(?:$|\\s|[,;.!?\\-])`, "i").test(` ${text} `);
    };

    return performers
      .filter((p) => {
        const performerNameNorm = normalize(p.name);
        if (eventPerformer && eventPerformer === performerNameNorm) return true;
        if (eventPerformer && matchesAsWord(eventPerformer, performerNameNorm)) return true;
        return (
          matchesAsWord(eventName, performerNameNorm) ||
          matchesAsWord(eventDesc, performerNameNorm) ||
          matchesAsWord(eventInfo, performerNameNorm)
        );
      })
      .map((p) => ({
        ...p,
        // Use translated biography if available, otherwise use original
        biography: transMap.get(p.id) || p.biography,
      }));
  }, [event, performers, performerTranslations]);

  const normalizeForMatch = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/ž/g, "z")
      .replace(/ć/g, "c")
      .replace(/č/g, "c")
      .replace(/š/g, "s");
  };

  const matchedVenue = useMemo(() => {
    if (!event?.venue || !venues.length) return null;
    const eventVenue = event.venue.trim();
    const eventVenueNorm = normalizeForMatch(eventVenue);
    let found = venues.find((v) => v.name.toLowerCase().trim() === eventVenue.toLowerCase());
    if (!found) {
      found = venues.find((v) => normalizeForMatch(v.name) === eventVenueNorm);
    }
    if (!found) {
      found = venues.find((v) => {
        const vNorm = normalizeForMatch(v.name);
        return eventVenueNorm.includes(vNorm) || vNorm.includes(eventVenueNorm);
      });
    }
    if (!found) return null;

    // Find translation for this venue
    const translation = venueTranslations.find((t: any) => t.venue_id === found!.id);

    return {
      ...found,
      // Use translated description if available, otherwise use original
      description: translation?.description || found.description,
    };
  }, [event, venues, venueTranslations]);

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

  // Helper za renderovanje sponzor banera
  const renderSponsorBanner = (
    banner: { id: string; image: string; link: string; alt: string },
    className: string,
    imgClassName: string,
  ) => {
    const imgElement = (
      <img src={banner.image} alt={banner.alt} className={imgClassName} loading="eager" decoding="async" />
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

  // Parse FAQ - može biti string (JSON) ili array - MUST be before early returns
  const parsedFaq = useMemo(() => {
    if (!event) return [];
    const faqData = (event as any).faq;
    if (!faqData) return [];
    if (Array.isArray(faqData)) return faqData;
    if (typeof faqData === "string") {
      try {
        const parsed = JSON.parse(faqData);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [event]);

  // Extract SEO fields from event
  const longDescription = (event as any)?.long_description || "";
  const venueInfo = (event as any)?.venue_info || "";
  const parkingInfo = (event as any)?.parking_info || "";
  const seoTitle = (event as any)?.seo_title || "";
  const seoDescription = (event as any)?.seo_description || "";
  const youtubeUrl = (event as any)?.youtube || "";

  // LOADING
  if (isLoading || (!event && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {showSpinner && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-base text-muted-foreground">Učitavanje...</span>
          </div>
        )}
      </div>
    );
  }

  // ERROR
  if (!event || error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold">Događaj nije pronađen</h1>
            <Button asChild>
              <Link to="/">Povratak na početnu</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const ticketCategories = parseCategories(event.categories);
  const lowestPrice = getLowestPrice(ticketCategories);
  const imageUrl = getImageUrl(event.image);
  const currencySymbol = getCurrencySymbol(event.currency);
  const formattedDate = formatDateTranslated(event.date);
  const eventTime = event.event_time || "";
  const venue = event.venue || "";

  const mapsUrl = matchedVenue?.google_maps_url
    ? matchedVenue.google_maps_url
    : matchedVenue?.latitude && matchedVenue?.longitude
      ? `https://www.google.com/maps?q=${matchedVenue.latitude},${matchedVenue.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;

  const mapsEmbedUrl =
    matchedVenue?.latitude && matchedVenue?.longitude
      ? `https://www.google.com/maps?q=${matchedVenue.latitude},${matchedVenue.longitude}&output=embed`
      : `https://www.google.com/maps?q=${encodeURIComponent(venue)}&output=embed`;

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = event.name + " - " + formattedDate;
    if (platform === "facebook") {
      window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), "_blank");
    } else if (platform === "twitter") {
      window.open(
        "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url),
        "_blank",
      );
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast({ title: "Link kopiran!", description: "Link je uspješno kopiran u clipboard." });
    }
  };

  const categoryUrl = "/?category=" + encodeURIComponent(event.category || "");

  // Use parseLocalDate to avoid UTC timezone shift
  const eventDatePart = event.date.split("T")[0];
  let evtYear: number, evtMonth: number, evtDay: number;
  if (eventDatePart.includes(".")) {
    [evtDay, evtMonth, evtYear] = eventDatePart.split(".").map(Number);
  } else {
    [evtYear, evtMonth, evtDay] = eventDatePart.split("-").map(Number);
  }
  const eventDate = new Date(evtYear, evtMonth - 1, evtDay);
  const dayNum = eventDate.getDate();
  const monthShort = getTranslatedMonth(eventDate);
  const monthYear = eventDate.toLocaleDateString("bs", { month: "short", year: "numeric" });
  const dayName = eventDate.toLocaleDateString("bs", { weekday: "short" });

  // Use SEO fields from database if available, otherwise generate
  const metaTitle = seoTitle || event.name + " | " + venue + " | " + formattedDate + " | etickets";
  const metaDescription =
    seoDescription ||
    (event.info
      ? event.info.substring(0, 155) + "..."
      : "Kupite ulaznice za " + event.name + ". " + formattedDate + (venue ? " - " + venue : "") + " | etickets");

  const eventSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.date,
    endDate: event.date,
    description: event.info || metaDescription,
    image: imageUrl,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: matchedVenue
      ? {
          "@type": "Place",
          name: matchedVenue.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: matchedVenue.address || "",
            addressLocality: matchedVenue.city,
            addressCountry: "ME",
          },
          ...(matchedVenue.latitude &&
            matchedVenue.longitude && {
              geo: {
                "@type": "GeoCoordinates",
                latitude: matchedVenue.latitude,
                longitude: matchedVenue.longitude,
              },
            }),
        }
      : { "@type": "Place", name: venue, address: { "@type": "PostalAddress", addressCountry: "ME" } },
    offers: {
      "@type": "Offer",
      price: lowestPrice,
      priceCurrency: event.currency || "EUR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/dogadjaj/${event.slug}`,
      validFrom: new Date().toISOString(),
    },
    organizer: {
      "@type": "Organization",
      name: event.organizer || "etickets",
      url: event.organizer ? SITE_URL + "/organizatori/" + encodeURIComponent(event.organizer) : SITE_URL,
    },
    ...(matchedPerformers.length > 0
      ? {
          performer: matchedPerformers.map((p) => ({
            "@type": "PerformingGroup",
            name: p.name,
            ...(p.image && { image: p.image }),
            ...(p.biography && { description: p.biography }),
          })),
        }
      : event.performer
        ? {
            performer: {
              "@type": "PerformingGroup",
              name: event.performer,
            },
          }
        : {}),
    ...(event.category && {
      eventCategory: event.category,
    }),
    ...(eventTime && {
      doorTime: eventTime,
    }),
    inLanguage: currentLang === "bs" ? "bs" : "en",
  };

  const sameCategory = relatedEvents.filter((e: any) => e.category === event.category).slice(0, 3);
  const filteredOtherEvents =
    sameCategory.length >= 3
      ? sameCategory
      : sameCategory.concat(
          relatedEvents.filter((e: any) => e.category !== event.category).slice(0, 3 - sameCategory.length),
        );

  const hasMultipleTimesOnSameDay = sameDayVariants.length > 1;

  const getTicketsUrl = (variant: any) => {
    const type = variant.eventType || "seats";
    // Sport kategorija: seats → mapa sjedišta, simple → MatchPage
    if (variant.category === "Sport") {
      return type === "seats" ? "/fscg/" + variant.slug : "/mec/" + variant.slug;
    }
    if (type === "festival") return "/festival/" + variant.slug;
    return type === "simple" ? "/simple-event/" + variant.slug : "/events/" + variant.slug;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SEO
        title={metaTitle}
        description={metaDescription}
        image={imageUrl}
        type="event"
        basePath={`/dogadjaj/${event.slug}`}
      />
      <BreadcrumbSchema
        items={[
          { name: t("home"), url: "/" },
          { name: event.category || "Događaji", url: `/?category=${encodeURIComponent(event.category || "")}` },
          { name: event.name, url: `/dogadjaj/${event.slug}` },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(eventSchema)}</script>
        {parsedFaq.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: parsedFaq.map((item: any) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            })}
          </script>
        )}
      </Helmet>

      <Header slugForEvent={slug} />

      <main className="flex-1">
        {/* MOBILE */}
        <div className="md:hidden">
          <div className="container py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
              Nazad
            </button>
          </div>

          {/* MOBILE IMAGE */}
          <section className="container pb-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <img src={imageUrl} alt={event.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              {event.category && (
                <Link
                  to={categoryUrl}
                  className="absolute top-4 right-4 rounded-full bg-accent px-4 py-1.5 text-base font-semibold text-accent-foreground hover:bg-accent/90"
                >
                  {event.category}
                </Link>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h1 className="mb-2 text-2xl font-extrabold text-white drop-shadow-lg">{event.name}</h1>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/90 text-base">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formattedDate}</span>
                  </div>
                  {eventTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{eventTime}</span>
                    </div>
                  )}
                  {venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{venue}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* MOBILE SPONSOR BANNERS */}
          {sponsorBanners.length > 0 && (
            <section className="container pb-4">
              {sponsorBanners.length === 1 ? (
                <div>
                  {renderSponsorBanner(
                    sponsorBanners[0],
                    "block rounded-xl overflow-hidden shadow-card",
                    "w-full h-auto object-cover aspect-[1000/300]",
                  )}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 pb-2">
                  {sponsorBanners.map((banner) => (
                    <div key={banner.id} className="flex-shrink-0 w-[85%] snap-start">
                      {renderSponsorBanner(
                        banner,
                        "block rounded-xl overflow-hidden shadow-card",
                        "w-full h-auto object-cover aspect-[1000/300]",
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* MOBILE TICKET CARDS - KOMPAKTNIJA VERZIJA */}
          <section className="container pb-6">
            <div className="space-y-2">
              {hasMultipleTimesOnSameDay ? (
                sameDayVariants.map((variant) => {
                  const variantCats = parseCategories(variant.categories);
                  const variantPrice = getLowestPrice(variantCats);
                  const variantCurrency = getCurrencySymbol(variant.currency);
                  const ticketsUrl = getTicketsUrl(variant);

                  return (
                    <Link
                      key={variant.id}
                      to={ticketsUrl}
                      className="group block rounded-xl border-2 border-primary bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-center">
                        <div className="flex flex-col items-center justify-center px-3 py-3 border-r border-dashed border-border min-w-[70px]">
                          <span className="text-xl font-bold text-primary leading-none">{dayNum}</span>
                          <span className="text-xs text-muted-foreground uppercase">{monthShort}</span>
                          <span className="text-xs text-primary font-semibold mt-1">{variant.event_time || "TBA"}</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-center px-3 py-3 min-w-0">
                          {variant.venue && (
                            <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                              <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span className="truncate">{variant.venue}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end justify-center px-3 py-3">
                          <p className="text-xs text-muted-foreground">{t("from")}</p>
                          <p className="text-lg font-bold text-primary">
                            {variantPrice > 0 ? variantPrice + variantCurrency : "0€"}
                          </p>
                          <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium mt-1">
                            {t("buy")}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <Link
                  to={getTicketsUrl(event)}
                  className="group block rounded-xl border-2 border-primary bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center">
                    <div className="flex flex-col items-center justify-center px-3 py-3 border-r border-dashed border-border min-w-[70px]">
                      <span className="text-xl font-bold text-primary leading-none">{dayNum}</span>
                      <span className="text-xs text-muted-foreground uppercase">{monthShort}</span>
                      {eventTime && (
                        <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {eventTime}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center px-3 py-3 min-w-0">
                      {venue && (
                        <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                          <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="truncate">{venue}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end justify-center px-3 py-3">
                      <p className="text-xs text-muted-foreground">{t("from")}</p>
                      <p className="text-lg font-bold text-primary">
                        {lowestPrice > 0 ? lowestPrice + currencySymbol : "0€"}
                      </p>
                      <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium mt-1">
                        {t("buy")}
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </section>

          {/* MOBILE PERFORMERS - Veće kartice */}
          {matchedPerformers.length > 0 && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                <Star className="w-6 h-6 text-primary" />
                {matchedPerformers.length === 1 ? t("performer") : t("performers")}
              </h2>
              <div className="space-y-4">
                {matchedPerformers.map((performer) => {
                  const typeInfo = getPerformerTypeInfo((performer as any).type);
                  const PerformerIcon = typeInfo.icon;
                  return (
                    <Link
                      key={performer.id}
                      to={"/izvodjaci/" + performer.slug + (currentLang !== "bs" ? "/" + currentLang : "")}
                      className="flex gap-4 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all group"
                    >
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {performer.image ? (
                          <img
                            src={performer.image}
                            alt={performer.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <PerformerIcon className="w-10 h-10 text-primary/60" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                          <PerformerIcon className="w-4 h-4 text-primary" />
                          <span className="text-sm text-primary font-medium">{typeInfo.label}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                          {performer.name}
                        </h3>
                        {performer.biography && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{performer.biography}</p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* MOBILE O DOGAĐAJU */}
          {event.info && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold">{t("aboutEvent")}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-base">{event.info}</p>
            </section>
          )}

          {/* MOBILE ORGANIZATOR - SA LINKOM I LOGOM */}
          {event.organizer && (
            <section className="container pb-6">
              <h2 className="mb-3 text-lg font-bold">{t("organizer")}</h2>
              <Link
                to={getOrganizerUrl(event.organizer)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/50 hover:shadow-md transition-all group"
              >
                {(event as any).organizer_logo ? (
                  <img
                    src={(event as any).organizer_logo}
                    alt={event.organizer}
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                    {event.organizer}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("verifiedOrganizer")}</p>
                </div>
                <div className="flex items-center gap-1 text-primary text-sm font-medium">
                  <span className="hidden sm:inline">{t("learnMoreAboutOrganizer")}</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Link>
            </section>
          )}

          {/* MOBILE PARKING - Kompaktniji dizajn */}
          {parkingInfo && (
            <section className="container pb-6">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-border">
                  <ParkingCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-base font-semibold text-blue-700 dark:text-blue-300">{t("parking")}</h2>
                </div>
                <div className="p-4">
                  <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">{parkingInfo}</p>
                </div>
              </div>
            </section>
          )}
          {/* MOBILE LOKACIJA */}
          {venue && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary" />
                {t("location")}
              </h2>
              <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
                <GoogleMapEmbed embedUrl={mapsEmbedUrl} title={"Mapa - " + venue} className="h-[180px]" />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base truncate">{venue}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {matchedVenue?.city && (
                            <span className="text-sm text-muted-foreground">{matchedVenue.city}</span>
                          )}
                          {matchedVenue?.capacity && (
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                              {matchedVenue.capacity.toLocaleString()} {t("seats")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Navigation className="h-5 w-5" />
                    </a>
                  </div>
                  {/* Kratak opis lokacije - MOBILE */}
                  {matchedVenue?.description && (
                    <p className="text-base text-muted-foreground mt-3 line-clamp-2">{matchedVenue.description}</p>
                  )}
                  {matchedVenue && (
                    <Link
                      to={"/lokacije/" + matchedVenue.slug + (currentLang !== "bs" ? "/" + currentLang : "")}
                      className="inline-flex items-center gap-1 text-base text-primary font-medium mt-3 hover:underline"
                    >
                      {t("learnMoreAboutVenue")}
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* MOBILE YOUTUBE SEKCIJA - ISPOD LOKACIJE */}
          {youtubeUrl && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                <Youtube className="w-6 h-6 text-red-500" />
                {t("videoContent")}
              </h2>
              <YouTubeSection url={youtubeUrl} title={event.name} currentLang={currentLang} />
            </section>
          )}

          {/* MOBILE FAQ */}
          {parsedFaq.length > 0 && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" />
                {t("faq")}
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {parsedFaq.map((item: any, index: number) => (
                  <AccordionItem key={index} value={`faq-mobile-${index}`}>
                    <AccordionTrigger className="text-left text-base font-medium">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* MOBILE DETALJAN OPIS - Na kraju */}
          {longDescription && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold">{t("detailedDescription")}</h2>
              <article className="prose prose-base dark:prose-invert max-w-none">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-base">{longDescription}</p>
              </article>
            </section>
          )}

          {/* MOBILE SHARE */}
          <section className="container pb-8">
            <h2 className="mb-4 text-xl font-bold">{t("share")}</h2>
            <div className="flex gap-3">
              <button
                onClick={() => handleShare("facebook")}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90 transition-opacity"
              >
                <Facebook className="h-6 w-6" />
              </button>
              <button
                onClick={() => handleShare("twitter")}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1DA1F2] text-white hover:opacity-90 transition-opacity"
              >
                <Twitter className="h-6 w-6" />
              </button>
              <button
                onClick={() => handleShare("copy")}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Link2 className="h-6 w-6" />
              </button>
            </div>
          </section>
        </div>

        {/* DESKTOP HERO */}
        <section className="hidden md:block bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-8 py-8 md:py-12 lg:py-16">
              <div className="flex flex-col justify-center order-2 lg:order-1">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <Link to="/" className="hover:text-white transition-colors">
                    Početna
                  </Link>
                  <span className="text-slate-500">→</span>
                  {event.category && (
                    <>
                      <Link to={categoryUrl} className="hover:text-white transition-colors">
                        {event.category}
                      </Link>
                      <span className="text-slate-500">→</span>
                    </>
                  )}
                  <span className="text-slate-300">{event.name}</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  {event.name}
                </h1>
                <div className="flex flex-col gap-3 mb-8">
                  <div className="flex items-center gap-3 text-slate-300">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="text-lg">{formattedDate}</span>
                    {eventTime && (
                      <>
                        <span className="text-slate-500">|</span>
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-lg">{eventTime}</span>
                      </>
                    )}
                  </div>
                  {venue && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="text-lg">{venue}</span>
                      {matchedVenue && (
                        <Link
                          to={"/lokacije/" + matchedVenue.slug + (currentLang !== "bs" ? "/" + currentLang : "")}
                          className="text-sm text-primary hover:underline"
                        >
                          Detalji →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                {matchedPerformers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {matchedPerformers.map((p) => {
                      const typeInfo = getPerformerTypeInfo((p as any).type);
                      const PerformerIcon = typeInfo.icon;
                      return (
                        <Link
                          key={p.id}
                          to={"/izvodjaci/" + p.slug + (currentLang !== "bs" ? "/" + currentLang : "")}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                        >
                          <PerformerIcon className="w-4 h-4" />
                          {p.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-400 mb-1">{t("pricesFrom")}</p>
                  <p className="text-4xl font-bold text-white">
                    {lowestPrice > 0 ? lowestPrice + currencySymbol : t("free")}
                  </p>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative aspect-[4/3] lg:aspect-[3/2] overflow-hidden rounded-2xl shadow-2xl">
                  <img src={imageUrl} alt={event.name} className="h-full w-full object-cover" />
                  {event.category && (
                    <Link
                      to={categoryUrl}
                      className="absolute top-4 right-4 rounded-full bg-primary/90 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary transition-colors"
                    >
                      {event.category}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DESKTOP TICKET BAR - sponzor lijevo OD box-a, dugme desno */}
        <section className="hidden md:block border-b border-border bg-card">
          <div className="container py-6">
            <div className="max-w-5xl mx-auto">
              {hasMultipleTimesOnSameDay ? (
                <div className="space-y-4">
                  {sameDayVariants.map((variant) => {
                    const variantCats = parseCategories(variant.categories);
                    const variantPrice = getLowestPrice(variantCats);
                    const variantCurrency = getCurrencySymbol(variant.currency);
                    const ticketsUrl = getTicketsUrl(variant);

                    return (
                      <div
                        key={variant.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl border-2 border-primary p-4"
                      >
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-center justify-center bg-primary/10 rounded-xl px-5 py-3 min-w-[80px]">
                            <span className="text-2xl font-bold text-primary">{dayNum}</span>
                            <span className="text-xs text-muted-foreground uppercase">
                              {getTranslatedMonth(new Date(variant.date))}
                            </span>
                            <span className="text-sm font-semibold text-primary mt-1">
                              {variant.event_time || "TBA"}
                            </span>
                          </div>
                          <div>
                            <h2 className="font-semibold text-lg">{variant.name}</h2>
                            {variant.venue && <p className="text-sm text-muted-foreground">{variant.venue}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{t("alreadyFrom")}</p>
                            <p className="text-xl font-bold text-primary">
                              {variantPrice > 0 ? variantPrice + variantCurrency : t("free")}
                            </p>
                          </div>
                          <Button asChild className="px-8">
                            <Link to={ticketsUrl}>{t("buyTickets")}</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* LIJEVA POLOVINA - Sponzor banner */}
                  <div className="h-full">
                    {sponsorBanners.length > 0 ? (
                      renderSponsorBanner(
                        sponsorBanners[0],
                        "block rounded-xl overflow-hidden h-full",
                        "w-full h-full object-cover",
                      )
                    ) : (
                      <div className="h-full rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">Sponzor prostor</span>
                      </div>
                    )}
                  </div>

                  {/* DESNA POLOVINA - Ticket box */}
                  <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-primary p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center bg-primary/10 rounded-xl px-4 py-3 min-w-[70px]">
                        <span className="text-2xl font-bold text-primary">{dayNum}</span>
                        <span className="text-xs text-muted-foreground uppercase">
                          {getTranslatedMonth(new Date(event.date))}
                        </span>
                        {eventTime && <span className="text-xs text-muted-foreground mt-1">{eventTime}</span>}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-base truncate">{event.name}</h2>
                        {venue && <p className="text-sm text-muted-foreground truncate">{venue}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{t("alreadyFrom")}</p>
                        <p className="text-xl font-bold text-primary">
                          {lowestPrice > 0 ? lowestPrice + currencySymbol : t("free")}
                        </p>
                      </div>
                      <Button asChild className="px-6">
                        <Link to={getTicketsUrl(event)}>{t("continue")}</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CONTENT - DESKTOP ONLY */}
        <section className="hidden md:block container py-10">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-8">
              {event.info && (
                <div>
                  <h2 className="mb-4 text-xl font-bold">{t("aboutEvent")}</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.info}</p>
                </div>
              )}

              {/* DESKTOP ORGANIZATOR - SA LINKOM I LOGOM */}
              {event.organizer && (
                <div>
                  <h2 className="mb-4 text-xl font-bold">{t("organizer")}</h2>
                  <Link
                    to={getOrganizerUrl(event.organizer)}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    {(event as any).organizer_logo ? (
                      <img
                        src={(event as any).organizer_logo}
                        alt={event.organizer}
                        className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold group-hover:text-primary transition-colors">{event.organizer}</p>
                      <p className="text-sm text-muted-foreground">{t("verifiedOrganizer")}</p>
                    </div>
                    <div className="flex items-center gap-1 text-primary text-sm font-medium">
                      {t("learnMoreAboutOrganizer")}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                </div>
              )}

              {/* DESKTOP PARKING - Kompaktniji dizajn */}
              {parkingInfo && (
                <div>
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-border">
                      <ParkingCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h2 className="text-base font-semibold text-blue-700 dark:text-blue-300">{t("parking")}</h2>
                    </div>
                    <div className="p-4">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{parkingInfo}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* DESKTOP LOKACIJA */}
              {venue && (
                <div>
                  <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {t("location")}
                  </h2>
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <GoogleMapEmbed embedUrl={mapsEmbedUrl} title={"Mapa - " + venue} className="h-[180px]" />
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{venue}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {matchedVenue?.city && (
                                <span className="text-xs text-muted-foreground">{matchedVenue.city}</span>
                              )}
                              {matchedVenue?.capacity && (
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                  {matchedVenue.capacity.toLocaleString()} {t("seats")}
                                </span>
                              )}
                            </div>
                            {matchedVenue?.address && (
                              <p className="text-xs text-muted-foreground truncate">{matchedVenue.address}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {matchedVenue && (
                            <Link
                              to={"/lokacije/" + matchedVenue.slug + (currentLang !== "bs" ? "/" + currentLang : "")}
                              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                              title="Detalji lokacije"
                            >
                              <Building2 className="h-4 w-4" />
                            </Link>
                          )}
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            <Navigation className="h-4 w-4" />
                            <span>{t("navigation")}</span>
                          </a>
                        </div>
                      </div>
                      {/* Kratak opis lokacije - DESKTOP */}
                      {matchedVenue?.description && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{matchedVenue.description}</p>
                      )}
                      {matchedVenue && (
                        <Link
                          to={"/lokacije/" + matchedVenue.slug + (currentLang !== "bs" ? "/" + currentLang : "")}
                          className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-2 hover:underline"
                        >
                          {t("learnMoreAboutVenue")}
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* DESKTOP YOUTUBE SEKCIJA - ISPOD LOKACIJE */}
              {youtubeUrl && (
                <div>
                  <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-500" />
                    {t("videoContent")}
                  </h2>
                  <YouTubeSection url={youtubeUrl} title={event.name} currentLang={currentLang} />
                </div>
              )}

              {/* DESKTOP FAQ */}
              {parsedFaq.length > 0 && (
                <div>
                  <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    {t("faq")}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {parsedFaq.map((item: any, index: number) => (
                      <AccordionItem key={index} value={`faq-desktop-${index}`}>
                        <AccordionTrigger className="text-left font-medium">{item.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

              {/* DESKTOP DETALJAN OPIS - Na kraju */}
              {longDescription && (
                <div>
                  <h2 className="mb-4 text-xl font-bold">{t("detailedDescription")}</h2>
                  <article className="prose dark:prose-invert max-w-none">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{longDescription}</p>
                  </article>
                </div>
              )}

              <div>
                <h2 className="mb-4 text-xl font-bold">{t("share")}</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleShare("facebook")}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90"
                  >
                    <Facebook className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleShare("twitter")}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DA1F2] text-white hover:opacity-90"
                  >
                    <Twitter className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleShare("copy")}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                  >
                    <Link2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* DESKTOP SPONSOR BANNERS - ako ima više od 1, prikaži drugi ispod share */}
              {sponsorBanners.length > 1 && (
                <div className="pt-4">
                  <div className="grid gap-4 grid-cols-2">
                    {sponsorBanners
                      .slice(1, 3)
                      .map((banner) =>
                        renderSponsorBanner(
                          banner,
                          "block rounded-xl overflow-hidden hover:opacity-90 hover:scale-[1.01] transition-all duration-300 shadow-card",
                          "w-full h-auto object-cover aspect-[1000/300]",
                        ),
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* DESKTOP SIDEBAR - Performers */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {matchedPerformers.length > 0 &&
                  matchedPerformers.map((performer) => {
                    const typeInfo = getPerformerTypeInfo((performer as any).type);
                    const PerformerIcon = typeInfo.icon;
                    return (
                      <Link
                        key={performer.id}
                        to={"/izvodjaci/" + performer.slug + (currentLang !== "bs" ? "/" + currentLang : "")}
                        className="block rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-lg transition-all group"
                      >
                        {performer.image && (
                          <div className="aspect-square rounded-lg overflow-hidden mb-4">
                            <img
                              src={performer.image}
                              alt={performer.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        {!performer.image && (
                          <div className="aspect-square rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <PerformerIcon className="w-12 h-12 text-primary/40" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <PerformerIcon className="w-4 h-4 text-primary" />
                          <h3 className="font-bold group-hover:text-primary transition-colors">{performer.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{typeInfo.label}</p>
                        {performer.biography && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{performer.biography}</p>
                        )}
                        <span className="inline-flex items-center gap-1 text-sm text-primary mt-3">
                          {t("viewProfile")}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </Link>
                    );
                  })}
                {!matchedPerformers.length && event.biografija && (
                  <div className="rounded-xl border border-border bg-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Mic2 className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold">{t("performerBio")}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                      {event.biografija}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {filteredOtherEvents.length > 0 && (
          <section className="border-t border-border bg-muted/30 py-12 md:py-16">
            <div className="container">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold">{t("similarEvents")}</h2>
                <Link to={categoryUrl} className="text-sm font-medium text-primary hover:underline">
                  {t("seeAll")}
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOtherEvents.map((evt: any, index: number) => (
                  <EventCard
                    key={evt.id}
                    event={{
                      id: evt.id,
                      title: evt.name,
                      slug: evt.slug,
                      date: formatEventDate(evt.date),
                      time: evt.event_time || "",
                      venue: evt.venue,
                      city: "",
                      image: getImageUrl(evt.image),
                      category: evt.category || "Događaj",
                      priceFrom: getLowestPrice(parseCategories(evt.categories)),
                      currency: getCurrencySymbol(evt.currency),
                    }}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EventDetail;
