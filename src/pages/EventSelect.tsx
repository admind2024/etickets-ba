import { useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapPin, Clock, ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useAboutEvents,
  getImageUrl,
  parseCategories,
  getLowestPrice,
  getCurrencySymbol,
} from "@/hooks/useAboutEvents";

const EventSelect = () => {
  const { slug, lang } = useParams<{ slug: string; lang?: string }>();
  const navigate = useNavigate();
  const { setLangFromUrl } = useLanguage();

  // Determine language from URL param, default to "bs"
  const currentLang = lang === "en" ? lang : "bs";

  // Sync URL lang sa context-om
  useEffect(() => {
    setLangFromUrl(lang);
  }, [lang, setLangFromUrl]);

  // UI Labels for i18n
  const labels: Record<string, Record<string, string>> = {
    loading: { bs: "Učitavanje...", en: "Loading..." },
    eventNotFound: { bs: "Događaj nije pronađen", en: "Event not found" },
    backToHome: { bs: "Povratak na početnu", en: "Back to home" },
    back: { bs: "Nazad", en: "Back" },
    selectDate: {
      bs: "Izaberite termin koji vam odgovara",
      en: "Choose your preferred date",
    },
    availableDates: { bs: "Dostupni termini", en: "Available dates" },
    from: { bs: "od", en: "from" },
    free: { bs: "Besplatno", en: "Free" },
    details: { bs: "Detalji", en: "Details" },
    at: { bs: "u", en: "at" },
    seoTitleSuffix: { bs: "Izaberi termin", en: "Select date" },
    seoDescPrefix: { bs: "Izaberite termin za", en: "Choose a date for" },
    seoDescSuffix: {
      bs: "dostupnih termina. Brza i sigurna online kupovina na etickets",
      en: "available dates. Fast and secure online purchase at etickets",
    },
  };

  const t = (key: string) => labels[key]?.[currentLang] || labels[key]?.bs || key;

  // Date formatting based on language
  const getDateLocale = () => {
    switch (currentLang) {
      case "en":
        return "en-GB";
      default:
        return "bs";
    }
  };

  // HOOK MORA BITI NA VRHU
  const { data: aboutEvents, isLoading, error } = useAboutEvents();

  // Nađi SVE događaje čiji slug POČINJE sa URL slug-om
  const eventVariants = useMemo(() => {
    if (!aboutEvents || !slug) {
      console.log("[EventSelect] No aboutEvents or slug", { aboutEvents: !!aboutEvents, slug });
      return [];
    }

    console.log("[EventSelect] Searching for slug:", slug);

    const urlSlug = slug.toLowerCase();

    const variants = aboutEvents.filter((e) => {
      if (e.hide === "true" || e.hide === true) return false;
      if (e.country !== "BA") return false;

      // Traži po početku slug-a iz baze
      const eventSlug = (e.slug || "").toLowerCase();
      return eventSlug.startsWith(urlSlug + "-");
    });

    console.log("[EventSelect] Found variants:", variants.length);

    // Sortiraj po datumu pa po vremenu - koristi lokalno parsiranje
    return variants.sort((a, b) => {
      // Compare dates as strings first (YYYY-MM-DD format sorts correctly)
      const datePartA = a.date.split("T")[0];
      const datePartB = b.date.split("T")[0];
      const dateCompare = datePartA.localeCompare(datePartB);
      if (dateCompare !== 0) return dateCompare;
      const timeA = a.event_time || "00:00";
      const timeB = b.event_time || "00:00";
      return timeA.localeCompare(timeB);
    });
  }, [aboutEvents, slug]);

  // Grupiši po datumu
  const variantsByDate = useMemo(() => {
    const grouped = new Map<string, typeof eventVariants>();

    eventVariants.forEach((variant) => {
      const dateKey = variant.date.split("T")[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(variant);
    });

    return Array.from(grouped.entries()).map(([date, variants]) => ({
      date,
      variants,
    }));
  }, [eventVariants]);

  const formatDateLong = (dateStr: string) => {
    // Parse date locally to avoid UTC shift
    const datePart = dateStr.split("T")[0];
    const [y, m, d] = datePart.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(getDateLocale(), {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Build event link with language
  const getEventLink = (eventSlug: string) => {
    if (currentLang === "bs") {
      return `/event/${eventSlug}`;
    }
    return `/event/${eventSlug}/${currentLang}`;
  };

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error || eventVariants.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold">{t("eventNotFound")}</h1>
            <Button asChild>
              <Link to="/">{t("backToHome")}</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const representativeEvent = eventVariants[0];
  const imageUrl = getImageUrl(representativeEvent.image);
  const seoTitle = representativeEvent.name + " - " + t("seoTitleSuffix") + " | etickets";
  const seoDescription =
    t("seoDescPrefix") + " " + representativeEvent.name + ". " + eventVariants.length + " " + t("seoDescSuffix");

  return (
    <div className="flex min-h-screen flex-col">
      <SEO
        title={seoTitle}
        description={seoDescription}
        image={imageUrl}
        type="event"
        basePath={`/event-select/${slug}`}
      />

      <Header />

      <main className="flex-1">
        {/* Mobile/Tablet Hero */}
        <section className="relative overflow-hidden lg:hidden">
          <div className="absolute inset-0 h-[250px] sm:h-[280px]">
            <img src={imageUrl} alt={representativeEvent.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-background" />
          </div>

          <div className="container relative pt-6 pb-4 sm:pt-8 min-h-[250px] sm:min-h-[280px] flex flex-col justify-end">
            <button
              onClick={() => navigate(-1)}
              className="absolute top-6 left-4 sm:left-6 flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("back")}
            </button>

            <div className="max-w-4xl mt-auto pb-3">
              {representativeEvent.category && (
                <span className="inline-block bg-primary/90 text-white px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-2">
                  {representativeEvent.category}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 line-clamp-2">
                {representativeEvent.name}
              </h1>
              <p className="text-white/80 text-sm">{t("selectDate")}</p>
            </div>
          </div>
        </section>

        {/* Desktop Split Layout */}
        <section className="hidden lg:block">
          <div className="container py-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("back")}
            </button>

            <div className="grid lg:grid-cols-4 gap-8">
              {/* Lijeva strana - Slika */}
              <div className="lg:col-span-1">
                <div className="sticky top-6">
                  <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-2xl">
                    <img src={imageUrl} alt={representativeEvent.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      {representativeEvent.category && (
                        <span className="inline-block bg-primary/90 text-white px-3 py-1 rounded-full text-sm font-medium mb-3">
                          {representativeEvent.category}
                        </span>
                      )}
                      <h1 className="text-3xl font-bold text-white mb-2">{representativeEvent.name}</h1>
                      <p className="text-white/80 text-sm">{t("selectDate")}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desna strana - Termini */}
              <div className="lg:col-span-3">
                <div className="lg:max-w-[60%]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">
                      {t("availableDates")}{" "}
                      <span className="text-muted-foreground font-normal text-base">({eventVariants.length})</span>
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {variantsByDate.map(({ date, variants }) => (
                      <div key={date}>
                        {/* Datum header */}
                        <h3 className="text-sm font-semibold text-foreground mb-3 capitalize flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {formatDateLong(date)}
                        </h3>

                        <div className="space-y-3">
                          {variants.map((variant) => {
                            const cats = parseCategories(variant.categories);
                            const lowestPrice = getLowestPrice(cats);
                            const currencySymbol = getCurrencySymbol(variant.currency);
                            const eventDetailUrl = getEventLink(variant.slug || variant.id);
                            // Parse date locally to avoid UTC shift
                            const variantDatePart = variant.date.split("T")[0];
                            const [vY, vM, vD] = variantDatePart.split("-").map(Number);
                            const eventDate = new Date(vY, vM - 1, vD);
                            const dayNum = eventDate.getDate();
                            const monthShort = eventDate.toLocaleString(getDateLocale(), { month: "short" });

                            return (
                              <Link
                                key={variant.id}
                                to={eventDetailUrl}
                                className="group block rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                              >
                                <div className="flex items-stretch">
                                  {/* Datum */}
                                  <div className="flex flex-col items-center justify-center px-4 py-4 border-r border-dashed border-border min-w-[100px]">
                                    <span className="text-3xl font-bold text-primary leading-none">{dayNum}</span>
                                    <span className="text-xs text-muted-foreground mt-1 uppercase">{monthShort}</span>
                                    {variant.event_time && (
                                      <span className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {variant.event_time}
                                      </span>
                                    )}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 flex flex-col justify-center px-4 py-4 min-w-0">
                                    {variant.venue && (
                                      <div className="flex items-center gap-2 text-sm text-foreground font-medium mb-1">
                                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                                        <span className="truncate">{variant.venue}</span>
                                      </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      {formatDateLong(variant.date)}
                                      {variant.event_time && " " + t("at") + " " + variant.event_time}
                                    </p>
                                  </div>

                                  {/* Cijena i dugme */}
                                  <div className="flex flex-col items-end justify-center px-4 py-4">
                                    <p className="text-xs text-muted-foreground mb-1">{t("from")}</p>
                                    <p className="text-2xl font-bold text-primary mb-2">
                                      {lowestPrice > 0 ? lowestPrice + currencySymbol : t("free")}
                                    </p>
                                    <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                                      <span>{t("details")}</span>
                                      <ChevronRight className="w-4 h-4" />
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile/Tablet Termini */}
        <section className="container py-6 lg:hidden">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold">
                {t("availableDates")}{" "}
                <span className="text-muted-foreground font-normal text-base">({eventVariants.length})</span>
              </h2>
            </div>

            <div className="space-y-6">
              {variantsByDate.map(({ date, variants }) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-foreground mb-3 capitalize flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {formatDateLong(date)}
                  </h3>

                  <div className="space-y-3">
                    {variants.map((variant) => {
                      const cats = parseCategories(variant.categories);
                      const lowestPrice = getLowestPrice(cats);
                      const currencySymbol = getCurrencySymbol(variant.currency);
                      const eventDetailUrl = getEventLink(variant.slug || variant.id);
                      // Parse date locally to avoid UTC shift
                      const variantDatePart2 = variant.date.split("T")[0];
                      const [vY2, vM2, vD2] = variantDatePart2.split("-").map(Number);
                      const eventDate = new Date(vY2, vM2 - 1, vD2);
                      const dayNum = eventDate.getDate();
                      const monthShort = eventDate.toLocaleString(getDateLocale(), { month: "short" });

                      return (
                        <Link
                          key={variant.id}
                          to={eventDetailUrl}
                          className="group block rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                        >
                          <div className="flex items-stretch">
                            <div className="flex flex-col items-center justify-center px-3 sm:px-4 py-4 border-r border-dashed border-border min-w-[70px] sm:min-w-[80px]">
                              <span className="text-xl sm:text-2xl font-bold text-primary leading-none">{dayNum}</span>
                              <span className="text-xs text-muted-foreground mt-1 uppercase">{monthShort}</span>
                              {variant.event_time && (
                                <span className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {variant.event_time}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 flex flex-col justify-center px-3 sm:px-4 py-4 min-w-0">
                              {variant.venue && (
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground font-medium mb-1">
                                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                                  <span className="truncate">{variant.venue}</span>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground hidden sm:block">
                                {formatDateLong(variant.date)}
                                {variant.event_time && " " + t("at") + " " + variant.event_time}
                              </p>
                            </div>

                            <div className="flex flex-col items-end justify-center px-3 sm:px-4 py-4">
                              <p className="text-xs text-muted-foreground mb-1">{t("from")}</p>
                              <p className="text-lg sm:text-xl font-bold text-primary mb-2">
                                {lowestPrice > 0 ? lowestPrice + currencySymbol : t("free")}
                              </p>
                              <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-primary group-hover:gap-2 transition-all">
                                <span>{t("details")}</span>
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default EventSelect;
