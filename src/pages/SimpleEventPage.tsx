import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  Minus,
  Plus,
  Ticket,
  ArrowLeft,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Music,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import SEO from "@/components/SEO";
import { usePerformers } from "@/hooks/usePerformers";
import { useVenues } from "@/hooks/useVenues";

interface TicketCategory {
  category: string;
  price: number;
  type?: string;
  description?: string;
}

interface EventData {
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
}

interface SelectedTicket {
  category: string;
  price: number;
  quantity: number;
  description?: string;
}

const SimpleEventPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<SelectedTicket[]>([]);

  // Performers i Venues
  const { data: performers = [] } = usePerformers();
  const { data: venues = [] } = useVenues();

  // Insurance state
  const [insuranceChoice, setInsuranceChoice] = useState<"yes" | "no" | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const INSURANCE_PERCENTAGE = 0.07; // 7% od cijene karata

  const insuranceBenefits = [
    { icon: "🚌", text: "Kašnjenje prevoznog sredstva" },
    { icon: "⚖️", text: "Poziv na sud" },
    { icon: "🏠", text: "Provala/krađa u stan ili kuću" },
    { icon: "🔥", text: "Požar u stanu/kući" },
    { icon: "💧", text: "Poplava u stanu/kući" },
    { icon: "🦴", text: "Prelomi kostiju ili povrede" },
    { icon: "💼", text: "Privremena nesposobnost za rad" },
    { icon: "👶", text: "Iznenadna bolest djeteta" },
    { icon: "📋", text: "Gubitak zaposlenja" },
    { icon: "🏥", text: "Teško bolesna stanja" },
    { icon: "💔", text: "Smrt bliske osobe" },
    { icon: "🚗", text: "Saobraćajna nesreća" },
  ];

  // ═══════════════════════════════════════════════════════════════
  // MATCH PERFORMERS
  // ═══════════════════════════════════════════════════════════════
  const matchedPerformers = useMemo(() => {
    if (!event || !performers.length) return [];

    const eventName = event.name.toLowerCase();
    const eventInfo = (event.info || "").toLowerCase();

    // Word-boundary match: provjeri da se ime pojavljuje kao cijela riječ
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

  // ═══════════════════════════════════════════════════════════════
  // MATCH VENUE
  // ═══════════════════════════════════════════════════════════════
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

  const insurancePrice = useMemo(() => {
    return Math.round(subtotal * INSURANCE_PERCENTAGE * 100) / 100;
  }, [subtotal]);

  const insuranceTotal = useMemo(() => {
    return insuranceChoice === "yes" ? insurancePrice : 0;
  }, [insuranceChoice, insurancePrice]);

  const grandTotal = useMemo(() => {
    return subtotal + serviceFee + insuranceTotal;
  }, [subtotal, serviceFee, insuranceTotal]);

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "EUR":
        return "€";
      case "RSD":
        return "RSD";
      case "BAM":
        return "KM";
      default:
        return "€";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      // Parse date locally to avoid UTC shift
      const datePart = dateStr.split("T")[0];
      const [y, m, d] = datePart.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("sr-Latn-ME", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleInsuranceSelect = (choice: "yes" | "no") => {
    setInsuranceChoice(choice);
    setShowWarning(false);
    if (choice === "no") {
      setAcceptTerms(false);
      setShowBenefits(false);
    }
  };

  // ========== STRIPE CHECKOUT INTEGRATION ==========
  const handleProceedToCheckout = async () => {
    if (totalTickets === 0) return;

    // Validate insurance choice
    if (insuranceChoice === null) {
      setShowWarning(true);
      return;
    }

    // Validate terms acceptance if insurance selected
    if (insuranceChoice === "yes" && !acceptTerms) {
      setShowWarning(true);
      return;
    }

    setIsProcessing(true);
    setShowWarning(false);

    try {
      // Pripremi karte za slanje - flatten za Stripe line items
      const ticketsToSend = selectedTickets
        .filter((t) => t.quantity > 0)
        .flatMap((t) =>
          Array(t.quantity)
            .fill(null)
            .map((_, index) => ({
              type: t.category,
              category: t.category,
              categoryName: t.category,
              name: t.category,
              price: t.price,
              sectionLabel: t.category,
            })),
        );

      const checkoutData = {
        eventId: (event as any)?.eventId || event?.id,
        selectedTickets: ticketsToSend,
        eventDetails: {
          name: event?.name || "",
          date: event?.date || "",
          time: event?.event_time || "",
          venue: event?.venue || "",
        },
        hasInsurance: insuranceChoice === "yes",
        insurancePrice: insuranceChoice === "yes" ? insurancePrice : 0,
        subtotal: subtotal,
        serviceFee: serviceFee,
        total: grandTotal,
        currency: event?.currency || "EUR",
      };

      console.log("Sending simple checkout data:", checkoutData);

      // Pozovi Edge Function za SIMPLE events
      const { data, error } = await supabase.functions.invoke("create-checkout-session-simple", {
        body: checkoutData,
      });

      if (error) {
        throw new Error(error.message || "Greška pri pozivu funkcije");
      }

      if (data?.success && data?.url) {
        // Redirect na Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data?.message || "Greška pri kreiranju checkout sesije");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert("Greška pri plaćanju: " + error.message + "\n\nMolimo kontaktirajte podršku: support@etickets.ba");
      setIsProcessing(false);
    }
  };

  const handleGoBack = () => {
    navigate(`/about-events/${slug}`);
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
  const categories = parseCategories(event.description);
  const lowestPrice = categories.length > 0 ? Math.min(...categories.map((c) => c.price)) : 0;

  // SEO podaci
  const seoTitle = `${event.name} - Kupi ulaznice | etickets`;
  const seoDescription = `Kupite ulaznice za ${event.name}. ${formatDate(event.date)}${event.venue ? ` - ${event.venue}` : ""}. Cijena od ${lowestPrice}${currency}. Brza i sigurna online kupovina.`;
  const imageUrl = event.image || "/og-image.jpg";

  // Schema.org Event markup
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
      ? {
          "@type": "Place",
          name: matchedVenue.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: matchedVenue.address || "",
            addressLocality: matchedVenue.city,
            addressCountry: "ME",
          },
          ...(matchedVenue.latitude &&
            matchedVenue.longitude && {
              geo: {
                "@type": "GeoCoordinates",
                latitude: matchedVenue.latitude,
                longitude: matchedVenue.longitude,
              },
            }),
        }
      : {
          "@type": "Place",
          name: event.venue,
          address: {
            "@type": "PostalAddress",
            addressCountry: "ME",
          },
        },
    ...(matchedPerformers.length > 0 && {
      performer: matchedPerformers.map((p) => ({
        "@type": "MusicGroup",
        name: p.name,
        image: p.image,
        url: `https://etickets.ba/izvodjaci/${p.slug}`,
      })),
    }),
    offers: {
      "@type": "Offer",
      price: lowestPrice,
      priceCurrency: event.currency || "EUR",
      availability: "https://schema.org/InStock",
      url: `https://etickets.ba/simple-event/${event.slug}`,
      validFrom: new Date().toISOString(),
    },
    organizer: event.organizer
      ? {
          "@type": "Organization",
          name: event.organizer,
        }
      : {
          "@type": "Organization",
          name: "etickets",
          url: "https://etickets.ba",
        },
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        image={imageUrl}
        type="event"
        basePath={`/simple-event/${event.slug}`}
        noIndex
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(eventSchema)}</script>
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {/* Back Button */}
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Nazad na događaj</span>
        </button>

        {/* Event Info Header */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-3">{event.name}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{formatDate(event.date)}</span>
            </div>
            {event.event_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                <span>{event.event_time}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{event.venue}</span>
                {matchedVenue && (
                  <Link to={`/lokacije/${matchedVenue.slug}`} className="text-primary hover:underline ml-1">
                    →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Izvođači - kompaktno */}
          {matchedPerformers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
              {matchedPerformers.map((p) => (
                <Link
                  key={p.id}
                  to={`/izvodjaci/${p.slug}`}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                >
                  <Music className="w-3 h-3" />
                  {p.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Ticket Selection Card */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Kategorije karata
          </h2>

          <div className="space-y-4">
            {categories.map((cat, index) => {
              const selected = selectedTickets.find((t) => t.category === cat.category);
              const quantity = selected?.quantity || 0;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    quantity > 0 ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{cat.category}</h3>
                      {cat.description && <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>}
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {cat.price.toFixed(2)} {currency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Količina:</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(cat.category, -1)}
                        disabled={quantity === 0}
                        className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-lg text-foreground">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(cat.category, 1)}
                        disabled={quantity >= 10}
                        className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insurance Section - samo ako ima karata */}
        {totalTickets > 0 && (
          <div
            className={`bg-card border-2 rounded-2xl p-6 mb-6 transition-colors ${
              showWarning && insuranceChoice === null ? "border-red-500 bg-red-50" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Želiš li osiguranje ulaznica?</h2>
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">OBAVEZNO</span>
            </div>

            {showWarning && insuranceChoice === null && (
              <div className="bg-red-500 text-white p-3 rounded-lg mb-4 flex items-center gap-2 animate-pulse">
                <span>⚠️</span>
                <span className="font-semibold">Morate odabrati jednu opciju prije nastavka!</span>
              </div>
            )}

            {showWarning && insuranceChoice === "yes" && !acceptTerms && (
              <div className="bg-red-500 text-white p-3 rounded-lg mb-4 flex items-center gap-2 animate-pulse">
                <span>⚠️</span>
                <span className="font-semibold">Morate prihvatiti uslove osiguranja!</span>
              </div>
            )}

            <p className="text-muted-foreground text-sm mb-6">Molimo izaberi jednu od opcija da bi nastavio kupovinu</p>

            {/* YES Option */}
            <div
              onClick={() => handleInsuranceSelect("yes")}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all mb-4 ${
                insuranceChoice === "yes"
                  ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-500/20"
                  : "border-border hover:border-green-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                    insuranceChoice === "yes" ? "border-green-500" : "border-gray-300"
                  }`}
                >
                  {insuranceChoice === "yes" && <div className="w-3 h-3 rounded-full bg-green-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-lg">✅ Želim da osiguram ulaznice</span>
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">100% POVRAT</span>
                    </div>
                    <span className="font-bold text-green-600 text-xl">
                      +{insurancePrice.toFixed(2)} {currency}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">
                    Kompletna zaštita u slučaju nepredviđenih okolnosti. Pun povrat novca garantovan.
                  </p>

                  {/* Benefits toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBenefits(!showBenefits);
                    }}
                    className="flex items-center gap-2 text-green-600 font-semibold text-sm border border-green-500 rounded-lg px-3 py-2 hover:bg-green-50 transition-colors"
                  >
                    {showBenefits ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showBenefits ? "Sakrij detalje" : "Vidi šta je pokriveno"}
                  </button>

                  {/* Benefits list */}
                  {showBenefits && (
                    <div className="mt-4 pt-4 border-t border-green-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {insuranceBenefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <span>{benefit.icon}</span>
                          <span>{benefit.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Terms checkbox */}
                  {insuranceChoice === "yes" && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setAcceptTerms(!acceptTerms);
                      }}
                      className={`mt-4 pt-4 border-t border-green-200 flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors ${
                        showWarning && !acceptTerms ? "bg-red-100" : ""
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          acceptTerms ? "bg-green-500 border-green-500" : "border-gray-300"
                        }`}
                      >
                        {acceptTerms && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-gray-700">
                        Prihvatam{" "}
                        <a
                          href="#"
                          onClick={(e) => e.preventDefault()}
                          className="text-green-600 underline font-semibold"
                        >
                          uslove osiguranja
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* NO Option */}
            <div
              onClick={() => handleInsuranceSelect("no")}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                insuranceChoice === "no"
                  ? "border-gray-500 bg-gray-100 shadow-lg"
                  : "border-border hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    insuranceChoice === "no" ? "border-gray-500" : "border-gray-300"
                  }`}
                >
                  {insuranceChoice === "no" && <div className="w-3 h-3 rounded-full bg-gray-500" />}
                </div>
                <div>
                  <span className="font-bold text-foreground text-lg">❌ Ne želim osiguranje</span>
                  <p className="text-muted-foreground text-sm mt-1">Nastaviću bez dodatne zaštite</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price Summary & Checkout */}
        {totalTickets > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-4">Pregled narudžbe</h3>

            <div className="space-y-2 mb-4">
              {selectedTickets
                .filter((t) => t.quantity > 0)
                .map((ticket, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {ticket.quantity}x {ticket.category}
                    </span>
                    <span className="text-foreground">
                      {(ticket.price * ticket.quantity).toFixed(2)} {currency}
                    </span>
                  </div>
                ))}

              {serviceFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Servisna naknada</span>
                  <span className="text-foreground">
                    {serviceFee.toFixed(2)} {currency}
                  </span>
                </div>
              )}

              {insuranceChoice === "yes" && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>✓ Osiguranje</span>
                  <span>
                    +{insuranceTotal.toFixed(2)} {currency}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-xl font-bold pt-4 border-t border-border mb-6">
              <span className="text-foreground">UKUPNO</span>
              <span className="text-primary">
                {grandTotal.toFixed(2)} {currency}
              </span>
            </div>

            <Button
              onClick={handleProceedToCheckout}
              className="w-full h-12 text-base font-semibold"
              size="lg"
              disabled={isProcessing || insuranceChoice === null}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Procesiranje...
                </>
              ) : (
                "🔒 Nastavi na plaćanje"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              🔐 Sigurna SSL enkripcija • Zaštićeno plaćanje
            </p>
          </div>
        )}

        {/* Empty state */}
        {totalTickets === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Odaberite željeni broj karata za nastavak</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SimpleEventPage;
