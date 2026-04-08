import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Ticket,
  Calendar,
  ExternalLink,
  Users,
  Navigation,
  Building2,
  Car,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import { SITE_URL } from "@/lib/seoConfig";
import { useVenues, type Venue } from "@/hooks/useVenues";
import { useAboutEvents, formatEventDate, getImageUrl } from "@/hooks/useAboutEvents";

const VenueDetail = () => {
  const { slug, lang } = useParams<{ slug: string; lang?: string }>();

  // Determine language from URL param, default to "me"
  const currentLang = lang === "en" || lang === "ru" ? lang : "me";

  // UI Labels for i18n
  const labels: Record<string, Record<string, string>> = {
    venueNotFound: { me: "Lokacija nije pronađena", en: "Venue not found", ru: "Место не найдено" },
    venueNotFoundDesc: {
      me: "Tražena lokacija ne postoji ili je uklonjena.",
      en: "The requested venue does not exist or has been removed.",
      ru: "Запрашиваемое место не существует или было удалено.",
    },
    backToVenues: { me: "Povratak na lokacije", en: "Back to venues", ru: "Назад к местам" },
    allVenues: { me: "Sve lokacije", en: "All venues", ru: "Все места" },
    capacity: { me: "Kapacitet", en: "Capacity", ru: "Вместимость" },
    seats: { me: "mjesta", en: "seats", ru: "мест" },
    upcomingEvents: { me: "Nadolazeći događaji", en: "Upcoming events", ru: "Предстоящие события" },
    noActiveEvents: { me: "Nema aktivnih događaja", en: "No active events", ru: "Нет активных событий" },
    noActiveEventsDesc: {
      me: "Trenutno nema najavljenih događaja na ovoj lokaciji. Pratite nas za nove najave!",
      en: "There are currently no announced events at this venue. Follow us for new announcements!",
      ru: "В настоящее время нет объявленных мероприятий на этом месте. Следите за новыми анонсами!",
    },
    viewDetails: { me: "Pogledaj detalje", en: "View details", ru: "Подробнее" },
    getDirections: { me: "Navigacija", en: "Get directions", ru: "Маршрут" },
    aboutVenue: { me: "O lokaciji", en: "About venue", ru: "О месте" },
    address: { me: "Adresa", en: "Address", ru: "Адрес" },
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

  const { data: venues = [], isLoading: venuesLoading } = useVenues();
  const { data: allEvents = [], isLoading: eventsLoading } = useAboutEvents();

  // Find venue by slug
  const venue = useMemo(() => {
    if (!venues.length || !slug) return null;
    return venues.find((v) => v.slug === slug) || null;
  }, [venues, slug]);

  // Fetch venue translation when language is not ME
  const { data: venueTranslation } = useQuery({
    queryKey: ["venue-i18n-detail", venue?.id, currentLang],
    queryFn: async () => {
      if (!venue?.id || currentLang === "me") return null;
      const res = await fetch(
        `https://e-tickets-cache.rade-milosevic87.workers.dev/rest/v1/venue_i18n?venue_id=eq.${venue.id}&lang=eq.${currentLang}&select=*`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data?.[0] || null;
    },
    enabled: !!venue?.id && currentLang !== "me",
    staleTime: 1000 * 60 * 10,
  });

  // Merge venue with translation
  const translatedVenue = useMemo(() => {
    if (!venue) return null;
    if (!venueTranslation) return venue;
    return {
      ...venue,
      description: venueTranslation.description || venue.description,
    };
  }, [venue, venueTranslation]);

  // Filter events at this venue
  const venueEvents = useMemo(() => {
    if (!translatedVenue) return [];

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

    const venueNameNorm = normalize(translatedVenue.name);

    return allEvents.filter((event) => {
      const eventVenue = normalize(event.venue || "");
      return eventVenue.includes(venueNameNorm) || venueNameNorm.includes(eventVenue);
    });
  }, [translatedVenue, allEvents]);

  const isLoading = venuesLoading || eventsLoading;

  // Build event link with language
  const getEventLink = (eventSlug: string) => {
    if (currentLang === "me") {
      return `/dogadjaj/${eventSlug}`;
    }
    return `/dogadjaj/${eventSlug}/${currentLang}`;
  };

  // Google Maps URL
  const mapsUrl =
    translatedVenue?.google_maps_url ||
    (translatedVenue?.latitude && translatedVenue?.longitude
      ? `https://www.google.com/maps?q=${translatedVenue.latitude},${translatedVenue.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(translatedVenue?.name + " " + translatedVenue?.city || "")}`);

  const mapsEmbedUrl =
    translatedVenue?.latitude && translatedVenue?.longitude
      ? `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${translatedVenue.longitude}!3d${translatedVenue.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM!5e0!3m2!1sen!2s!4v1600000000000!5m2!1sen!2s`
      : `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(translatedVenue?.name + " " + translatedVenue?.city || "")}`;

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

  if (!translatedVenue) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t("venueNotFound")}</h1>
            <p className="text-muted-foreground mb-6">{t("venueNotFoundDesc")}</p>
            <Button asChild>
              <Link to="/lokacije">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToVenues")}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const seoTitle = `${translatedVenue.name} | ${translatedVenue.city} | etickets`;
  const seoDescription =
    translatedVenue.description ||
    `Kupite ulaznice za događaje u ${translatedVenue.name}, ${translatedVenue.city}. Pregledajte sve događaje na etickets`;

  // Schema.org Place markup
  const schema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: translatedVenue.name,
    description: translatedVenue.description,
    image: translatedVenue.image,
    address: {
      "@type": "PostalAddress",
      streetAddress: translatedVenue.address,
      addressLocality: translatedVenue.city,
      addressCountry: "ME",
    },
    geo:
      translatedVenue.latitude && translatedVenue.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: translatedVenue.latitude,
            longitude: translatedVenue.longitude,
          }
        : undefined,
    url: `${SITE_URL}/lokacije/${translatedVenue.slug}`,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={seoTitle}
        description={seoDescription}
        image={translatedVenue.image || undefined}
        type="place"
        basePath={`/lokacije/${translatedVenue.slug}`}
      />
      <BreadcrumbSchema
        items={[
          { name: "Početna", url: "/" },
          { name: "Lokacije", url: "/lokacije" },
          { name: translatedVenue.name, url: `/lokacije/${translatedVenue.slug}` },
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
          {translatedVenue.image && (
            <div
              className="absolute inset-0 opacity-10 blur-3xl scale-110"
              style={{
                backgroundImage: `url(${translatedVenue.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          <div className="relative container py-8 md:py-16">
            {/* Back button */}
            <Link
              to="/lokacije"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              {t("allVenues")}
            </Link>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start">
              {/* Image or Map */}
              <div className="relative group w-full lg:w-96">
                <div className="w-full aspect-video lg:aspect-square rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  {translatedVenue.image ? (
                    <img
                      src={translatedVenue.image}
                      alt={translatedVenue.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <iframe
                      src={mapsEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={translatedVenue.name}
                    />
                  )}
                </div>
                {/* Decorative elements */}
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl -z-10" />
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-full blur-xl -z-10" />
              </div>

              {/* Info */}
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Building2 className="w-4 h-4" />
                  {translatedVenue.city}
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
                  {translatedVenue.name}
                </h1>

                {/* Address */}
                {translatedVenue.address && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-4 justify-center lg:justify-start">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{translatedVenue.address}</span>
                  </div>
                )}

                {/* Capacity */}
                {translatedVenue.capacity && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-6 justify-center lg:justify-start">
                    <Users className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>
                      {translatedVenue.capacity.toLocaleString()} {t("seats")}
                    </span>
                  </div>
                )}

                {translatedVenue.description && (
                  <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line max-w-2xl mb-8">
                    {translatedVenue.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary">
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation className="w-4 h-4 mr-2" />
                      {t("getDirections")}
                    </a>
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mt-8 justify-center lg:justify-start">
                  <div className="text-center lg:text-left">
                    <div className="text-3xl font-bold text-primary">{venueEvents.length}</div>
                    <div className="text-sm text-muted-foreground">{t("upcomingEvents")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section if image exists */}
        {translatedVenue.image && (
          <section className="container py-8">
            <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
              <iframe
                src={mapsEmbedUrl}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={translatedVenue.name}
              />
            </div>
          </section>
        )}

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

          {venueEvents.length === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-2xl border border-border/50">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t("noActiveEvents")}</h3>
              <p className="text-muted-foreground max-w-md mx-auto">{t("noActiveEventsDesc")}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {venueEvents.map((event) => (
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

export default VenueDetail;
