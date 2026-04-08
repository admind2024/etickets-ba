import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  MapPin,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Globe,
  Users,
  Ticket,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import SEO from "@/components/SEO";
import BreadcrumbSchema from "@/components/BreadcrumbSchema";
import { SITE_URL } from "@/lib/seoConfig";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getImageUrl,
  parseCategories,
  getLowestPrice,
  formatEventDate,
  getCurrencySymbol,
} from "@/hooks/useAboutEvents";

const OrganizerDetail = () => {
  const { slug, lang: urlLang } = useParams<{ slug: string; lang?: string }>();
  const { lang: contextLang } = useLanguage();
  
  // Prioritet: URL param > context
  const currentLang = urlLang === "en" || urlLang === "ru" ? urlLang : contextLang;
  const organizerName = slug ? decodeURIComponent(slug) : "";

  const labels: Record<string, Record<string, string>> = {
    organizer: { me: "Organizator", en: "Organizer", ru: "Организатор" },
    events: { me: "Događaji", en: "Events", ru: "События" },
    upcomingEvents: { me: "Predstojeći događaji", en: "Upcoming events", ru: "Предстоящие события" },
    pastEvents: { me: "Prošli događaji", en: "Past events", ru: "Прошедшие события" },
    noEvents: { me: "Nema događaja", en: "No events", ru: "Нет событий" },
    back: { me: "Nazad na početnu", en: "Back to home", ru: "На главную" },
    home: { me: "Početna", en: "Home", ru: "Главная" },
    organizers: { me: "Organizatori", en: "Organizers", ru: "Организаторы" },
    website: { me: "Posjeti web stranicu", en: "Visit website", ru: "Посетить сайт" },
    contact: { me: "Kontakt", en: "Contact", ru: "Контакт" },
    notFound: { me: "Organizator nije pronađen", en: "Organizer not found", ru: "Организатор не найден" },
    backToHome: { me: "Povratak na početnu", en: "Back to home", ru: "На главную" },
    locations: { me: "Lokacije", en: "Locations", ru: "Локации" },
    morePastEvents: { me: "još prošlih događaja", en: "more past events", ru: "еще прошедших событий" },
    aboutOrganizer: { me: "O organizatoru", en: "About organizer", ru: "Об организаторе" },
    totalEvents: { me: "Ukupno događaja", en: "Total events", ru: "Всего событий" },
    activeEvents: { me: "Aktivni događaji", en: "Active events", ru: "Активные события" },
    completedEvents: { me: "Završeni događaji", en: "Completed events", ru: "Завершенные события" },
    uniqueVenues: { me: "Jedinstvene lokacije", en: "Unique venues", ru: "Уникальные площадки" },
    contactInfo: { me: "Kontakt informacije", en: "Contact information", ru: "Контактная информация" },
    noEventsDesc: { me: "Ovaj organizator trenutno nema aktivnih događaja.", en: "This organizer currently has no active events.", ru: "У этого организатора пока нет активных мероприятий." },
    email: { me: "Email", en: "Email", ru: "Электронная почта" },
    phone: { me: "Telefon", en: "Phone", ru: "Телефон" },
    address: { me: "Adresa", en: "Address", ru: "Адрес" },
  };

  const t = (key: string) => labels[key]?.[currentLang] || labels[key]?.me || key;

  // Dohvati događaje organizatora
  const {
    data: allEvents,
    isLoading: isLoadingEvents,
  } = useQuery({
    queryKey: ["organizer-events-direct", organizerName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("AboutEvents")
        .select("*")
        .eq("organizer", organizerName)
        .order("date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizerName && organizerName.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Dohvati prevod opisa organizatora
  const {
    data: translatedDescription,
    isLoading: isLoadingTranslation,
  } = useQuery({
    queryKey: ["organizer-i18n", organizerName, currentLang],
    queryFn: async () => {
      // Ako je jezik ME, ne treba prevod
      if (currentLang === "me") return null;

      const { data, error } = await supabase
        .from("organizer_i18n")
        .select("description")
        .eq("organizer_name", organizerName)
        .eq("lang", currentLang)
        .single();

      if (error) {
        console.log("No translation found for", organizerName, currentLang);
        return null;
      }

      return data?.description || null;
    },
    enabled: !!organizerName && currentLang !== "me",
    staleTime: 1000 * 60 * 10,
  });

  const organizerData = useMemo(() => {
    if (!allEvents?.length) return null;

    const eventWithData = allEvents.find((e: any) =>
      e.organizer_url || e.organizer_description || e.organizer_logo
    ) || allEvents[0];

    return {
      url: eventWithData?.organizer_url || null,
      description: eventWithData?.organizer_description || null,
      logo: eventWithData?.organizer_logo || null,
      email: eventWithData?.organizer_email || null,
      phone: eventWithData?.organizer_phone || null,
      address: eventWithData?.organizer_address || null,
      city: eventWithData?.organizer_city || null,
    };
  }, [allEvents]);

  // Koristi prevedeni opis ako postoji, inače originalni
  const displayDescription = translatedDescription || organizerData?.description || null;

  const { upcomingEvents, pastEvents } = useMemo(() => {
    if (!allEvents) return { upcomingEvents: [], pastEvents: [] };

    const today = new Date().toISOString().split("T")[0];

    const upcoming = allEvents
      .filter((e: any) => e.date >= today && e.hide !== "true" && e.hide !== true && e.country === "BA")
      .sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));

    const past = allEvents
      .filter((e: any) => e.date < today && e.hide !== "true" && e.hide !== true && e.country === "BA")
      .sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [allEvents]);

  const uniqueVenuesCount = useMemo(() => {
    if (!allEvents) return 0;
    return new Set(allEvents.map((e: any) => e.venue).filter(Boolean)).size;
  }, [allEvents]);

  const isLoading = isLoadingEvents || isLoadingTranslation;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-base text-muted-foreground">Učitavanje...</span>
        </div>
      </div>
    );
  }

  if (!organizerName || (!allEvents?.length && !isLoadingEvents)) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center min-h-[80vh] bg-gradient-to-b from-background to-muted/30">
          <div className="text-center px-4">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-12 h-12 text-muted-foreground" />
            </div>
            <h1 className="mb-3 text-3xl font-bold">{t("notFound")}</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {organizerName}
            </p>
            <Button asChild size="lg">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToHome")}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalEvents = allEvents?.length || 0;

  const metaDescription = displayDescription
    ? displayDescription.substring(0, 155)
    : t("events") + " " + organizerName + ". " + totalEvents + " " + t("events").toLowerCase();

  const metaTitle = organizerName + " - " + t("organizer") + " | etickets";
  const canonicalUrl = SITE_URL + "/organizatori/" + encodeURIComponent(organizerName);

  const organizationSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organizerName,
    url: organizerData?.url || canonicalUrl,
  };

  if (organizerData?.logo) organizationSchema.logo = organizerData.logo;
  if (displayDescription) organizationSchema.description = displayDescription;
  if (organizerData?.email) organizationSchema.email = organizerData.email;
  if (organizerData?.phone) organizationSchema.telephone = organizerData.phone;
  if (organizerData?.address || organizerData?.city) {
    organizationSchema.address = {
      "@type": "PostalAddress",
      streetAddress: organizerData.address || "",
      addressLocality: organizerData.city || "",
      addressCountry: "ME",
    };
  }

  const fullAddress = organizerData?.address && organizerData?.city
    ? organizerData.address + ", " + organizerData.city
    : organizerData?.address || organizerData?.city || "";

  const remainingPastEvents = pastEvents.length - 6;
  const hasContactInfo = organizerData?.email || organizerData?.phone || fullAddress;
  const hasExternalUrl = organizerData?.url && !organizerData.url.includes("etickets.ba");

  // Generiši URL za druge jezike
  const getLangUrl = (targetLang: string) => {
    if (targetLang === "me") {
      return "/organizatori/" + encodeURIComponent(organizerName);
    }
    return "/organizatori/" + encodeURIComponent(organizerName) + "/" + targetLang;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title={metaTitle}
        description={metaDescription}
        image={organizerData?.logo || undefined}
        type="website"
        basePath={`/organizatori/${encodeURIComponent(organizerName)}`}
      />
      <BreadcrumbSchema
        items={[
          { name: t("home"), url: "/" },
          { name: t("organizers"), url: "/organizatori" },
          { name: organizerName, url: getLangUrl(currentLang) },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

          <div className="relative container py-16 md:py-24">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground mb-8 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("back")}
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-12">
              {/* Logo/Avatar */}
              <div className="flex-shrink-0">
                {organizerData?.logo ? (
                  <div className="relative">
                    <div className="absolute -inset-2 bg-white/20 rounded-3xl blur-xl"></div>
                    <img
                      src={organizerData.logo}
                      alt={organizerName}
                      className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-white/30 shadow-2xl"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute -inset-2 bg-white/20 rounded-3xl blur-xl"></div>
                    <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border-4 border-white/30">
                      <Building2 className="w-16 h-16 md:w-20 md:h-20 text-primary-foreground/80" />
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-primary-foreground/80 text-sm font-medium mb-4">
                  <Building2 className="w-4 h-4" />
                  {t("organizer")}
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
                  {organizerName}
                </h1>

                {displayDescription && (
                  <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 max-w-3xl leading-relaxed line-clamp-3">
                    {displayDescription.substring(0, 200)}
                    {displayDescription.length > 200 ? "..." : ""}
                  </p>
                )}

                {/* Quick Stats & Actions */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-primary-foreground">
                    <Ticket className="w-5 h-5" />
                    <span className="font-semibold">{totalEvents}</span>
                    <span className="text-primary-foreground/70">{t("events").toLowerCase()}</span>
                  </div>

                  {organizerData?.city && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-primary-foreground">
                      <MapPin className="w-5 h-5" />
                      <span>{organizerData.city}</span>
                    </div>
                  )}

                  {hasExternalUrl && (
                    <a
                      href={organizerData.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-xl font-medium hover:bg-white/90 transition-colors"
                    >
                      <Globe className="w-5 h-5" />
                      {t("website")}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="container -mt-8 relative z-10 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Ticket className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{totalEvents}</p>
                  <p className="text-sm text-muted-foreground">{t("totalEvents")}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">{upcomingEvents.length}</p>
                  <p className="text-sm text-muted-foreground">{t("activeEvents")}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-muted-foreground">{pastEvents.length}</p>
                  <p className="text-sm text-muted-foreground">{t("completedEvents")}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-purple-600">{uniqueVenuesCount}</p>
                  <p className="text-sm text-muted-foreground">{t("uniqueVenues")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Info Card */}
        {hasContactInfo && (
          <section className="container mb-12">
            <div className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                {t("contactInfo")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {organizerData?.email && (
                  <a
                    href={"mailto:" + organizerData.email}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{t("email")}</p>
                      <p className="font-medium text-foreground truncate">{organizerData.email}</p>
                    </div>
                  </a>
                )}
                {organizerData?.phone && (
                  <a
                    href={"tel:" + organizerData.phone}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                      <Phone className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{t("phone")}</p>
                      <p className="font-medium text-foreground">{organizerData.phone}</p>
                    </div>
                  </a>
                )}
                {fullAddress && (
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{t("address")}</p>
                      <p className="font-medium text-foreground">{fullAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* About Section */}
        {displayDescription && (
          <section className="container mb-12">
            <div className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                {t("aboutOrganizer")}
              </h2>
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {displayDescription}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <section className="container py-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                {t("upcomingEvents")}
                <span className="px-4 py-1.5 bg-green-500/10 text-green-600 text-sm font-semibold rounded-full">
                  {upcomingEvents.length}
                </span>
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event: any, index: number) => (
                <EventCard
                  key={event.id}
                  event={{
                    id: event.id,
                    title: event.name,
                    slug: event.slug,
                    date: formatEventDate(event.date),
                    time: event.event_time || "",
                    venue: event.venue,
                    city: "",
                    image: getImageUrl(event.image),
                    category: event.category || "Događaj",
                    priceFrom: getLowestPrice(parseCategories(event.categories)),
                    currency: getCurrencySymbol(event.currency),
                  }}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <section className="container py-12 border-t border-border">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-4 text-muted-foreground">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                {t("pastEvents")}
                <span className="px-4 py-1.5 bg-muted text-muted-foreground text-sm font-semibold rounded-full">
                  {pastEvents.length}
                </span>
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 opacity-70">
              {pastEvents.slice(0, 6).map((event: any, index: number) => (
                <EventCard
                  key={event.id}
                  event={{
                    id: event.id,
                    title: event.name,
                    slug: event.slug,
                    date: formatEventDate(event.date),
                    time: event.event_time || "",
                    venue: event.venue,
                    city: "",
                    image: getImageUrl(event.image),
                    category: event.category || "Događaj",
                    priceFrom: getLowestPrice(parseCategories(event.categories)),
                    currency: getCurrencySymbol(event.currency),
                  }}
                  index={index}
                />
              ))}
            </div>
            {remainingPastEvents > 0 && (
              <div className="text-center mt-8">
                <p className="text-muted-foreground">
                  + {remainingPastEvents} {t("morePastEvents")}
                </p>
              </div>
            )}
          </section>
        )}

        {/* No Events */}
        {totalEvents === 0 && (
          <section className="container py-24">
            <div className="text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-3">{t("noEvents")}</h2>
              <p className="text-muted-foreground mb-8">
                {t("noEventsDesc")}
              </p>
              <Button asChild size="lg">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("backToHome")}
                </Link>
              </Button>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default OrganizerDetail;