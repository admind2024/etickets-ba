import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { parseCategories, getLowestPrice, getCurrencySymbol } from "@/hooks/useAboutEvents";

interface EventVariant {
  id: string;
  name: string;
  slug: string;
  date: string;
  event_time?: string;
  venue?: string;
  city?: string;
  categories?: string;
  currency?: string;
  eventType?: string;
}

interface EventVariantSelectorProps {
  variants: EventVariant[];
  eventName: string;
  eventImage?: string;
}

export const EventVariantSelector = ({ variants, eventName }: EventVariantSelectorProps) => {
  const navigate = useNavigate();

  const sortedVariants = useMemo(() => {
    // Sort using string comparison for YYYY-MM-DD format (avoids UTC shift)
    return [...variants].sort((a, b) => {
      const dateA = a.date.split("T")[0];
      const dateB = b.date.split("T")[0];
      return dateA.localeCompare(dateB);
    });
  }, [variants]);

  return (
    <div className="container py-6 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Nazad
      </button>

      {/* Naslov */}
      <h1 className="text-xl md:text-2xl font-bold mb-2">{eventName}</h1>
      <p className="text-muted-foreground text-sm mb-6">Izaberi termin:</p>

      {/* Lista termina */}
      <div className="space-y-3">
        {sortedVariants.map((variant) => {
          // Parse date locally to avoid UTC shift
          const datePart = variant.date.split("T")[0];
          const [y, m, d] = datePart.split("-").map(Number);
          const date = new Date(y, m - 1, d);
          const day = date.getDate();
          const monthShort = date.toLocaleDateString("sr-Latn-ME", { month: "short" }).replace(".", "");
          const year = date.getFullYear();
          const dayName = date.toLocaleDateString("sr-Latn-ME", { weekday: "long" });

          const price = getLowestPrice(parseCategories(variant.categories));
          const currencySymbol = getCurrencySymbol(variant.currency);

          // DIREKTAN LINK NA KUPOVINU (ne na event detail)
          const ticketsUrl =
            variant.eventType === "simple" ? `/simple-event/${variant.slug}` : `/events/${variant.slug}`;

          return (
            <Link
              key={variant.id}
              to={ticketsUrl}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
            >
              {/* Datum */}
              <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg px-4 py-2 min-w-[70px]">
                <span className="text-2xl font-bold text-primary">{day}</span>
                <span className="text-xs text-muted-foreground">
                  {monthShort} {year}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm capitalize">{dayName}</p>
                {variant.event_time && <p className="text-sm text-muted-foreground">{variant.event_time}</p>}
                {variant.venue && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{variant.venue}</span>
                  </div>
                )}
              </div>

              {/* Cijena */}
              <div className="text-right">
                {price > 0 ? (
                  <p className="font-bold text-primary">
                    {price}
                    {currencySymbol}
                  </p>
                ) : (
                  <p className="font-bold text-green-600">Besplatno</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default EventVariantSelector;
