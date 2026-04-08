import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Minus,
  Plus,
  Ticket,
  ArrowLeft,
  Loader2,
  Music,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  Building2,
  Navigation,
  Facebook,
  Twitter,
  Link2,
  Tag,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import SEO from "@/components/SEO";
import { usePerformers } from "@/hooks/usePerformers";
import { useVenues } from "@/hooks/useVenues";
import { toast } from "@/hooks/use-toast";

interface TicketCategory {
  category: string;
  price: number;
  type?: string;
  description?: string;
  originalPrice?: number;
  promo?: boolean;
  promoLabel?: string;
  promoDeadline?: string;
}

interface EventData {
  id: string;
  name: string;
  slug: string;
  date: string;
  end_date?: string;
  event_time: string;
  venue: string;
  currency: string;
  description: any;
  serviceFeePercentage: string;
  info?: string;
  image?: string;
  heroImage?: string;
  organizer?: string;
  organizer_logo?: string;
  organizer_url?: string;
  category?: string;
  long_description?: string;
  performer?: string;
  eventKey?: string;
  eventId?: string;
}

interface SelectedTicket {
  category: string;
  price: number;
  quantity: number;
  description?: string;
}

const FestivalPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<SelectedTicket[]>([]);

  const { data: performers = [] } = usePerformers();
  const { data: venues = [] } = useVenues();

  // Match performers
  const matchedPerformers = useMemo(() => {
    if (!event || !performers.length) return [];
    const eventName = event.name.toLowerCase();
    const eventInfo = (event.info || "").toLowerCase();
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchesAsWord = (text: string, name: string) => {
      if (!name || !text) return false;
      return new RegExp(`(?:^|\\s|[,;.!?\\-])${escapeRegex(name)}(?:$|\\s|[,;.!?\\-])`, "i").test(` ${text} `);
    };
    return performers.filter((p) => {
      const performerName = p.name.toLowerCase();
      return matchesAsWord(eventName, performerName) || matchesAsWord(eventInfo, performerName);
    });
  }, [event, performers]);

  // Match venue
  const matchedVenue = useMemo(() => {
    if (!event?.venue || !venues.length) return null;
    const eventVenue = event.venue.toLowerCase().trim();
    let found = venues.find((v) => v.name.toLowerCase() === eventVenue);
    if (!found) {
      found = venues.find(
        (v) => eventVenue.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(eventVenue),
      );
    }
    return found;
  }, [event, venues]);

  useEffect(() => {
    loadEvent();
  }, [slug]);

  const loadEvent = async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("AboutEvents").select("*").eq("slug", slug).single();
      if (error) throw error;
      if (data) {
        setEvent(data);
        const categories = parseCategories(data.description);
        setSelectedTickets(
          categories.map((cat) => ({
            category: cat.category,
            price: cat.price,
            quantity: 0,
            description: cat.description,
          })),
        );
      }
    } catch (err: any) {
      console.error("Error loading event:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const parseCategories = (description: any): TicketCategory[] => {
    if (!description) return [];
    try {
      const parsed = typeof description === "string" ? JSON.parse(description) : description;
      if (Array.isArray(parsed)) {
        return parsed.map((cat: any) => ({
          category: cat.category || cat.name || "Standardna",
          price: parseFloat(cat.price) || 0,
          type: cat.type || "regular",
          description: cat.description || "",
          originalPrice: cat.originalPrice ? parseFloat(cat.originalPrice) : undefined,
          promo: cat.promo || false,
          promoLabel: cat.promoLabel || "",
          promoDeadline: cat.promoDeadline || "",
        }));
      }
    } catch (e) {
      console.error("Error parsing categories:", e);
    }
    return [];
  };

  const updateQuantity = (categoryName: string, delta: number) => {
    setSelectedTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.category === categoryName) {
          const newQuantity = Math.max(0, Math.min(10, ticket.quantity + delta));
          return { ...ticket, quantity: newQuantity };
        }
        return ticket;
      }),
    );
  };

  const totalTickets = useMemo(() => {
    return selectedTickets.reduce((sum, t) => sum + t.quantity, 0);
  }, [selectedTickets]);

  const subtotal = useMemo(() => {
    return selectedTickets.reduce((sum, t) => sum + t.price * t.quantity, 0);
  }, [selectedTickets]);

  const serviceFee = useMemo(() => {
    if (!event || subtotal === 0) return 0;
    const feePercent = parseFloat(event.serviceFeePercentage) || 5;
    const percentageFee = subtotal * (feePercent / 100);
    const fixedFee = 0.3;
    return Math.round((percentageFee + fixedFee) * 100) / 100;
  }, [subtotal, event]);

  const grandTotal = useMemo(() => {
    return subtotal + serviceFee;
  }, [subtotal, serviceFee]);

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "EUR": return "\u20ac";
      case "RSD": return "RSD";
      case "BAM": return "KM";
      default: return "\u20ac";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const datePart = dateStr.split("T")[0];
      const [y, m, d] = datePart.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("sr-Latn-ME", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const handleProceedToCheckout = () => {
    if (totalTickets === 0 || !event) return;

    const tickets = selectedTickets
      .filter((t) => t.quantity > 0)
      .map((t) => ({
        category: t.category,
        price: t.price,
        quantity: t.quantity,
        description: t.description,
      }));

    const checkoutData = {
      eventId: event.eventKey || event.eventId,
      tickets,
      eventDetails: {
        name: event.name,
        date: event.date,
        time: event.event_time || "",
        venue: event.venue || "",
      },
      subtotal,
      serviceFee,
      total: grandTotal,
      currency: event.currency || "EUR",
      eventSlug: slug,
    };

    sessionStorage.setItem(`festivalCheckoutData_${slug}`, JSON.stringify(checkoutData));
    sessionStorage.setItem(`festivalCheckoutStart_${slug}`, Date.now().toString());
    navigate(`/checkout/festival/${slug}`);
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = event ? event.name + " - " + formatDate(event.date) : "";
    if (platform === "facebook") {
      window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), "_blank");
    } else if (platform === "twitter") {
      window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url), "_blank");
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast({ title: "Link kopiran!", description: "Link je uspješno kopiran u clipboard." });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Događaj nije pronađen</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nazad na početnu
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const currency = getCurrencySymbol(event.currency);
  const allCategories = parseCategories(event.description);
  const categories = allCategories.filter((c) => c.category.toLowerCase().includes("trodnevn"));
  const lowestPrice = categories.length > 0 ? Math.min(...categories.map((c) => c.price)) : 0;
  const imageUrl = event.heroImage || event.image || "/og-image.jpg";
  const hasActivePromo = categories.some((c) => c.promo && c.promoDeadline && new Date(c.promoDeadline) >= new Date());

  const mapsUrl = matchedVenue?.google_maps_url
    ? matchedVenue.google_maps_url
    : matchedVenue?.latitude && matchedVenue?.longitude
      ? `https://www.google.com/maps?q=${matchedVenue.latitude},${matchedVenue.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`;

  const mapsEmbedUrl =
    matchedVenue?.latitude && matchedVenue?.longitude
      ? `https://www.google.com/maps?q=${matchedVenue.latitude},${matchedVenue.longitude}&output=embed`
      : `https://www.google.com/maps?q=${encodeURIComponent(event.venue)}&output=embed`;

  const seoTitle = `${event.name} - Kupi ulaznice | etickets`;
  const seoDescription = `Kupite ulaznice za ${event.name}. ${formatDate(event.date)}${event.venue ? ` - ${event.venue}` : ""}. Cijena od ${lowestPrice}${currency}.`;

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.date,
    description: event.info || seoDescription,
    image: imageUrl,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: matchedVenue
      ? { "@type": "Place", name: matchedVenue.name, address: { "@type": "PostalAddress", streetAddress: matchedVenue.address || "", addressLocality: matchedVenue.city, addressCountry: "BA" } }
      : { "@type": "Place", name: event.venue, address: { "@type": "PostalAddress", addressCountry: "BA" } },
    offers: { "@type": "Offer", price: lowestPrice, priceCurrency: event.currency || "EUR", availability: "https://schema.org/InStock", url: `https://etickets.ba/festival/${event.slug}` },
    organizer: event.organizer ? { "@type": "Organization", name: event.organizer } : { "@type": "Organization", name: "etickets", url: "https://etickets.ba" },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SEO title={seoTitle} description={seoDescription} image={imageUrl} type="event" basePath={`/festival/${event.slug}`} noIndex />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(eventSchema)}</script>
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* ═══════════════ MOBILE ═══════════════ */}
        <div className="md:hidden">
          {/* Mobile Hero */}
          <div className="container py-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
              Nazad
            </button>
          </div>

          <section className="container pb-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <img src={imageUrl} alt={event.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              {event.category && (
                <span className="absolute top-4 right-4 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
                  {event.category}
                </span>
              )}
              {hasActivePromo && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
                  AKCIJA -20%
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h1 className="mb-2 text-2xl font-extrabold text-white drop-shadow-lg">{event.name}</h1>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/90 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  {event.event_time && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{event.event_time}</span>
                    </div>
                  )}
                  {event.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{event.venue}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Mobile Promo Banner */}
          {hasActivePromo && (
            <section className="container pb-3">
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span className="font-bold text-sm">20% popusta na trodnevne!</span>
                </div>
                <span className="text-xs bg-white/20 rounded-full px-2.5 py-0.5">do 10.04.</span>
              </div>
            </section>
          )}

          {/* Mobile Ticket Selection */}
          <section className="container pb-6">
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Ulaznice
            </h2>

            <div className="space-y-3">
              {categories.map((cat, index) => {
                const selected = selectedTickets.find((t) => t.category === cat.category);
                const quantity = selected?.quantity || 0;
                const isPromo = cat.promo && cat.promoDeadline && new Date(cat.promoDeadline) >= new Date();

                return (
                  <div
                    key={index}
                    className={`p-3.5 rounded-xl border-2 transition-all bg-card ${
                      quantity > 0 ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm">{cat.category}</h3>
                          {isPromo && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{cat.promoLabel}</span>
                          )}
                        </div>
                        {cat.description && <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        {isPromo && cat.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through block">{cat.originalPrice.toFixed(0)}{currency}</span>
                        )}
                        <span className={`text-base font-bold ${isPromo ? "text-red-500" : "text-primary"}`}>
                          {cat.price.toFixed(0)}{currency}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => updateQuantity(cat.category, -1)}
                        disabled={quantity === 0}
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-bold text-base text-foreground">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(cat.category, 1)}
                        disabled={quantity >= 10}
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Total + CTA */}
            {totalTickets > 0 && (
              <div className="mt-4 bg-card border border-border rounded-xl p-4">
                <div className="space-y-1.5 mb-3">
                  {selectedTickets.filter((t) => t.quantity > 0).map((ticket, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{ticket.quantity}x {ticket.category}</span>
                      <span className="text-foreground">{(ticket.price * ticket.quantity).toFixed(2)} {currency}</span>
                    </div>
                  ))}
                  {serviceFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Servisna naknada</span>
                      <span className="text-foreground">{serviceFee.toFixed(2)} {currency}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-border mb-4">
                  <span>Ukupno</span>
                  <span className="text-primary">{grandTotal.toFixed(2)} {currency}</span>
                </div>
                <Button onClick={handleProceedToCheckout} className="w-full h-11 text-base font-semibold" size="lg">
                  Nastavi na plaćanje
                </Button>
              </div>
            )}
          </section>

          {/* Mobile - O događaju */}
          {event.info && (
            <section className="container pb-6">
              <h2 className="mb-2 text-lg font-bold">O događaju</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">{event.info}</p>
            </section>
          )}

          {/* Mobile - Organizator */}
          {event.organizer && (
            <section className="container pb-6">
              <h2 className="mb-2 text-lg font-bold">Organizator</h2>
              <Link to={"/organizatori/" + encodeURIComponent(event.organizer)} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/50 hover:shadow-md transition-all">
                {event.organizer_logo ? (
                  <img src={event.organizer_logo} alt={event.organizer} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{event.organizer}</p>
                  <p className="text-xs text-muted-foreground">Verifikovani organizator</p>
                </div>
                <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
              </Link>
            </section>
          )}

          {/* Mobile - Lokacija */}
          {event.venue && (
            <section className="container pb-6">
              <h2 className="mb-2 text-lg font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Lokacija
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <iframe src={mapsEmbedUrl} width="100%" height="160" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={"Mapa - " + event.venue} />
                <div className="p-3 flex items-center justify-between">
                  <p className="font-semibold text-sm truncate flex-1">{event.venue}</p>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 flex-shrink-0 ml-3">
                    <Navigation className="h-3.5 w-3.5" />
                    Navigacija
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Mobile - Share */}
          <section className="container pb-8">
            <div className="flex gap-3">
              <button onClick={() => handleShare("facebook")} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90">
                <Facebook className="h-4 w-4" />
              </button>
              <button onClick={() => handleShare("twitter")} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1DA1F2] text-white hover:opacity-90">
                <Twitter className="h-4 w-4" />
              </button>
              <button onClick={() => handleShare("copy")} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground">
                <Link2 className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>

        {/* ═══════════════ DESKTOP HERO ═══════════════ */}
        <section className="hidden md:block bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-8 py-8 md:py-12 lg:py-16">
              <div className="flex flex-col justify-center order-2 lg:order-1">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <Link to="/" className="hover:text-white transition-colors">Početna</Link>
                  <span className="text-slate-500">&rarr;</span>
                  {event.category && (
                    <>
                      <Link to={`/?category=${encodeURIComponent(event.category)}`} className="hover:text-white transition-colors">{event.category}</Link>
                      <span className="text-slate-500">&rarr;</span>
                    </>
                  )}
                  <span className="text-slate-300">{event.name}</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">{event.name}</h1>
                <div className="flex flex-col gap-3 mb-8">
                  <div className="flex items-center gap-3 text-slate-300">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="text-lg">{formatDate(event.date)}</span>
                    {event.event_time && (
                      <>
                        <span className="text-slate-500">|</span>
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-lg">{event.event_time}</span>
                      </>
                    )}
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="text-lg">{event.venue}</span>
                      {matchedVenue && (
                        <Link to={"/lokacije/" + matchedVenue.slug} className="text-sm text-primary hover:underline">Detalji &rarr;</Link>
                      )}
                    </div>
                  )}
                </div>
                {matchedPerformers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {matchedPerformers.map((p) => (
                      <Link key={p.id} to={"/izvodjaci/" + p.slug} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
                        <Music className="w-4 h-4" />
                        {p.name}
                      </Link>
                    ))}
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-400 mb-1">Cijene od</p>
                  <p className="text-4xl font-bold text-white">{lowestPrice > 0 ? lowestPrice + currency : "Besplatno"}</p>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative aspect-[4/3] lg:aspect-[3/2] overflow-hidden rounded-2xl shadow-2xl">
                  <img src={imageUrl} alt={event.name} className="h-full w-full object-cover" />
                  {event.category && (
                    <span className="absolute top-4 right-4 rounded-full bg-primary/90 backdrop-blur-sm px-4 py-1.5 text-sm font-semibold text-white">{event.category}</span>
                  )}
                  {hasActivePromo && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg animate-pulse">AKCIJA -20% na trodnevne</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ DESKTOP TICKET SECTION (below hero) ═══════════════ */}
        <section className="hidden md:block border-b border-border bg-card">
          <div className="container py-6">
            <div className="max-w-5xl mx-auto">
              {/* Promo Banner */}
              {hasActivePromo && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-xl px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5" />
                    <span className="font-bold">Akcijska ponuda: 20% popusta na trodnevne ulaznice!</span>
                  </div>
                  <span className="text-sm bg-white/20 rounded-full px-3 py-1">Važi do 10. aprila 2026.</span>
                </div>
              )}

              <div className={`border-2 border-primary ${hasActivePromo ? "rounded-b-xl" : "rounded-xl"} overflow-hidden`}>
                <div className="divide-y divide-border">
                  {categories.map((cat, index) => {
                    const selected = selectedTickets.find((t) => t.category === cat.category);
                    const quantity = selected?.quantity || 0;
                    const isPromo = cat.promo && cat.promoDeadline && new Date(cat.promoDeadline) >= new Date();

                    return (
                      <div key={index} className={`px-6 py-4 flex items-center justify-between ${isPromo ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{cat.category}</h3>
                            {isPromo && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">{cat.promoLabel}</span>
                            )}
                          </div>
                          {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                        </div>

                        <div className="flex items-center gap-6 ml-4">
                          <div className="text-right min-w-[70px]">
                            {isPromo && cat.originalPrice && (
                              <span className="text-sm text-muted-foreground line-through block">{cat.originalPrice.toFixed(0)}{currency}</span>
                            )}
                            <span className={`text-xl font-bold ${isPromo ? "text-red-500" : "text-primary"}`}>
                              {cat.price.toFixed(0)}{currency}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(cat.category, -1)}
                              disabled={quantity === 0}
                              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-bold text-lg text-foreground">{quantity}</span>
                            <button
                              onClick={() => updateQuantity(cat.category, 1)}
                              disabled={quantity >= 10}
                              className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total + CTA */}
                {totalTickets > 0 && (
                  <div className="border-t border-border bg-primary/5 px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex gap-4 mb-1">
                        {selectedTickets.filter((t) => t.quantity > 0).map((ticket, idx) => (
                          <span key={idx} className="text-sm text-muted-foreground">
                            {ticket.quantity}x {ticket.category}
                          </span>
                        ))}
                      </div>
                      <div className="text-2xl font-bold text-primary">{grandTotal.toFixed(2)} {currency}</div>
                      <p className="text-xs text-muted-foreground">Uklj. servisnu naknadu {serviceFee.toFixed(2)} {currency}</p>
                    </div>
                    <Button onClick={handleProceedToCheckout} size="lg" className="px-8 h-12 text-base">
                      Nastavi na plaćanje
                    </Button>
                  </div>
                )}

                {totalTickets === 0 && (
                  <div className="border-t border-border bg-muted/30 px-6 py-3 text-center text-sm text-muted-foreground">
                    Odaberite željeni broj karata za nastavak
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ DESKTOP CONTENT ═══════════════ */}
        <section className="hidden md:block container py-10">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left column - Info */}
            <div className="lg:col-span-2 space-y-8">
              {event.info && (
                <div>
                  <h2 className="mb-4 text-xl font-bold">O događaju</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.info}</p>
                </div>
              )}

              {event.organizer && (
                <div>
                  <h2 className="mb-4 text-xl font-bold">Organizator</h2>
                  <Link to={"/organizatori/" + encodeURIComponent(event.organizer)} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all group">
                    {event.organizer_logo ? (
                      <img src={event.organizer_logo} alt={event.organizer} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold group-hover:text-primary transition-colors">{event.organizer}</p>
                      <p className="text-sm text-muted-foreground">Verifikovani organizator</p>
                    </div>
                    <div className="flex items-center gap-1 text-primary text-sm font-medium">
                      Saznaj više <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                </div>
              )}

              {event.venue && (
                <div>
                  <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Lokacija
                  </h2>
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <iframe src={mapsEmbedUrl} width="100%" height="180" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={"Mapa - " + event.venue} />
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{event.venue}</p>
                          {matchedVenue?.city && <span className="text-xs text-muted-foreground">{matchedVenue.city}</span>}
                        </div>
                      </div>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                        <Navigation className="h-4 w-4" />
                        Navigacija
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {event.long_description && (
                <div>
                  <h2 className="mb-4 text-xl font-bold">Detaljniji opis</h2>
                  <article className="prose dark:prose-invert max-w-none">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.long_description}</p>
                  </article>
                </div>
              )}

              <div>
                <h2 className="mb-4 text-xl font-bold">Podijeli</h2>
                <div className="flex gap-3">
                  <button onClick={() => handleShare("facebook")} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90"><Facebook className="h-5 w-5" /></button>
                  <button onClick={() => handleShare("twitter")} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1DA1F2] text-white hover:opacity-90"><Twitter className="h-5 w-5" /></button>
                  <button onClick={() => handleShare("copy")} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"><Link2 className="h-5 w-5" /></button>
                </div>
              </div>
            </div>

            {/* Right column - Performers sidebar */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {matchedPerformers.length > 0 &&
                  matchedPerformers.map((performer) => (
                    <Link
                      key={performer.id}
                      to={"/izvodjaci/" + performer.slug}
                      className="block rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-lg transition-all group"
                    >
                      {performer.image && (
                        <div className="aspect-square rounded-lg overflow-hidden mb-4">
                          <img src={performer.image} alt={performer.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <Music className="w-4 h-4 text-primary" />
                        <h3 className="font-bold group-hover:text-primary transition-colors">{performer.name}</h3>
                      </div>
                      {performer.biography && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{performer.biography}</p>
                      )}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FestivalPage;
