import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getImageUrl,
  parseCategories,
  getLowestPrice,
  formatEventDate,
  getCurrencySymbol,
} from "@/hooks/useAboutEvents";

export const HeroSection = () => {
  const { data: featuredEvent, isLoading } = useQuery({
    queryKey: ["featured-event"],
    queryFn: async () => {
      // ✅ Samo potrebne kolone
      const { data, error } = await supabase
        .from("AboutEvents")
        .select(
          "id, name, slug, date, event_time, venue, image, heroImage, heroImageMobile, categories, currency, info",
        )
        .eq("prioritet", "1")
        .eq("country", "BA")
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching featured event:", error);
        return null;
      }
      return data;
    },
    // ✅ Cache 5 minuta
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <section className="relative overflow-hidden bg-primary">
        <div className="container py-20 md:py-32 lg:py-40 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </section>
    );
  }

  if (!featuredEvent) {
    return (
      <section className="relative overflow-hidden bg-primary">
        <div className="container py-20 md:py-32 lg:py-40">
          <div className="max-w-2xl">
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-card sm:text-5xl md:text-6xl">
              Dobrodošli na e-tickets
            </h1>
            <p className="mb-8 text-lg text-card/80">Pronađite i kupite ulaznice za najbolje događaje u regionu</p>
            <Button asChild variant="hero" size="xl">
              <a href="#events">
                Pregledaj događaje
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Parse images - desktop and mobile
  const heroImageDesktop = getImageUrl(featuredEvent.heroImage) || getImageUrl(featuredEvent.image);
  const heroImageMobile = getImageUrl(featuredEvent.heroImageMobile) || heroImageDesktop;

  const formattedDate = formatEventDate(featuredEvent.date);
  const eventTime = featuredEvent.event_time || "";
  const venue = featuredEvent.venue || "";
  const categories = parseCategories(featuredEvent.categories);
  const lowestPrice = getLowestPrice(categories);
  const currencySymbol = getCurrencySymbol(featuredEvent.currency);

  return (
    <section className="relative overflow-hidden">
      {/* Desktop Background Image */}
      <div className="absolute inset-0 hidden md:block">
        <img
          src={heroImageDesktop}
          alt={featuredEvent.name}
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
      </div>

      {/* Mobile Background Image */}
      <div className="absolute inset-0 md:hidden">
        <img
          src={heroImageMobile}
          alt={featuredEvent.name}
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/95 via-foreground/60 to-foreground/30" />
      </div>

      {/* Content */}
      <div className="container relative py-20 md:py-32 lg:py-40">
        <div className="max-w-2xl animate-fade-in">
          <span className="mb-4 inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
            Istaknuti događaj
          </span>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-card sm:text-5xl md:text-6xl">
            {featuredEvent.name}
          </h1>

          <div className="mb-8 flex flex-wrap gap-6 text-card/90">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span className="text-lg">
                {formattedDate}
                {eventTime && " - " + eventTime}
              </span>
            </div>
            {venue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span className="text-lg">{venue}</span>
              </div>
            )}
          </div>

          {featuredEvent.info && (
            <p className="mb-8 max-w-lg text-lg text-card/80 line-clamp-3">{featuredEvent.info}</p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <Button asChild variant="hero" size="xl">
              <Link to={"/event/" + featuredEvent.slug}>
                Kupi ulaznice
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <div className="text-card">
              <p className="text-sm opacity-80">Cijene od</p>
              <p className="text-3xl font-bold">{lowestPrice > 0 ? lowestPrice + currencySymbol : "Besplatno"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
