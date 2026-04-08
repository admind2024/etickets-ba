import { useState, useEffect, useRef, useMemo } from "react";
import { SiteBanner } from "@/components/SiteBanner";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  useAboutEventBySlug,
  parseDescription,
  parseCategories,
  calculateServiceFee,
  calculateInsurance,
  formatEventDate,
  getCurrencySymbol,
} from "@/hooks/useAboutEvents";
import SEOHead from "@/components/SEOHead";
import { useAnalytics } from "@/hooks/useAnalytics";

type Language = "bs" | "en";

const translations = {
  bs: {
    loading: "Učitavanje...",
    eventNotFound: "Događaj nije pronađen",
    backToHome: "Povratak na početnu",
    back: "Nazad",
    selectSeats: "Izaberite sjedišta",
    tickets: "karte",
    cart: "Korpa",
    reviewPurchase: "PREGLED KUPOVINE",
    yourTickets: "TVOJE ULAZNICE",
    ticketsCount: "karte",
    sector: "Sektor",
    row: "Red",
    seat: "Sjedište",
    remove: "Ukloni",
    totalTickets: "Ukupno ulaznice",
    wantInsurance: "Želiš li osiguranje ulaznica?",
    required: "OBAVEZNO",
    selectOption: "Molimo izaberi jednu od opcija da bi nastavio kupovinu",
    yesInsurance: "Želim da osiguram ulaznice",
    fullRefund: "100% POVRAT",
    insuranceDesc: "Kompletna zaštita u slučaju nepredviđenih okolnosti. Pun povrat novca garantovan.",
    showDetails: "Vidi šta je pokriveno",
    hideDetails: "Sakrij detalje",
    noInsurance: "Ne želim osiguranje",
    noInsuranceDesc: "Nastavit ću bez dodatne zaštite",
    acceptTerms: "Prihvatam",
    insuranceTerms: "uslove osiguranja",
    orderReview: "Pregled narudžbe",
    ticketsLabel: "Ulaznice",
    insurance: "Osiguranje",
    serviceFee: "Servisna naknada",
    tableReservation: "Rezervacija stola",
    total: "UKUPNO",
    continuePayment: "Nastavi na plaćanje",
    processing: "Procesiranje...",
    securePayment: "Sigurna SSL enkripcija • Zaštićeno plaćanje",
    perTicket: "po karti",
    mainEntrance: "Glavni ulaz",
    clearView: "Jasan pogled",
    restrictedView: "Ograničen pogled",
    transportDelay: "Kašnjenje prevoza",
    courtSummons: "Poziv na sud",
    burglary: "Provala/krađa u stan",
    fire: "Požar u stanu/kući",
    flood: "Poplava u stanu/kući",
    fractures: "Prelomi kostiju",
    workIncapacity: "Nesposobnost za rad",
    childIllness: "Bolest djeteta",
    jobLoss: "Gubitak zaposlenja",
    seriousIllness: "Teška bolest",
    deathLoved: "Smrt bliske osobe",
    carAccident: "Saobraćajna nesreća",
    selectInsurance: "Molimo odaberite da li želite osiguranje.",
    acceptInsuranceTerms: "Morate prihvatiti uslove osiguranja!",
    seatsUnavailable: "Sjedišta nisu više dostupna. Molimo osvježite stranicu.",
    paymentError: "Greška pri plaćanju: ",
    contactSupport: "Molimo kontaktirajte podršku: support@etickets.me",
    language: "Jezik",
    categoryNotAvailable: "Ova kategorija trenutno nije dostupna za kupovinu.",
  },
  en: {
    loading: "Loading...",
    eventNotFound: "Event not found",
    backToHome: "Back to home",
    back: "Back",
    selectSeats: "Select seats",
    tickets: "tickets",
    cart: "Cart",
    reviewPurchase: "REVIEW PURCHASE",
    yourTickets: "YOUR TICKETS",
    ticketsCount: "tickets",
    sector: "Section",
    row: "Row",
    seat: "Seat",
    remove: "Remove",
    totalTickets: "Tickets total",
    wantInsurance: "Do you want ticket insurance?",
    required: "REQUIRED",
    selectOption: "Please select an option to continue with your purchase",
    yesInsurance: "I want to insure my tickets",
    fullRefund: "100% REFUND",
    insuranceDesc: "Complete protection in case of unforeseen circumstances. Full refund guaranteed.",
    showDetails: "See what's covered",
    hideDetails: "Hide details",
    noInsurance: "I don't want insurance",
    noInsuranceDesc: "I'll continue without additional protection",
    acceptTerms: "I accept the",
    insuranceTerms: "insurance terms",
    orderReview: "Order review",
    ticketsLabel: "Tickets",
    insurance: "Insurance",
    serviceFee: "Service fee",
    tableReservation: "Table reservation",
    total: "TOTAL",
    continuePayment: "Continue to payment",
    processing: "Processing...",
    securePayment: "Secure SSL encryption • Protected payment",
    perTicket: "per ticket",
    mainEntrance: "Main entrance",
    clearView: "Clear view",
    restrictedView: "Restricted view",
    transportDelay: "Transport delay",
    courtSummons: "Court summons",
    burglary: "Home burglary/theft",
    fire: "House fire",
    flood: "House flood",
    fractures: "Bone fractures",
    workIncapacity: "Work incapacity",
    childIllness: "Child illness",
    jobLoss: "Job loss",
    seriousIllness: "Serious illness",
    deathLoved: "Death of loved one",
    carAccident: "Traffic accident",
    selectInsurance: "Please select whether you want insurance.",
    acceptInsuranceTerms: "You must accept the insurance terms!",
    seatsUnavailable: "Seats are no longer available. Please refresh the page.",
    paymentError: "Payment error: ",
    contactSupport: "Please contact support: support@etickets.me",
    language: "Language",
    categoryNotAvailable: "This category is not available for purchase.",
  },
};

const languageFlags: Record<Language, string> = {
  bs: "🇧🇦",
  en: "🇬🇧",
};

const languageNames: Record<Language, string> = {
  bs: "Bosanski",
  en: "English",
};

interface SelectedSeat {
  id: string;
  label: string;
  number: string;
  category: string;
  sectionLabel: string;
  entrance: string;
  view: string;
  viewQuality: string;
  price: number;
  objectType?: string;
  isVipTable: boolean;
  tableFixedPrice: number;
  tableId: string;
}

interface PricingCategory {
  category: string;
  price: number;
  type?: "regular" | "table";
  tableFixedPrice?: number;
  description?: string;
}

const SeatSelection = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useAboutEventBySlug(slug);
  const { getCheckoutMetadata } = useAnalytics();

  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInitialized = useRef(false);

  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [insuranceChoice, setInsuranceChoice] = useState<"yes" | "no" | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [activeDescription, setActiveDescription] = useState<string | null>(null);

  const [posterMapa, setPosterMapa] = useState<string | null>(null);
  const [posterMapaLink, setPosterMapaLink] = useState<string | null>(null);

  const [language, setLanguage] = useState<Language>("bs");
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const t = translations[language];

  const detailedCategories = parseDescription(event?.description);
  const basicCategories = parseCategories(event?.categories);
  const ticketCategories = detailedCategories.length > 0 ? detailedCategories : basicCategories;

  const currencySymbol = getCurrencySymbol(event?.currency);
  const formattedDate = formatEventDate(event?.date);
  const eventTime = event?.event_time || "";
  const venue = event?.venue || "";
  const workspaceKey = event?.workspaceKey || "";
  const eventKeyOverride = searchParams.get("ek");
  const eventKey = eventKeyOverride || event?.eventKey || "";

  const demoPricingString = useMemo(() => {
    const pricing = ticketCategories.map((cat: any) => {
      const priceObj: PricingCategory = {
        category: cat.category,
        price: cat.price,
      };
      if (cat.type) {
        priceObj.type = cat.type;
      }
      if (cat.tableFixedPrice !== undefined) {
        priceObj.tableFixedPrice = Number(cat.tableFixedPrice);
      }
      if (cat.description) {
        priceObj.description = cat.description;
      }
      return priceObj;
    });

    return JSON.stringify(pricing);
  }, [ticketCategories]);

  const demoPricing = useMemo((): PricingCategory[] => {
    try {
      const parsed = JSON.parse(demoPricingString);
      return parsed;
    } catch {
      return [];
    }
  }, [demoPricingString]);

  // Pricing za Seatsio:
  // - Table kategorije: jednostavan format (category + price) da klik na sto = sve karte odjednom
  // - Ostale kategorije: ticket types format sa nativnim description prikazom na mobilnom
  const seatsIoPricing = useMemo(() => {
    const result = demoPricing.map((item) => {
      // Za stolove: koristi jednostavan format da sačuva "klikni sto = sve karte"
      if (item.type === "table") {
        return {
          category: item.category,
          price: Number(item.price),
        };
      }
      // Za ostale: ticket types format sa description
      const ticketType: any = {
        ticketType: "regular",
        price: Number(item.price),
        label: item.category,
      };
      if (item.description && item.description.trim() !== "") {
        ticketType.description = item.description;
      }
      return {
        category: item.category,
        ticketTypes: [ticketType],
      };
    });
    return result;
  }, [demoPricing]);

  const calculateTotalTableFixedPrice = (): number => {
    const tableFixedPrices = new Map<string, number>();

    selectedSeats.forEach((seat) => {
      if (seat.isVipTable && seat.tableFixedPrice > 0) {
        const tableId = seat.tableId || seat.id.split("-")[0];
        if (!tableFixedPrices.has(tableId)) {
          tableFixedPrices.set(tableId, seat.tableFixedPrice);
        }
      }
    });

    let total = 0;
    tableFixedPrices.forEach((price) => {
      total += price;
    });

    return total;
  };

  const basePrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const totalTableFixedPrice = calculateTotalTableFixedPrice();
  const combinedBasePrice = basePrice + totalTableFixedPrice;

  const serviceFee = calculateServiceFee(combinedBasePrice, selectedSeats.length, event?.serviceFeePercentage);
  const insurancePrice = calculateInsurance(combinedBasePrice);
  const totalPrice = combinedBasePrice + serviceFee + (insuranceChoice === "yes" ? insurancePrice : 0);

  const formatPrice = (amount: number) => {
    return amount.toFixed(2) + " " + currencySymbol;
  };

  useEffect(() => {
    const fetchPoster = async () => {
      try {
        const { data, error } = await supabase.from("Sponzori").select("*").limit(1).maybeSingle();
        if (error) {
          console.error("Greška pri učitavanju Sponzori:", error);
          return;
        }
        if (data) {
          if (data.posterMapa) {
            setPosterMapa(data.posterMapa);
          }
          if (data.posterMapaLInk) {
            setPosterMapaLink(data.posterMapaLInk);
          }
        }
      } catch (err) {
        console.error("Greška pri učitavanju postera:", err);
      }
    };
    fetchPoster();
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn-eu.seatsio.net/chart.js";
    script.async = true;
    script.onload = () => setIsChartReady(true);
    document.head.appendChild(script);

    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch (e) {}
      }
      chartInitialized.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isChartReady) return;
    if (!containerRef.current) return;
    if (!event) return;
    if (!workspaceKey) return;
    if (!eventKey) return;
    if (demoPricing.length === 0) return;
    if (chartInitialized.current) {
      return;
    }

    const seatsio = (window as any).seatsio;
    if (!seatsio) return;

    if (chartRef.current) {
      try {
        chartRef.current.destroy();
        chartRef.current = null;
      } catch (e) {}
    }

    chartInitialized.current = true;

    try {
      chartRef.current = new seatsio.SeatingChart({
        divId: "chart-container",
        workspaceKey: workspaceKey,
        event: eventKey,
        session: "start",
        pricing: seatsIoPricing,
        priceFormatter: (price: number) => price + " " + currencySymbol,
        language: "en",
        showLegend: false,
        showMinimap: true,
        categoryFilter: { enabled: true, multiSelect: false, zoomOnSelect: true },
        objectPopover: {
          showAvailability: true,
          showCategory: true,
          showLabel: true,
          showPricing: true,
          showUnavailableNotice: true,
          confirmSelection: "always",
          stylizedLabel: true,
        },
        onHoldTokenCreated: (token: string) => {
          setHoldToken(token);
        },
        onChartRendered: (chart: any) => {
          if (chart && chart.holdToken) {
            setHoldToken(chart.holdToken);
          }
        },
        onHoldFailed: (objects: any[], ticketTypes: any[]) => {
          alert(t.seatsUnavailable);
        },
        onHoldSucceeded: (objects: any[], ticketTypes: any[]) => {
          if (chartRef.current && chartRef.current.holdToken) {
            setHoldToken(chartRef.current.holdToken);
          }
        },
        onObjectSelected: (object: any) => {
          const categoryLabel = object.category?.label || object.category || "Unknown";

          const categoryItem = demoPricing.find(
            (item) => item.category.trim().toLowerCase() === categoryLabel.trim().toLowerCase(),
          );

          const price = categoryItem?.price || 0;

          if (!categoryItem || price === 0) {
            if (chartRef.current) {
              try {
                chartRef.current.deselectObjects([object.id]);
              } catch (e) {}
            }
            alert(t.categoryNotAvailable);
            return;
          }

          const labelParts = object.label ? object.label.split("-").map((s: string) => s.trim()) : [];

          let viewQuality = "clear";
          if (object.restrictedView) {
            viewQuality = "restricted";
          } else if (object.viewQuality) {
            viewQuality = object.viewQuality;
          }

          let isVipTable = false;
          let tableFixedPrice = 0;

          if (categoryItem && categoryItem.type === "table") {
            isVipTable = true;
            tableFixedPrice = Number(categoryItem.tableFixedPrice) || 0;
          }

          const seat: SelectedSeat = {
            id: object.id,
            label: labelParts.length >= 2 ? labelParts[labelParts.length - 2] : categoryLabel,
            number: labelParts.length >= 1 ? labelParts[labelParts.length - 1] : "",
            category: categoryLabel,
            sectionLabel: object.labels?.section || categoryLabel,
            entrance: object.entrance || object.labels?.entrance || t.mainEntrance,
            view: object.restrictedView ? t.restrictedView : t.clearView,
            viewQuality: viewQuality,
            price: price,
            objectType: object.objectType || "seat",
            isVipTable: isVipTable,
            tableFixedPrice: tableFixedPrice,
            tableId: object.tableId || (object.id ? object.id.split("-")[0].trim() : "sto"),
          };

          setSelectedSeats((prev) => [...prev, seat]);
        },
        onObjectDeselected: (object: any) => {
          setSelectedSeats((prev) => prev.filter((seat) => seat.id !== object.id));
        },
      }).render();
    } catch (error) {
      console.error("Error initializing chart:", error);
      chartInitialized.current = false;
    }
  }, [isChartReady, event, workspaceKey, eventKey, demoPricingString, currencySymbol, t]);

  const removeSeat = (seatId: string) => {
    setSelectedSeats((prev) => prev.filter((seat) => seat.id !== seatId));
    if (chartRef.current) {
      try {
        chartRef.current.deselectObjects([seatId]);
      } catch (e) {}
    }
    if (selectedSeats.length <= 1) setIsCartOpen(false);
  };

  const openCart = () => {
    if (selectedSeats.length === 0) return;
    setInsuranceChoice(null);
    setAcceptTerms(false);
    setShowBenefits(false);
    setIsCartOpen(true);
  };

  const closeCart = () => {
    setIsCartOpen(false);
    setIsProcessing(false);
  };

  const proceedToPayment = async () => {
    if (insuranceChoice === null) {
      alert(t.selectInsurance);
      return;
    }
    if (insuranceChoice === "yes" && !acceptTerms) {
      alert(t.acceptInsuranceTerms);
      return;
    }

    setIsProcessing(true);

    try {
      let currentHoldToken = holdToken;
      if (!currentHoldToken && chartRef.current) {
        currentHoldToken = chartRef.current.holdToken;
      }

      const vipTables = new Map<string, { id: string; price: number; seats: string[] }>();
      selectedSeats.forEach((seat) => {
        if (seat.isVipTable && seat.tableFixedPrice > 0) {
          const tableId = seat.tableId || seat.id.split("-")[0];
          if (!vipTables.has(tableId)) {
            vipTables.set(tableId, {
              id: tableId,
              price: seat.tableFixedPrice,
              seats: [],
            });
          }
          vipTables.get(tableId)!.seats.push(seat.id);
        }
      });

      const checkoutData = {
        eventId: eventKey,
        holdToken: currentHoldToken,
        selectedSeats: selectedSeats.map((seat) => ({
          id: seat.id,
          category: seat.category,
          price: seat.price,
          sectionLabel: seat.sectionLabel,
          entrance: seat.entrance,
          view: seat.view,
          viewQuality: seat.viewQuality,
          label: seat.label,
          number: seat.number,
          objectType: seat.objectType || "seat",
          isVipTable: seat.isVipTable,
          tableFixedPrice: seat.tableFixedPrice,
          tableId: seat.tableId,
        })),
        vipTables: Array.from(vipTables.values()),
        eventDetails: {
          name: event?.name || "",
          date: event?.date || "",
          time: eventTime,
          venue: venue,
        },
        hasInsurance: insuranceChoice === "yes",
        insurancePrice: insuranceChoice === "yes" ? insurancePrice : 0,
        subtotal: basePrice,
        totalTableFixedPrice: totalTableFixedPrice,
        serviceFee: serviceFee,
        total: totalPrice,
        currency: event?.currency || "EUR",
        analytics: getCheckoutMetadata(),
      };

      const { data, error } = await supabase.functions.invoke("create-checkout-session-seat", {
        body: checkoutData,
      });

      if (error) {
        throw new Error(error.message || "Greška pri pozivu funkcije");
      }

      if (data?.success && data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.message || "Greška pri kreiranju checkout sesije");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(t.paymentError + error.message + "\n\n" + t.contactSupport);
      setIsProcessing(false);
    }
  };

  const PosterBanner = ({ className = "" }: { className?: string }) => {
    if (!posterMapa) return null;

    const imgElement = (
      <img
        src={posterMapa}
        alt="Sponzor"
        className="w-full h-auto object-cover"
        style={{ aspectRatio: "1000/300" }}
        loading="lazy"
      />
    );

    if (posterMapaLink) {
      return (
        <a
          href={posterMapaLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`block rounded-xl overflow-hidden hover:opacity-90 transition-opacity shadow-sm ${className}`}
        >
          {imgElement}
        </a>
      );
    }

    return <div className={`rounded-xl overflow-hidden shadow-sm ${className}`}>{imgElement}</div>;
  };

  const LanguageSelector = () => (
    <div className="relative">
      <button
        onClick={() => setShowLangDropdown(!showLangDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all text-sm font-medium text-gray-700"
      >
        <span className="text-xl">{languageFlags[language]}</span>
        <span>{languageNames[language]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showLangDropdown ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {showLangDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
          <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  setShowLangDropdown(false);
                }}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                  language === lang ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-700"
                }`}
              >
                <span className="text-xl">{languageFlags[lang]}</span>
                <span>{languageNames[lang]}</span>
                {language === lang && (
                  <svg className="w-4 h-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">{t.loading}</span>
      </div>
    );
  }

  if (!event || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">{t.eventNotFound}</h1>
          <Button asChild>
            <Link to="/">{t.backToHome}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteBanner />
      <SEOHead
        title={`Izbor sjedišta - ${event.name} | etickets`}
        description={`Izaberite sjedišta za ${event.name} - ${formattedDate}, ${venue}`}
        type="event"
        canonicalSlug={`/events/${event.slug}`}
        noIndex
      />

      <style>{`
        @keyframes cartPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 20px 10px rgba(37, 99, 235, 0.3);
          }
        }
        @keyframes cartShake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-2px) rotate(-2deg); }
          20% { transform: translateX(2px) rotate(2deg); }
          30% { transform: translateX(-2px) rotate(-1deg); }
          40% { transform: translateX(2px) rotate(1deg); }
          50% { transform: translateX(-1px) rotate(0deg); }
          60% { transform: translateX(1px) rotate(0deg); }
          70%, 100% { transform: translateX(0) rotate(0deg); }
        }
        @keyframes badgePop {
          0% { transform: scale(0.5); }
          50% { transform: scale(1.4); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes badgeGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(37, 99, 235, 0.5); }
          50% { box-shadow: 0 0 20px rgba(37, 99, 235, 0.9), 0 0 30px rgba(37, 99, 235, 0.5); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(37, 99, 235, 0.5); }
          50% { border-color: rgba(37, 99, 235, 1); }
        }
        @keyframes ringPulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        .cart-animated {
          animation: cartPulse 1.5s ease-in-out infinite, cartShake 3s ease-in-out infinite;
          position: relative;
        }
        .cart-animated::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 12px;
          border: 2px solid transparent;
          animation: borderPulse 1s ease-in-out infinite;
        }
        .cart-animated::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 10px;
          animation: ringPulse 2s ease-out infinite;
        }
        .cart-animated:hover {
          animation: none;
          transform: scale(1.05);
          box-shadow: 0 0 25px rgba(37, 99, 235, 0.5);
        }
        .cart-animated:hover::before,
        .cart-animated:hover::after {
          animation: none;
        }
        .badge-animated {
          animation: badgePop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), badgeGlow 1.5s ease-in-out infinite;
        }
        .cart-shimmer {
          background: linear-gradient(90deg, #2563eb 0%, #3b82f6 20%, #60a5fa 40%, #93c5fd 50%, #60a5fa 60%, #3b82f6 80%, #2563eb 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s linear infinite;
        }
        .cart-bar-glow {
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.3), inset 0 0 0 1px rgba(37, 99, 235, 0.2);
          border-color: rgba(37, 99, 235, 0.4) !important;
        }
      `}</style>

      <div className="w-full max-w-[1200px] mx-auto px-3 py-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </button>
        <h1 className="text-lg md:text-xl font-semibold text-gray-900 leading-tight">{event.name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-gray-600">
          <span>{venue}</span>
          <span>{formattedDate}</span>
          {eventTime && <span>{eventTime}</span>}
        </div>
      </div>

      <div className="w-full max-w-[1200px] mx-auto px-3">
        <div
          className={`my-2 bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center transition-all duration-300 ${selectedSeats.length > 0 ? "cart-bar-glow" : ""}`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                selectedSeats.length > 0 ? "bg-blue-600 text-white badge-animated" : "bg-gray-300 text-gray-600"
              }`}
              key={selectedSeats.length}
            >
              {selectedSeats.length}
            </div>
            <span
              className={`text-sm transition-colors ${selectedSeats.length > 0 ? "text-blue-700 font-medium" : "text-gray-600"}`}
            >
              {selectedSeats.length === 0
                ? t.selectSeats
                : selectedSeats.length + " " + t.tickets + " - " + formatPrice(combinedBasePrice)}
            </span>
          </div>
          <button
            onClick={openCart}
            disabled={selectedSeats.length === 0}
            className={`relative px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:bg-gray-300 disabled:cursor-not-allowed ${
              selectedSeats.length > 0 ? "cart-shimmer cart-animated" : "bg-gray-300"
            }`}
          >
            {t.cart}
          </button>
        </div>
      </div>

      <div className="w-full max-w-[1200px] mx-auto px-3">
        <div
          ref={containerRef}
          id="chart-container"
          className="w-full bg-white rounded-lg"
          style={{ height: "calc(100vh - 220px)", minHeight: "350px" }}
        />
        <PosterBanner className="md:hidden mt-2 mb-3" />
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="fixed inset-0 bg-gray-100 overflow-y-auto">
            <div className="max-w-[600px] mx-auto px-3 pb-6">
              <div className="sticky top-0 bg-gray-100 z-10 py-3 flex items-center justify-between">
                <div className="w-10" />
                <h1 className="text-lg font-bold text-gray-900">{t.reviewPurchase}</h1>
                <button
                  onClick={closeCart}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-xl text-gray-500 hover:border-blue-600 hover:text-blue-600"
                >
                  ✕
                </button>
              </div>

              <div className="flex justify-end mb-3">
                <LanguageSelector />
              </div>

              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold">
                      {t.yourTickets}
                    </span>
                    <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                      {selectedSeats.length} {t.ticketsCount}
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{event.name}</h2>
                  <div className="text-gray-500 text-xs md:text-sm mb-4">
                    <div>
                      {formattedDate} {eventTime}
                    </div>
                    <div>{venue}</div>
                  </div>

                  <div className="space-y-3">
                    {selectedSeats.map((seat) => (
                      <div
                        key={seat.id}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden flex"
                        style={{ background: "linear-gradient(to right, #ffffff, #f8faff)" }}
                      >
                        <div className="flex-1 p-3 md:p-4">
                          <h3 className="text-sm md:text-base font-bold text-gray-900 mb-2 line-clamp-1">
                            {event.name}
                          </h3>
                          <div className="text-xs text-gray-500 mb-3">
                            <div className="flex items-center gap-1 mb-1">
                              <span>{formattedDate}</span>
                              {eventTime && <span>• {eventTime}</span>}
                            </div>
                            <div className="line-clamp-1">{venue}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center mb-3">
                            <div>
                              <div className="text-[9px] md:text-[10px] text-gray-500 uppercase">{t.sector}</div>
                              <div className="text-xs md:text-sm font-semibold text-gray-900 truncate">
                                {seat.sectionLabel}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] md:text-[10px] text-gray-500 uppercase">{t.row}</div>
                              <div className="text-xs md:text-sm font-semibold text-gray-900">{seat.label}</div>
                            </div>
                            <div>
                              <div className="text-[9px] md:text-[10px] text-gray-500 uppercase">{t.seat}</div>
                              <div className="text-xs md:text-sm font-semibold text-gray-900">{seat.number}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                              <span>{seat.view}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                              <span>{seat.entrance}</span>
                            </div>
                          </div>
                        </div>
                        <div
                          className="w-24 md:w-32 p-3 md:p-4 flex flex-col justify-between items-center border-l-2 border-dashed border-gray-300"
                          style={{ background: "#f8faff" }}
                        >
                          <div className="text-center">
                            <div className="text-base md:text-lg font-bold text-gray-900">
                              {formatPrice(seat.price)}
                            </div>
                            <div className="text-[10px] text-gray-500">{t.perTicket}</div>
                          </div>
                          <button
                            onClick={() => removeSeat(seat.id)}
                            className="w-full px-2 py-1.5 md:py-2 bg-red-500 text-white rounded-lg text-[10px] md:text-xs font-semibold hover:bg-red-600 uppercase tracking-wide"
                          >
                            {t.remove}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">{t.totalTickets}</span>
                    <span className="text-2xl font-extrabold text-gray-900">{formatPrice(combinedBasePrice)}</span>
                  </div>
                </div>

                <div className="p-4 md:p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-base md:text-lg font-bold text-gray-900">{t.wantInsurance}</h3>
                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {t.required}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">{t.selectOption}</p>

                  <div
                    onClick={() => setInsuranceChoice("yes")}
                    className={`rounded-xl p-4 mb-3 cursor-pointer border-2 transition-all ${
                      insuranceChoice === "yes"
                        ? "border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-lg scale-[1.01]"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          insuranceChoice === "yes" ? "border-green-500" : "border-gray-300"
                        }`}
                      >
                        {insuranceChoice === "yes" && <div className="w-3.5 h-3.5 rounded-full bg-green-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm md:text-base font-bold text-gray-900">✅ {t.yesInsurance}</span>
                            <span className="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                              {t.fullRefund}
                            </span>
                          </div>
                          <span className="text-base md:text-lg font-bold text-green-600 flex-shrink-0">
                            +{formatPrice(insurancePrice)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">{t.insuranceDesc}</p>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBenefits(!showBenefits);
                          }}
                          className="text-xs text-green-600 font-semibold border border-green-500 px-3 py-1.5 rounded-lg hover:bg-green-500 hover:text-white transition-colors"
                        >
                          {showBenefits ? `▲ ${t.hideDetails}` : `▼ ${t.showDetails}`}
                        </button>

                        <div
                          className={`overflow-hidden transition-all duration-300 ${showBenefits ? "max-h-96 mt-3 pt-3 border-t border-green-200" : "max-h-0"}`}
                        >
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                            <div className="flex items-center gap-2">🚌 {t.transportDelay}</div>
                            <div className="flex items-center gap-2">⚖️ {t.courtSummons}</div>
                            <div className="flex items-center gap-2">🏠 {t.burglary}</div>
                            <div className="flex items-center gap-2">🔥 {t.fire}</div>
                            <div className="flex items-center gap-2">💧 {t.flood}</div>
                            <div className="flex items-center gap-2">🦴 {t.fractures}</div>
                            <div className="flex items-center gap-2">💼 {t.workIncapacity}</div>
                            <div className="flex items-center gap-2">👶 {t.childIllness}</div>
                            <div className="flex items-center gap-2">📋 {t.jobLoss}</div>
                            <div className="flex items-center gap-2">🏥 {t.seriousIllness}</div>
                            <div className="flex items-center gap-2">💔 {t.deathLoved}</div>
                            <div className="flex items-center gap-2">🚗 {t.carAccident}</div>
                          </div>
                        </div>

                        {insuranceChoice === "yes" && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setAcceptTerms(!acceptTerms);
                            }}
                            className={`mt-3 pt-3 border-t border-green-200 flex items-center gap-3 cursor-pointer rounded-lg transition-colors ${
                              !acceptTerms ? "bg-red-50 -mx-4 -mb-4 px-4 py-3" : ""
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                acceptTerms ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"
                              }`}
                            >
                              {acceptTerms && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                            <span className="text-xs text-gray-700">
                              {t.acceptTerms}{" "}
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  alert("Uslovi osiguranja...");
                                }}
                                className="text-green-600 underline font-semibold"
                              >
                                {t.insuranceTerms}
                              </a>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setInsuranceChoice("no");
                      setAcceptTerms(false);
                    }}
                    className={`rounded-xl p-4 cursor-pointer border-2 transition-all ${
                      insuranceChoice === "no"
                        ? "border-gray-500 bg-gray-100 shadow-lg scale-[1.01]"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          insuranceChoice === "no" ? "border-gray-500" : "border-gray-300"
                        }`}
                      >
                        {insuranceChoice === "no" && <div className="w-3.5 h-3.5 rounded-full bg-gray-500" />}
                      </div>
                      <div>
                        <span className="text-sm md:text-base font-bold text-gray-900">❌ {t.noInsurance}</span>
                        <p className="text-xs text-gray-500 mt-1">{t.noInsuranceDesc}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.orderReview}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>
                        {t.ticketsLabel} ({selectedSeats.length}x)
                      </span>
                      <span className="font-medium text-gray-700">{formatPrice(basePrice)}</span>
                    </div>
                    {totalTableFixedPrice > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>{t.tableReservation}</span>
                        <span className="font-medium text-gray-700">{formatPrice(totalTableFixedPrice)}</span>
                      </div>
                    )}
                    {insuranceChoice === "yes" && (
                      <div className="flex justify-between text-green-600">
                        <span>✓ {t.insurance}</span>
                        <span className="font-medium">+{formatPrice(insurancePrice)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-500">
                      <span>{t.serviceFee}</span>
                      <span className="font-medium text-gray-700">{formatPrice(serviceFee)}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center mb-4">
                    <span className="text-base font-bold text-gray-900">{t.total}</span>
                    <span className="text-2xl font-extrabold text-gray-900">{formatPrice(totalPrice)}</span>
                  </div>
                  <button
                    onClick={proceedToPayment}
                    disabled={isProcessing || insuranceChoice === null}
                    className="w-full py-3 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t.processing}
                      </>
                    ) : (
                      `🔒 ${t.continuePayment}`
                    )}
                  </button>
                  <p className="text-center text-[10px] text-gray-400 mt-2">🔐 {t.securePayment}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatSelection;
