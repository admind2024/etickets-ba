import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Star, CalendarDays, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// Prevodi
const translations: Record<string, Record<string, string>> = {
  featured: { bs: "ISTAKNUTO", en: "FEATURED" },
  more: { bs: "Više", en: "More" },
  dates: { bs: "termina", en: "dates" },
  selectDate: { bs: "Izaberi termin", en: "Select date" },
  learnMore: { bs: "Saznaj više", en: "Learn more" },
  from: { bs: "Od", en: "From" },
  free: { bs: "Besplatno", en: "Free" },
  locations: { bs: "lokacije", en: "locations" },
  multipleLocations: { bs: "Više lokacija", en: "Multiple locations" },
  // Mjeseci
  JAN: { bs: "JAN", en: "JAN" },
  FEB: { bs: "FEB", en: "FEB" },
  MAR: { bs: "MAR", en: "MAR" },
  APR: { bs: "APR", en: "APR" },
  MAJ: { bs: "MAJ", en: "MAY" },
  JUN: { bs: "JUN", en: "JUN" },
  JUL: { bs: "JUL", en: "JUL" },
  AVG: { bs: "AVG", en: "AUG" },
  SEP: { bs: "SEP", en: "SEP" },
  OKT: { bs: "OKT", en: "OCT" },
  NOV: { bs: "NOV", en: "NOV" },
  DEC: { bs: "DEC", en: "DEC" },
};

interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug?: string;
    date: string;
    endDate?: string;
    time: string;
    venue?: string;
    city?: string;
    image: string;
    category: string;
    priceFrom: number;
    currency: string;
    info?: string;
    youtube?: string;
    is_match?: boolean;
    eventType?: string;
  };
  index?: number;
  lazy?: boolean;
  featured?: boolean;
  variantsCount?: number;
  variantsType?: "dates" | "times" | "locations" | "both";
}

export const EventCard = memo(
  ({ event, index = 0, lazy = true, featured = false, variantsCount, variantsType }: EventCardProps) => {
    const [imageLoaded, setImageLoaded] = useState(!lazy && !featured);
    const [imageError, setImageError] = useState(false);
    const { lang: currentLang } = useLanguage();

    const t = (key: string) => translations[key]?.[currentLang] || translations[key]?.bs || key;

    const hasMultipleVariants = variantsCount && variantsCount > 1;
    const needsSelection = hasMultipleVariants && variantsType !== "times";

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

    const langSuffix = currentLang !== "bs" ? "/" + currentLang : "";
    const eventUrl = event.is_match
      ? "/mec/" + (event.slug || event.id) + langSuffix
      : needsSelection
        ? "/event-select/" + generateNameSlug(event.title)
        : event.eventType === "festival"
          ? "/festival/" + (event.slug || event.id) + langSuffix
          : "/dogadjaj/" + (event.slug || event.id) + langSuffix;

    const parseDate = (dateStr: string) => {
      if (!dateStr) return { day: 1, month: "JAN" };

      const months: { [key: string]: string } = {
        januar: "JAN",
        februar: "FEB",
        mart: "MAR",
        april: "APR",
        maj: "MAJ",
        jun: "JUN",
        jul: "JUL",
        avgust: "AVG",
        septembar: "SEP",
        oktobar: "OKT",
        novembar: "NOV",
        decembar: "DEC",
        "01": "JAN",
        "02": "FEB",
        "03": "MAR",
        "04": "APR",
        "05": "MAJ",
        "06": "JUN",
        "07": "JUL",
        "08": "AVG",
        "09": "SEP",
        "10": "OKT",
        "11": "NOV",
        "12": "DEC",
      };

      if (dateStr.includes("-")) {
        const datePart = dateStr.split("T")[0];
        const parts = datePart.split("-");
        if (parts.length === 3) {
          const day = parseInt(parts[2], 10);
          const month = months[parts[1]] || "JAN";
          return { day, month };
        }
      }

      const parts = dateStr.toLowerCase().replace(".", "").split(" ");
      if (parts.length >= 2) {
        const day = parseInt(parts[0], 10);
        const monthName = parts[1];
        const monthShort = months[monthName] || monthName.substring(0, 3).toUpperCase();
        return { day: isNaN(day) ? 1 : day, month: monthShort };
      }

      return { day: 1, month: "JAN" };
    };

    const { day, month } = parseDate(event.date);
    const translatedMonth = t(month);

    const hasEndDate = event.endDate && event.endDate !== event.date;
    const endDateParsed = hasEndDate ? parseDate(event.endDate!) : null;

    const getVariantsBadge = () => {
      if (!hasMultipleVariants) return null;

      let text = "";
      let Icon = CalendarDays;

      if (variantsType === "times") {
        text = variantsCount + " " + t("dates");
        Icon = CalendarDays;
      } else if (variantsType === "locations") {
        text = variantsCount + " " + t("locations");
        Icon = MapPinned;
      } else if (variantsType === "dates") {
        text = variantsCount + " " + t("dates");
        Icon = CalendarDays;
      } else {
        text = variantsCount + " " + t("dates");
        Icon = CalendarDays;
      }

      return (
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium">
          <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span>{text}</span>
        </div>
      );
    };

    // ========== FEATURED VERZIJA ==========
    if (featured) {
      return (
        <Link to={eventUrl} className="block group lg:max-w-[420px]">
          <article className="gradient-card rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-glow hover:-translate-y-1">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              {!imageLoaded && !imageError && <div className="absolute inset-0 bg-muted animate-pulse" />}

              <img
                src={imageError ? "/placeholder.svg" : event.image}
                alt={event.title}
                className={cn("w-full h-full object-cover transition-transform duration-500", "group-hover:scale-105")}
                loading="eager"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse">
                <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />
                <span>{t("featured")}</span>
              </div>

              {/* Date badge - FIXED: text-white umjesto text-primary-foreground */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-primary px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-center shadow-lg">
                {needsSelection ? (
                  <>
                    <p className="text-[10px] sm:text-xs font-medium uppercase text-white/80">{t("more")}</p>
                    <p className="text-lg sm:text-xl font-bold leading-none text-white">{t("dates")}</p>
                  </>
                ) : hasEndDate && endDateParsed ? (
                  <>
                    <p className="text-[10px] sm:text-xs font-medium uppercase text-white/80">{translatedMonth}</p>
                    <p className="text-lg sm:text-xl font-bold leading-none text-white">
                      {day}-{endDateParsed.day}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] sm:text-xs font-medium uppercase text-white/80">{translatedMonth}</p>
                    <p className="text-xl sm:text-2xl font-bold leading-none text-white">{day}</p>
                  </>
                )}
              </div>

              {hasMultipleVariants && (
                <div className="absolute bottom-16 left-3 sm:bottom-20 sm:left-4 flex items-center gap-1.5 bg-primary/90 backdrop-blur-sm text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium">
                  {variantsType === "locations" ? (
                    <MapPinned className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  ) : (
                    <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  )}
                  <span>{needsSelection ? t("selectDate") : variantsCount + " " + t("dates")}</span>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <h3 className="font-bold text-lg sm:text-xl lg:text-2xl text-white line-clamp-2 mb-1 drop-shadow-md">
                  {event.title}
                </h3>
                {event.venue && !needsSelection && (
                  <p className="text-xs sm:text-sm lg:text-base text-white/80 truncate">{event.venue}</p>
                )}
                {needsSelection && variantsType === "locations" && (
                  <p className="text-xs sm:text-sm lg:text-base text-white/80 truncate">{t("multipleLocations")}</p>
                )}
              </div>
            </div>
          </article>
        </Link>
      );
    }

    // ========== REGULAR VERZIJA ==========
    return (
      <Link to={eventUrl} className="block group" style={{ animationDelay: index * 0.05 + "s" }}>
        <article className="gradient-card rounded-xl md:rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-glow hover:-translate-y-1 animate-fade-in">
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {!imageLoaded && !imageError && <div className="absolute inset-0 bg-muted animate-pulse" />}

            <img
              src={imageError ? "/placeholder.svg" : event.image}
              alt={event.title}
              width={600}
              height={450}
              loading={lazy ? "lazy" : "eager"}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                "group-hover:scale-105",
                imageLoaded ? "opacity-100" : "opacity-0",
              )}
            />

            {/* Date badge */}
            <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-primary rounded-lg px-2 py-1.5 md:px-3 md:py-2 text-center min-w-[44px] md:min-w-[60px] shadow-glow">
              {needsSelection ? (
                <>
                  <span className="block text-[9px] md:text-xs font-medium text-white/80">{t("more")}</span>
                  <span className="block text-sm md:text-lg font-bold leading-none text-white">{t("dates")}</span>
                </>
              ) : hasEndDate && endDateParsed ? (
                <>
                  <span className="block text-[9px] md:text-xs font-medium text-white/80">{translatedMonth}</span>
                  <span className="block text-base md:text-xl font-bold leading-none text-white">
                    {day}-{endDateParsed.day}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-[9px] md:text-xs font-medium text-white/80">{translatedMonth}</span>
                  <span className="block text-lg md:text-2xl font-bold leading-none text-white">{day}</span>
                </>
              )}
            </div>

            <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-background/80 backdrop-blur-sm text-foreground rounded-full px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-medium capitalize">
              {event.category}
            </div>

            {getVariantsBadge()}
          </div>

          <div className="p-3 md:p-5">
            <h3 className="font-bold text-sm md:text-lg text-foreground mb-1 md:mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {event.title}
            </h3>

            {event.info && <p className="text-muted-foreground text-xs md:text-sm mb-2 md:mb-4 line-clamp-2 hidden md:block">{event.info}</p>}

            <div className="flex items-center gap-2 md:gap-4 text-[11px] md:text-sm text-muted-foreground mb-2 md:mb-4">
              {needsSelection && variantsType === "locations" ? (
                <div className="flex items-center gap-1">
                  <MapPinned className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                  <span className="truncate">{t("multipleLocations")}</span>
                </div>
              ) : (
                event.venue && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                    <span className="truncate max-w-[80px] md:max-w-[120px]">{event.venue}</span>
                  </div>
                )
              )}

              {hasMultipleVariants && variantsType === "times" ? (
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                  <span>
                    {variantsCount} {t("dates")}
                  </span>
                </div>
              ) : needsSelection ? (
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                  <span>
                    {variantsCount} {t("dates")}
                  </span>
                </div>
              ) : (
                event.time && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
                    <span>{event.time}</span>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm md:text-lg font-bold text-foreground">
                <span className="text-[10px] md:text-xs font-normal text-muted-foreground mr-0.5 md:mr-1">{t("from")}</span>
                {event.priceFrom > 0 ? event.priceFrom + event.currency : t("free")}
              </p>
              <Button variant="default" size="sm" className="text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3">
                {needsSelection ? t("selectDate") : t("learnMore")}
              </Button>
            </div>
          </div>
        </article>
      </Link>
    );
  },
);

EventCard.displayName = "EventCard";

export default EventCard;
