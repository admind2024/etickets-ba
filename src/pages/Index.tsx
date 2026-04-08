import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EventCard } from "@/components/EventCard";
import EventsSection from "@/components/EventsSection";
import AboutSection from "@/components/AboutSection";
import NewsletterSection from "@/components/NewsletterSection";
import SEO from "@/components/SEO";
import OrganizationSchema from "@/components/OrganizationSchema";
import {
  useAboutEvents,
  getImageUrl,
  parseCategories,
  getLowestPrice,
  formatEventDate,
  getCurrencySymbol,
} from "@/hooks/useAboutEvents";
import { Search, X } from "lucide-react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: aboutEvents } = useAboutEvents();
  const location = useLocation();

  // Determine current language from URL
  const pathname = location.pathname;
  const activeLang = pathname === "/en" ? "en" : "bs";

  // SEO translations
  const seoTranslations = {
    bs: {
      title: "etickets | Kupite ulaznice online za koncerte i događaje",
      description:
        "etickets - Vaš pouzdani partner za online kupovinu ulaznica. Koncerte, predstave, festivale i sportske događaje. Brza i sigurna kupovina.",
    },
    en: {
      title: "etickets | Buy tickets online for concerts and events",
      description:
        "etickets - Your trusted partner for online ticket purchases. Concerts, shows, festivals and sports events. Fast and secure purchase.",
    },
  };

  const seo = seoTranslations[activeLang as keyof typeof seoTranslations] || seoTranslations.bs;

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !aboutEvents) return [];

    const visible = aboutEvents.filter((e) => e.hide !== "true" && e.hide !== true && e.country === "BA");
    const query = searchQuery.toLowerCase().trim();

    return visible.filter(
      (event) =>
        event.name?.toLowerCase().includes(query) ||
        event.venue?.toLowerCase().includes(query) ||
        event.category?.toLowerCase().includes(query),
    );
  }, [aboutEvents, searchQuery]);

  const clearSearch = () => setSearchQuery("");
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={seo.title} description={seo.description} type="website" basePath="/" />
      <OrganizationSchema />
      <Header />
      <main>
        {/* Search Bar */}
        <section className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="container py-4">
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pretraži događaje..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-border bg-card py-3 pl-12 pr-12 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Search Results */}
        {isSearching ? (
          <section className="py-10">
            <div className="container">
              <p className="text-sm text-muted-foreground mb-6">
                Rezultati za "<span className="text-foreground font-medium">{searchQuery}</span>"
              </p>

              {searchResults.length > 0 ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {searchResults.map((event, index) => {
                    const cats = parseCategories(event.categories);
                    const lowestPrice = getLowestPrice(cats);
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
                          city: "",
                          image: getImageUrl(event.image),
                          category: event.category || "Događaj",
                          priceFrom: lowestPrice,
                          currency: getCurrencySymbol(event.currency),
                        }}
                        index={index}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">Nema rezultata</p>
                  <button onClick={clearSearch} className="mt-4 text-primary hover:underline">
                    Očisti pretragu
                  </button>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* H1 je unutar EventsSection - odmah ispod featured kartica */}
            <EventsSection />
            <AboutSection />
            <NewsletterSection />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
