import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Shield,
  Users,
  Ticket,
  Ban,
  ParkingCircle,
  Navigation,
  Building2,
  ExternalLink,
  Swords,
  UserX,
  Bomb,
  Flag,
  Megaphone,
  Hammer,
  AlertTriangle,
  Footprints,
  DoorOpen,
  Wine,
  Flame,
  ShieldOff,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import SEO from "@/components/SEO";
import { useTeams, getSportLabel } from "@/hooks/useTeams";
import { useVenues } from "@/hooks/useVenues";
import { usePlayersByTeam, getPositionLabel } from "@/hooks/usePlayers";
import type { Team } from "@/hooks/useTeams";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TicketCategory {
  category: string;
  price: number;
  type?: string;
  description?: string;
}

interface MatchEventData {
  id: string;
  name: string;
  slug: string;
  date: string;
  event_time: string;
  venue: string;
  currency: string;
  description: any;
  serviceFeePercentage: string;
  info?: string;
  image?: string;
  organizer?: string;
  categories?: string;
  eventId?: string;
  eventType?: string;
  is_match?: boolean;
  sport?: string;
  home_team_id?: string;
  away_team_id?: string;
  competition?: string;
  match_round?: string;
}

type Lang = "bs" | "en";

// ═══════════════════════════════════════════════════════════════
// SPECTATOR RULES - Exact text from FSCG PDF (Article 4)
// ═══════════════════════════════════════════════════════════════

const SPECTATOR_RULES = {
  bs: {
    title: "Pravila ponašanja gledalaca",
    lawBasis: "Na osnovu člana 4 Zakona o sprečavanju nasilja i nedoličnog ponašanja na sportskim priredbama (Sl.list Bosne i Hercegovine br.27/07)",
    subtitle: "ZABRANJUJE SE:",
    rules: [
      "Fizički napad na učesnike sportske priredbe;",
      "Fizički obračun između učesnika sportske priredbe;",
      "Bacanje na sportski teren ili u gledalište predmeta koji mogu da ugroze život, integritet lica ili imovinu;",
      "Unošenje i isticanje transparenata, zastava ili drugih obilježja koji pozivaju i podstiču fizički sukob, nacionalnu i vjersku mržnju i netrpeljivost;",
      "Uzvikivanje parola i pjevanje pjesama koje pozivaju na fizički sukob vjersku mržnju i netrpeljivost;",
      "Oštećenje ili uništavanje dijela sportskog objekta, opreme, uređaja, instalacijama na sportskim objektima gdje se održava sportska priredba;",
      "Izazivanje nereda prilikom dolaska odnosno odlaska sa sportskog objekta ili u sportskom objektu, remećenje toka sportske priredbe ili ugrožavanje učesnika sportske priredbe ili trećih lica;",
      "Neovlašćen ulazak u sportski teren;",
      "Neovlašćen ulazak u službene prostorije i službene prolaze sportskog objekta u kome se održava sportska priredba;",
      "Unošenje u sportski objekat i upotreba alkohola i drugih opojnih sredstava;",
      "Unošenje u sportski objekat i upotreba pirotehničkih sredstava i drugih predmeta koji mogu da ugroze bezbjednost učesnika u sportskoj priredbi ili ometu njen tok;",
      "Neovlašćen ulazak u dio gledališta koji je namijenjen suparničkim navijačima.",
    ],
  },
  en: {
    title: "The Rules of Conduct for Spectators",
    lawBasis: "On the basis of Article 4 of the Law on Prevention of Violence and Indecent Behavior at Sporting Events (Official Journal of Bosnia and Herzegovina No 27/07)",
    subtitle: "THE FOLLOWING ARE FORBIDDEN:",
    rules: [
      "To physically attack participants of a sporting event;",
      "Physical confrontation among participants of a sporting event;",
      "Throwing on the field or into the stands objects which can threaten life, integrity of individuals or property;",
      "Bringing in and displaying banners, flags, or other objects with text, pictures, signs, or other markings which call for or instigate physical confrontation, national, racial, religious, and other hatred or intolerance;",
      "Chanting of slogans and singing of songs of defamatory content which call on or instigate physical confrontation, national, racial, religious, and other hatred or intolerance;",
      "Harming or destroying a part of the sports facility where an event is taking place;",
      "Provoking or causing disorder while entering or leaving a sports facility, at the sport facility, disturb the flow of the sports event, or threatening the safety of the participants of the sports event or other persons;",
      "Entering the field without authorization;",
      "Unauthorized entrance of the offices or halls of the sports facility where a sporting event is taking place;",
      "Bringing to the sports facility and use of alcoholic and other intoxicating substances;",
      "Bringing to a sports event and use of pyrotechnical objects that can be used to threaten the security of participants of a sports event or the flow of the event;",
      "Unauthorized entrance of the section of the stadium intended for the opposing fans.",
    ],
  },
};

// Prohibition icons matching each rule (same order as rules array)
const RULE_ICONS = [
  Swords,        // 1. Fizički napad
  UserX,         // 2. Fizički obračun
  Bomb,          // 3. Bacanje predmeta
  Flag,          // 4. Transparenti/zastave
  Megaphone,     // 5. Parole/pjesme
  Hammer,        // 6. Oštećenje objekta
  AlertTriangle, // 7. Izazivanje nereda
  Footprints,    // 8. Neovlašćen ulazak na teren
  DoorOpen,      // 9. Neovlašćen ulazak u prostorije
  Wine,          // 10. Alkohol
  Flame,         // 11. Pirotehnika
  ShieldOff,     // 12. Ulazak u suprotni sektor
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const MatchPage = () => {
  const { slug, lang: langParam } = useParams<{ slug: string; lang?: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<MatchEventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const currentLang: Lang = langParam === "en" ? langParam : "bs";
  const rules = SPECTATOR_RULES[currentLang];

  const { data: teams = [] } = useTeams();
  const { data: venues = [] } = useVenues();

  const homeTeam = useMemo<Team | undefined>(() => {
    if (!event?.home_team_id || !teams.length) return undefined;
    return teams.find((t) => t.id === event.home_team_id);
  }, [teams, event]);

  const awayTeam = useMemo<Team | undefined>(() => {
    if (!event?.away_team_id || !teams.length) return undefined;
    return teams.find((t) => t.id === event.away_team_id);
  }, [teams, event]);

  const { data: homePlayers = [] } = usePlayersByTeam(event?.home_team_id);
  const { data: awayPlayers = [] } = usePlayersByTeam(event?.away_team_id);

  const matchedVenue = useMemo(() => {
    if (!event?.venue || !venues.length) return null;
    const ev = event.venue.toLowerCase().trim();
    let found = venues.find((v) => v.name.toLowerCase() === ev);
    if (!found) found = venues.find((v) => ev.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(ev));
    return found;
  }, [event, venues]);

  const parkingInfo = useMemo(() => {
    return (matchedVenue as any)?.parking_info || null;
  }, [matchedVenue]);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    supabase
      .from("AboutEvents")
      .select("*")
      .eq("slug", slug)
      .or("is_match.eq.true,category.eq.Sport")
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (data) setEvent(data);
        else setError("not_found");
        setIsLoading(false);
      });
  }, [slug]);

  // ─── Helpers ───
  const parseCategories = (eventData: any): TicketCategory[] => {
    if (eventData.description) {
      try {
        const parsed = typeof eventData.description === "string" ? JSON.parse(eventData.description) : eventData.description;
        if (Array.isArray(parsed)) return parsed.map((c: any) => ({ category: c.category || c.name || "", price: parseFloat(c.price) || 0, type: c.type, description: c.description }));
      } catch {}
    }
    if (eventData.categories) {
      return eventData.categories.split(",").map((c: string) => { const [n, p] = c.trim().split(":"); return { category: n?.trim() || "", price: parseFloat(p) || 0 }; }).filter((c: TicketCategory) => c.category);
    }
    return [];
  };

  const getCurrencySymbol = (c: string) => c === "RSD" ? "RSD" : c === "BAM" ? "KM" : "€";

  const parseDateStr = (dateStr: string): Date | null => {
    try {
      if (dateStr.includes(".")) { const p = dateStr.split("."); if (p.length >= 3) { const [d, m, y] = p.map(Number); if (d && m && y) return new Date(y, m - 1, d); } }
      const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    } catch {}
    return null;
  };

  const formatDate = (ds: string) => { const d = parseDateStr(ds); return d ? d.toLocaleDateString("sr-Latn-ME", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ds; };
  const formatShortDate = (ds: string) => { const d = parseDateStr(ds); return d ? d.toLocaleDateString("sr-Latn-ME", { day: "numeric", month: "long", year: "numeric" }) : ds; };

  const dateObj = event ? parseDateStr(event.date) : null;
  const dayNum = dateObj ? dateObj.getDate() : "";
  const monthShort = dateObj ? dateObj.toLocaleDateString("sr-Latn-ME", { month: "short" }).toUpperCase() : "";

  // ─── Loading / Error ───
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error || !event) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="text-2xl font-bold mb-2">Utakmica nije pronađena</h1>
        <p className="text-muted-foreground mb-6">Tražena utakmica ne postoji ili je uklonjena.</p>
        <Button onClick={() => navigate("/")} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Nazad</Button>
      </div>
      <Footer />
    </div>
  );

  // ─── Derived ───
  const currency = getCurrencySymbol(event.currency);
  const categories = parseCategories(event);
  const lowestPrice = categories.length > 0 ? Math.min(...categories.map((c) => c.price)) : 0;
  const sportLabel = event.sport ? getSportLabel(event.sport) : "";
  const eventType = (event as any).eventType || "seats";
  const buyUrl = eventType === "seats" ? `/fscg/${event.slug}` : `/mec/${event.slug}`;
  const matchTitle = homeTeam && awayTeam ? `${homeTeam.name} vs ${awayTeam.name}` : event.name;
  const venue = event.venue || "";
  const eventTime = event.event_time || "";

  const mapsUrl = matchedVenue?.google_maps_url || (matchedVenue?.latitude && matchedVenue?.longitude ? `https://www.google.com/maps?q=${matchedVenue.latitude},${matchedVenue.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`);
  const mapsEmbedUrl = matchedVenue?.latitude && matchedVenue?.longitude ? `https://www.google.com/maps?q=${matchedVenue.latitude},${matchedVenue.longitude}&z=15&output=embed` : `https://www.google.com/maps?q=${encodeURIComponent(venue)}&output=embed`;

  const seoDescription = `Kupite ulaznice za ${matchTitle}.${event.competition ? ` ${event.competition}.` : ""} ${formatShortDate(event.date)}. Od ${lowestPrice}${currency}.`;

  const sportsEventSchema = {
    "@context": "https://schema.org", "@type": "SportsEvent", name: matchTitle, startDate: event.date,
    image: event.image || "/og-image.jpg",
    ...(homeTeam && { homeTeam: { "@type": "SportsTeam", name: homeTeam.name } }),
    ...(awayTeam && { awayTeam: { "@type": "SportsTeam", name: awayTeam.name } }),
    location: { "@type": "Place", name: venue },
    offers: { "@type": "Offer", price: lowestPrice, priceCurrency: event.currency || "EUR", availability: "https://schema.org/InStock" },
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="flex min-h-screen flex-col">
      <SEO title={`${matchTitle} - Kupi ulaznice | etickets`} description={seoDescription} image={event.image || "/og-image.jpg"} type="event" basePath={`/mec/${event.slug}`} noIndex />
      <Helmet><script type="application/ld+json">{JSON.stringify(sportsEventSchema)}</script></Helmet>

      <Header />

      <main className="flex-1">
        {/* ═══ MOBILE ═══ */}
        <div className="md:hidden">
          {/* Back */}
          <div className="container py-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
              Nazad
            </button>
          </div>

          {/* Mobile Hero - Teams VS with gradient */}
          <section className="container pb-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
              {/* Badges */}
              {(event.competition || sportLabel) && (
                <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                  {event.competition && <span className="bg-white/10 text-white/80 rounded-full px-3 py-1 text-xs font-medium">{event.competition}</span>}
                  {event.match_round && <span className="bg-white/10 text-white/80 rounded-full px-3 py-1 text-xs font-medium">{event.match_round}</span>}
                  {sportLabel && <span className="bg-white/10 text-white/80 rounded-full px-3 py-1 text-xs font-medium">{sportLabel}</span>}
                </div>
              )}

              {/* VS */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex flex-col items-center text-center flex-1 min-w-0">
                  {homeTeam?.logo ? (
                    <img src={homeTeam.logo} alt={homeTeam.name} className="w-20 h-20 object-contain mb-2" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-2">
                      <span className="text-2xl font-black text-white/30">{homeTeam?.name?.charAt(0) || "H"}</span>
                    </div>
                  )}
                  <h2 className="text-white font-bold text-sm leading-tight">{homeTeam?.name || "Domaći"}</h2>
                </div>
                <span className="text-2xl font-black text-white/40 flex-shrink-0">VS</span>
                <div className="flex flex-col items-center text-center flex-1 min-w-0">
                  {awayTeam?.logo ? (
                    <img src={awayTeam.logo} alt={awayTeam.name} className="w-20 h-20 object-contain mb-2" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-2">
                      <span className="text-2xl font-black text-white/30">{awayTeam?.name?.charAt(0) || "G"}</span>
                    </div>
                  )}
                  <h2 className="text-white font-bold text-sm leading-tight">{awayTeam?.name || "Gosti"}</h2>
                </div>
              </div>

              {/* Date/Time/Venue */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-white/70 text-sm">
                <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /><span>{formatShortDate(event.date)}</span></div>
                {eventTime && <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /><span>{eventTime}</span></div>}
                {venue && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /><span>{venue}</span></div>}
              </div>
            </div>
          </section>

          {/* Mobile Ticket Card - SAME STYLE as EventDetail */}
          <section className="container pb-6">
            <Link
              to={buyUrl}
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
                  <p className="text-sm font-semibold text-foreground truncate">{matchTitle}</p>
                  {venue && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{venue}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end justify-center px-3 py-3">
                  <p className="text-xs text-muted-foreground">od</p>
                  <p className="text-lg font-bold text-primary">{lowestPrice > 0 ? lowestPrice + currency : "0€"}</p>
                  <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium mt-1">Kupi</div>
                </div>
              </div>
            </Link>
          </section>

          {/* Mobile Players */}
          {(homePlayers.length > 0 || awayPlayers.length > 0) && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Sastavi
              </h2>
              <div className="space-y-4">
                {[{ team: homeTeam, players: homePlayers }, { team: awayTeam, players: awayPlayers }]
                  .filter((g) => g.players.length > 0 && g.team)
                  .map(({ team, players }) => (
                    <div key={team!.id} className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2">
                        {team!.logo && <img src={team!.logo} alt={team!.name} className="w-6 h-6 object-contain" />}
                        <span className="text-white font-bold text-sm">{team!.name}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {players.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 px-4 py-2">
                            <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{p.number || "-"}</span>
                            <span className="text-sm font-medium text-foreground truncate flex-1">{p.name}</span>
                            {p.is_captain && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">K</span>}
                            {p.position && <span className="text-xs text-muted-foreground">{getPositionLabel(p.position, currentLang)}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Mobile Info */}
          {event.info && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold">O utakmici</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-base">{event.info}</p>
            </section>
          )}

          {/* Mobile Parking - Same as EventDetail */}
          {parkingInfo && (
            <section className="container pb-6">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-border">
                  <ParkingCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-base font-semibold text-blue-700 dark:text-blue-300">Parking</h2>
                </div>
                <div className="p-4">
                  <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">{parkingInfo}</p>
                </div>
              </div>
            </section>
          )}

          {/* Mobile Location - Same as EventDetail */}
          {venue && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary" />
                Lokacija
              </h2>
              <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
                <div className="relative h-[180px] bg-muted">
                  <iframe src={mapsEmbedUrl} title={"Mapa - " + venue} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base truncate">{venue}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {matchedVenue?.city && <span className="text-sm text-muted-foreground">{matchedVenue.city}</span>}
                          {matchedVenue?.capacity && (
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                              {matchedVenue.capacity.toLocaleString()} mjesta
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90">
                      <Navigation className="h-5 w-5" />
                    </a>
                  </div>
                  {matchedVenue?.description && <p className="text-base text-muted-foreground mt-3 line-clamp-2">{matchedVenue.description}</p>}
                  {matchedVenue && (
                    <Link to={"/lokacije/" + matchedVenue.slug} className="inline-flex items-center gap-1 text-base text-primary font-medium mt-3 hover:underline">
                      Više o lokaciji
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Mobile Stadium Map */}
          {matchedVenue?.image && (
            <section className="container pb-6">
              <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                <Building2 className="w-6 h-6 text-primary" />
                Mapa stadiona
              </h2>
              <div className="rounded-2xl border-2 border-border bg-card overflow-hidden p-3">
                <img src={matchedVenue.image} alt={"Mapa stadiona - " + matchedVenue.name} className="w-full rounded-xl" />
              </div>
            </section>
          )}

          {/* Mobile Rules */}
          <section className="container pb-6">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => setRulesOpen(!rulesOpen)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                    <Ban className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="font-semibold text-base">{rules.title}</span>
                </div>
                {rulesOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </button>
              {rulesOpen && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground italic mb-2">{rules.lawBasis}</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-3">{rules.subtitle}</p>
                  <ol className="space-y-2.5">
                    {rules.rules.map((rule, i) => {
                      const Icon = RULE_ICONS[i] || Ban;
                      return (
                        <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 flex items-center justify-center mt-0.5 relative">
                            <Icon className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <div className="absolute inset-0 rounded-full border-2 border-red-500/30" style={{ transform: "rotate(-45deg)", borderTopColor: "transparent", borderRightColor: "transparent" }} />
                          </div>
                          <span>{rule}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ═══ DESKTOP HERO ═══ */}
        <section className="hidden md:block bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="container">
            <div className="py-10 lg:py-14 max-w-4xl mx-auto">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                <Link to="/" className="hover:text-white transition-colors">Početna</Link>
                <span className="text-slate-500">→</span>
                <span className="text-slate-300">{matchTitle}</span>
              </div>

              {/* Badges */}
              {(event.competition || sportLabel) && (
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  {event.competition && <span className="bg-white/10 text-white/80 rounded-full px-4 py-1.5 text-sm font-medium">{event.competition}</span>}
                  {event.match_round && <span className="bg-white/10 text-white/80 rounded-full px-4 py-1.5 text-sm font-medium">{event.match_round}</span>}
                  {sportLabel && <span className="bg-white/10 text-white/80 rounded-full px-4 py-1.5 text-sm font-medium">{sportLabel}</span>}
                </div>
              )}

              {/* Teams VS */}
              <div className="flex items-center justify-center gap-8 lg:gap-12 mb-8">
                <div className="flex flex-col items-center text-center flex-1">
                  {homeTeam?.logo ? (
                    <img src={homeTeam.logo} alt={homeTeam.name} className="w-28 h-28 lg:w-32 lg:h-32 object-contain mb-3" />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center mb-3">
                      <span className="text-4xl font-black text-white/30">{homeTeam?.name?.charAt(0) || "H"}</span>
                    </div>
                  )}
                  <h2 className="text-white font-bold text-lg">{homeTeam?.name || "Domaći"}</h2>
                  {homeTeam?.city && <span className="text-white/40 text-sm mt-1">{homeTeam.city}</span>}
                </div>
                <span className="text-4xl lg:text-5xl font-black text-white/30 flex-shrink-0">VS</span>
                <div className="flex flex-col items-center text-center flex-1">
                  {awayTeam?.logo ? (
                    <img src={awayTeam.logo} alt={awayTeam.name} className="w-28 h-28 lg:w-32 lg:h-32 object-contain mb-3" />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center mb-3">
                      <span className="text-4xl font-black text-white/30">{awayTeam?.name?.charAt(0) || "G"}</span>
                    </div>
                  )}
                  <h2 className="text-white font-bold text-lg">{awayTeam?.name || "Gosti"}</h2>
                  {awayTeam?.city && <span className="text-white/40 text-sm mt-1">{awayTeam.city}</span>}
                </div>
              </div>

              {/* Date/Time/Venue */}
              <div className="flex items-center justify-center gap-6 text-slate-300 mb-6">
                <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /><span className="text-lg">{formatDate(event.date)}</span></div>
                {eventTime && (<><span className="text-slate-500">|</span><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /><span className="text-lg">{eventTime}</span></div></>)}
                {venue && (<><span className="text-slate-500">|</span><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><span className="text-lg">{venue}</span></div></>)}
              </div>

              {/* Price */}
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">Cijene od</p>
                <p className="text-4xl font-bold text-white">{lowestPrice > 0 ? lowestPrice + currency : "0€"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Desktop Ticket Bar - Same as EventDetail */}
        <section className="hidden md:block border-b border-border bg-card">
          <div className="container py-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-primary p-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center bg-primary/10 rounded-xl px-4 py-3 min-w-[70px]">
                    <span className="text-2xl font-bold text-primary">{dayNum}</span>
                    <span className="text-xs text-muted-foreground uppercase">{monthShort}</span>
                    {eventTime && <span className="text-xs text-muted-foreground mt-1">{eventTime}</span>}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-base truncate">{matchTitle}</h2>
                    {venue && <p className="text-sm text-muted-foreground truncate">{venue}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Već od</p>
                    <p className="text-xl font-bold text-primary">{lowestPrice > 0 ? lowestPrice + currency : "0€"}</p>
                  </div>
                  <Button asChild className="px-6">
                    <Link to={buyUrl}>Kupi karte</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Desktop Content */}
        <section className="hidden md:block container py-10">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Players */}
            {(homePlayers.length > 0 || awayPlayers.length > 0) && (
              <div>
                <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Sastavi
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {[{ team: homeTeam, players: homePlayers }, { team: awayTeam, players: awayPlayers }]
                    .filter((g) => g.players.length > 0 && g.team)
                    .map(({ team, players }) => (
                      <div key={team!.id} className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2">
                          {team!.logo && <img src={team!.logo} alt={team!.name} className="w-6 h-6 object-contain" />}
                          <span className="text-white font-bold text-sm">{team!.name}</span>
                        </div>
                        <div className="divide-y divide-border">
                          {players.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-2">
                              <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{p.number || "-"}</span>
                              <span className="text-sm font-medium text-foreground truncate flex-1">{p.name}</span>
                              {p.is_captain && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">K</span>}
                              {p.position && <span className="text-xs text-muted-foreground">{getPositionLabel(p.position, currentLang)}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Info */}
            {event.info && (
              <div>
                <h2 className="mb-4 text-xl font-bold">O utakmici</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.info}</p>
              </div>
            )}

            {/* Parking */}
            {parkingInfo && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-border">
                  <ParkingCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-base font-semibold text-blue-700 dark:text-blue-300">Parking</h2>
                </div>
                <div className="p-4">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{parkingInfo}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {venue && (
              <div>
                <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Lokacija
                </h2>
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="relative h-[180px] bg-muted">
                    <iframe src={mapsEmbedUrl} title={"Mapa - " + venue} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0" />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{venue}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {matchedVenue?.city && <span className="text-xs text-muted-foreground">{matchedVenue.city}</span>}
                            {matchedVenue?.capacity && (
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                {matchedVenue.capacity.toLocaleString()} mjesta
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {matchedVenue && (
                          <Link to={"/lokacije/" + matchedVenue.slug} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title="Detalji lokacije">
                            <Building2 className="h-4 w-4" />
                          </Link>
                        )}
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                          <Navigation className="h-4 w-4" />
                          <span>Navigacija</span>
                        </a>
                      </div>
                    </div>
                    {matchedVenue && (
                      <Link to={"/lokacije/" + matchedVenue.slug} className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-2 hover:underline">
                        Više o lokaciji <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stadium Map */}
            {matchedVenue?.image && (
              <div>
                <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Mapa stadiona
                </h2>
                <div className="rounded-xl border border-border bg-card overflow-hidden p-4">
                  <img src={matchedVenue.image} alt={"Mapa stadiona - " + matchedVenue.name} className="w-full rounded-lg" />
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => setRulesOpen(!rulesOpen)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                    <Ban className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="font-semibold">{rules.title}</span>
                </div>
                {rulesOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </button>
              {rulesOpen && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground italic mb-2">{rules.lawBasis}</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-3">{rules.subtitle}</p>
                  <ol className="space-y-2.5">
                    {rules.rules.map((rule, i) => {
                      const Icon = RULE_ICONS[i] || Ban;
                      return (
                        <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 flex items-center justify-center mt-0.5 relative">
                            <Icon className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <div className="absolute inset-0 rounded-full border-2 border-red-500/30" style={{ transform: "rotate(-45deg)", borderTopColor: "transparent", borderRightColor: "transparent" }} />
                          </div>
                          <span>{rule}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MatchPage;
