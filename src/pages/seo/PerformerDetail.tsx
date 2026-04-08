import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Calendar,
  MapPin,
  Loader2,
  Ticket,
  Music,
  ExternalLink,
  Drama,
  Laugh,
  Star,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import { SITE_URL } from "@/lib/seoConfig";
import { usePerformerBySlug } from "@/hooks/usePerformers";
import { useAboutEvents, formatEventDate, getImageUrl } from "@/hooks/useAboutEvents";

// Helper funkcija za ikonicu i label na osnovu tipa izvođača
const getPerformerTypeInfo = (type?: string, lang: string = "me") => {
  const normalized = (type || "").toLowerCase();

  const typeLabels: Record<string, Record<string, string>> = {
    actor: { me: "Glumac/Glumica", en: "Actor/Actress", ru: "Актёр/Актриса" },
    singer: { me: "Pjevač/Pjevačica", en: "Singer", ru: "Певец/Певица" },
    comedian: { me: "Stand Up komičar", en: "Stand-up Comedian", ru: "Стендап-комик" },
    band: { me: "Bend/Grupa", en: "Band/Group", ru: "Группа" },
    dj: { me: "DJ", en: "DJ", ru: "Диджей" },
    performer: { me: "Izvođač", en: "Performer", ru: "Исполнитель" },
  };

  if (normalized.includes("glumac") || normalized.includes("glumica")) {
    return {
      icon: Drama,
      label: typeLabels.actor[lang] || typeLabels.actor.me,
      color: "text-purple-500",
      bg: "bg-purple-100",
    };
  }
  if (
    normalized.includes("pjevač") ||
    normalized.includes("pjevačica") ||
    normalized.includes("pevač") ||
    normalized.includes("pevačica")
  ) {
    return {
      icon: Music,
      label: typeLabels.singer[lang] || typeLabels.singer.me,
      color: "text-pink-500",
      bg: "bg-pink-100",
    };
  }
  if (normalized.includes("stand up") || normalized.includes("komičar")) {
    return {
      icon: Laugh,
      label: typeLabels.comedian[lang] || typeLabels.comedian.me,
      color: "text-amber-500",
      bg: "bg-amber-100",
    };
  }
  if (normalized.includes("bend") || normalized.includes("grupa")) {
    return {
      icon: Music,
      label: typeLabels.band[lang] || typeLabels.band.me,
      color: "text-blue-500",
      bg: "bg-blue-100",
    };
  }
  if (normalized.includes("dj")) {
    return { icon: Music, label: typeLabels.dj[lang] || typeLabels.dj.me, color: "text-cyan-500", bg: "bg-cyan-100" };
  }
  // Default
  return {
    icon: Star,
    label: typeLabels.performer[lang] || typeLabels.performer.me,
    color: "text-primary",
    bg: "bg-primary/10",
  };
};

const PerformerDetail = () => {
  const { slug, lang } = useParams<{ slug: string; lang?: string }>();

  // Determine language from URL param, default to "me"
  const currentLang = lang === "en" || lang === "ru" ? lang : "me";

  // UI Labels for i18n
  const labels: Record<string, Record<string, string>> = {
    performerNotFound: { me: "Izvođač nije pronađen", en: "Performer not found", ru: "Исполнитель не найден" },
    performerNotFoundDesc: {
      me: "Traženi izvođač ne postoji ili je uklonjen.",
      en: "The requested performer does not exist or has been removed.",
      ru: "Запрашиваемый исполнитель не существует или был удалён.",
    },
    backToPerformers: { me: "Povratak na izvođače", en: "Back to performers", ru: "Назад к исполнителям" },
    allPerformers: { me: "Svi izvođači", en: "All performers", ru: "Все исполнители" },
    activeEvents: { me: "Aktivnih događaja", en: "Active events", ru: "Активных событий" },
    upcomingEvents: { me: "Nadolazeći događaji", en: "Upcoming events", ru: "Предстоящие события" },
    noActiveEvents: { me: "Nema aktivnih događaja", en: "No active events", ru: "Нет активных событий" },
    noActiveEventsDesc: {
      me: "Trenutno nema najavljenih događaja za ovog izvođača. Pratite nas za nove najave!",
      en: "There are currently no announced events for this performer. Follow us for new announcements!",
      ru: "В настоящее время нет объявленных мероприятий для этого исполнителя. Следите за новыми анонсами!",
    },
    viewDetails: { me: "Pogledaj detalje", en: "View details", ru: "Подробнее" },
    dontMissOut: {
      me: "Ne propustite nijedno događanje!",
      en: "Don't miss any event!",
      ru: "Не пропустите ни одного события!",
    },
    dontMissOutDesc: {
      me: "Pregledajte sve događaje na etickets i osigurajte svoje ulaznice na vrijeme.",
      en: "Browse all events on etickets and secure your tickets on time.",
      ru: "Просмотрите все мероприятия на etickets и забронируйте билеты вовремя.",
    },
    viewAllEvents: { me: "Pogledaj sve događaje", en: "View all events", ru: "Все события" },
    loading: { me: "Učitavanje...", en: "Loading...", ru: "Загрузка..." },
  };

  const t = (key: string) => labels[key]?.[currentLang] || labels[key]?.me || key;

  const { data: performer, isLoading: performerLoading } = usePerformerBySlug(slug);
  const { data: allEvents = [], isLoading: eventsLoading } = useAboutEvents();

  // Fetch performer translation when language is not ME
  const { data: performerTranslation } = useQuery({
    queryKey: ["performer-i18n-detail", performer?.id, currentLang],
    queryFn: async () => {
      if (!performer?.id || currentLang === "me") return null;
      const res = await fetch(
        `https://e-tickets-cache.rade-milosevic87.workers.dev/rest/v1/performer_i18n?performer_id=eq.${performer.id}&lang=eq.${currentLang}&select=*`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data?.[0] || null;
    },
    enabled: !!performer?.id && currentLang !== "me",
    staleTime: 1000 * 60 * 10,
  });

  // Merge performer with translation
  const translatedPerformer = useMemo(() => {
    if (!performer) return null;
    if (!performerTranslation) return performer;
    return {
      ...performer,
      biography: performerTranslation.biography || performer.biography,
    };
  }, [performer, performerTranslation]);

  // Filter events that mention this performer - sa normalizacijom dijakritika
  const performerEvents = useMemo(() => {
    if (!performer) return [];

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

    const performerNameNorm = normalize(performer.name);

    // Word-boundary match: provjeri da se ime pojavljuje kao cijela riječ
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchesAsWord = (text: string, name: string) => {
      if (!name || !text) return false;
      return new RegExp(`(?:^|\\s|[,;.!?\\-])${escapeRegex(name)}(?:$|\\s|[,;.!?\\-])`, "i").test(` ${text} `);
    };

    return allEvents.filter((event) => {
      const eventName = normalize(event.name);
      const eventDesc = normalize(typeof event.description === "string" ? event.description : "");
      const eventInfo = normalize(event.info || "");
      const eventPerformer = normalize((event as any).performer || "");

      return (
        eventPerformer === performerNameNorm ||
        matchesAsWord(eventName, performerNameNorm) ||
        matchesAsWord(eventDesc, performerNameNorm) ||
        matchesAsWord(eventInfo, performerNameNorm) ||
        matchesAsWord(eventPerformer, performerNameNorm)
      );
    });
  }, [performer, allEvents]);

  const isLoading = performerLoading || eventsLoading;

  // Build event link with language
  const getEventLink = (eventSlug: string) => {
    if (currentLang === "me") {
      return `/dogadjaj/${eventSlug}`;
    }
    return `/dogadjaj/${eventSlug}/${currentLang}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!translatedPerformer) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t("performerNotFound")}</h1>
            <p className="text-muted-foreground mb-6">{t("performerNotFoundDesc")}</p>
            <Button asChild>
              <Link to="/izvodjaci">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToPerformers")}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const seoTitle = translatedPerformer.seo_title || `${translatedPerformer.name} koncerti i ulaznice | etickets`;
  const seoDescription =
    translatedPerformer.seo_description ||
    `Kupite ulaznice za ${translatedPerformer.name} koncerte i nastupe. Pregledajte sve događaje na etickets`;

  // Schema.org MusicGroup markup
  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: translatedPerformer.name,
    description: translatedPerformer.biography,
    image: translatedPerformer.image,
    url: `${SITE_URL}/izvodjaci/${translatedPerformer.slug}`,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={seoTitle}
        description={seoDescription}
        image={translatedPerformer.image || undefined}
        type="profile"
        basePath={`/izvodjaci/${translatedPerformer.slug}`}
      />
      <BreadcrumbSchema
        items={[
          { name: "Početna", url: "/" },
          { name: "Izvođači", url: "/izvodjaci" },
          { name: translatedPerformer.name, url: `/izvodjaci/${translatedPerformer.slug}` },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background with gradient and blur */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-background" />
          {translatedPerformer.image && (
            <div
              className="absolute inset-0 opacity-10 blur-3xl scale-110"
              style={{
                backgroundImage: `url(${translatedPerformer.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          <div className="relative container py-8 md:py-16">
            {/* Back button */}
            <Link
              to="/izvodjaci"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              {t("allPerformers")}
            </Link>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start">
              {/* Image */}
              <div className="relative group">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  {translatedPerformer.image ? (
                    <img
                      src={translatedPerformer.image}
                      alt={translatedPerformer.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Music className="w-24 h-24 text-primary/40" />
                    </div>
                  )}
                </div>
                {/* Decorative elements */}
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl -z-10" />
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-xl -z-10" />
              </div>

              {/* Info */}
              <div className="flex-1 text-center lg:text-left">
                {(() => {
                  const typeInfo = getPerformerTypeInfo((translatedPerformer as any).type, currentLang);
                  const TypeIcon = typeInfo.icon;
                  return (
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${typeInfo.bg} ${typeInfo.color} text-sm font-medium mb-4`}
                    >
                      <TypeIcon className="w-4 h-4" />
                      {typeInfo.label}
                    </div>
                  );
                })()}

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
                  {translatedPerformer.name}
                </h1>

                {translatedPerformer.biography && (
                  <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line max-w-2xl">
                    {translatedPerformer.biography}
                  </p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mt-8 justify-center lg:justify-start">
                  <div className="text-center lg:text-left">
                    <div className="text-3xl font-bold text-primary">{performerEvents.length}</div>
                    <div className="text-sm text-muted-foreground">{t("activeEvents")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section className="container py-12 md:py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              {t("upcomingEvents")}
            </h2>
          </div>

          {performerEvents.length === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-2xl border border-border/50">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t("noActiveEvents")}</h3>
              <p className="text-muted-foreground max-w-md mx-auto">{t("noActiveEventsDesc")}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {performerEvents.map((event) => (
                <Link
                  key={event.id}
                  to={getEventLink(event.slug)}
                  className="group relative flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                    <img
                      src={getImageUrl(event.image)}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Date badge */}
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-white/95 dark:bg-black/80 backdrop-blur-sm shadow-lg">
                      <div className="text-xs font-medium text-primary">{formatEventDate(event.date)}</div>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform">
                        <ExternalLink className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-3">
                      {event.name}
                    </h3>

                    {event.venue && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 pb-5">
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <span className="text-sm font-medium text-primary">{t("viewDetails")}</span>
                      <ArrowLeft className="w-4 h-4 text-primary rotate-180 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="container pb-16">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:p-12">
            <div className="relative z-10 max-w-xl">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">{t("dontMissOut")}</h3>
              <p className="text-muted-foreground mb-6">{t("dontMissOutDesc")}</p>
              <Button asChild size="lg">
                <Link to="/events">
                  {t("viewAllEvents")}
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Link>
              </Button>
            </div>
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PerformerDetail;
