import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Shield,
  Clock,
  AlertCircle,
  CreditCard,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripe } from "@/lib/stripe";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type Language = "me" | "en";

interface TicketItem {
  category: string;
  price: number;
  quantity: number;
  description?: string;
}

interface FestivalCheckoutData {
  eventId: string;
  tickets: TicketItem[];
  eventDetails: {
    name: string;
    date: string;
    time: string;
    venue: string;
  };
  subtotal: number;
  serviceFee: number;
  total: number;
  currency: string;
  analytics?: Record<string, string>;
  eventSlug?: string;
}

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  city: string;
  address: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// POSTAL CODE → CITY MAPPING (Montenegro + region)
// ═══════════════════════════════════════════════════════════════════════════

const POSTAL_CITY_MAP: Record<string, string> = {
  // Crna Gora
  "81000": "Podgorica", "81101": "Podgorica", "81102": "Podgorica",
  "81250": "Cetinje", "81300": "Rožaje", "81320": "Plav",
  "81400": "Nikšić", "81410": "Danilovgrad",
  "84000": "Bijelo Polje", "84210": "Pljevlja", "84220": "Mojkovac",
  "84300": "Berane", "84310": "Andrijevica", "84320": "Kolašin",
  "85000": "Bar", "85310": "Budva", "85320": "Tivat",
  "85330": "Kotor", "85340": "Herceg Novi", "85360": "Ulcinj",
  "81200": "Žabljak", "84340": "Petnjica", "81260": "Tuzi",
  // Srbija (najčešći)
  "11000": "Beograd", "21000": "Novi Sad", "18000": "Niš",
  "34000": "Kragujevac", "36000": "Kraljevo", "31000": "Užice",
  // BiH (najčešći)
  "71000": "Sarajevo", "78000": "Banja Luka", "75000": "Tuzla",
  "88000": "Mostar", "76000": "Bijeljina", "73000": "Goražde",
  // Hrvatska (najčešći)
  "10000": "Zagreb", "21000": "Split", "51000": "Rijeka",
  "31000": "Osijek", "20000": "Dubrovnik", "23000": "Zadar",
};

async function lookupCity(postalCode: string, country: string): Promise<string> {
  // First check local map
  const local = POSTAL_CITY_MAP[postalCode];
  if (local) return local;

  // Fallback to free API
  try {
    const res = await fetch(`https://api.zippopotam.us/${country.toLowerCase()}/${postalCode}`);
    if (res.ok) {
      const data = await res.json();
      return data?.places?.[0]?.["place name"] || "";
    }
  } catch {}
  return "";
}

// ═══════════════════════════════════════════════════════════════════════════
// BIN DISCOUNT CONFIG (loaded from Supabase bin_discounts table)
// ═══════════════════════════════════════════════════════════════════════════

interface BinDiscountConfig {
  bin: string;
  bankName: string;
  percentage: number;
}

// Cache loaded from DB
let _binDiscountsCache: BinDiscountConfig[] | null = null;
let _binDiscountsLoading: Promise<BinDiscountConfig[]> | null = null;

async function loadBinDiscounts(): Promise<BinDiscountConfig[]> {
  if (_binDiscountsCache) return _binDiscountsCache;
  if (_binDiscountsLoading) return _binDiscountsLoading;

  _binDiscountsLoading = supabase
    .from("bin_discounts")
    .select("bin, bank_name, percentage")
    .eq("active", true)
    .then(({ data }) => {
      const discounts = (data || []).map((d: any) => ({
        bin: d.bin,
        bankName: d.bank_name,
        percentage: d.percentage,
      }));
      _binDiscountsCache = discounts;
      return discounts;
    });

  return _binDiscountsLoading;
}

function findBinDiscountSync(cardNumber: string): BinDiscountConfig | null {
  if (!cardNumber || cardNumber.length < 6 || !_binDiscountsCache) return null;
  const bin = cardNumber.substring(0, 6);
  return _binDiscountsCache.find((d) => d.bin === bin) || null;
}

async function findBinDiscount(cardNumber: string): Promise<BinDiscountConfig | null> {
  if (!cardNumber || cardNumber.length < 6) return null;
  const discounts = await loadBinDiscounts();
  const bin = cardNumber.substring(0, 6);
  return discounts.find((d) => d.bin === bin) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════

const translations = {
  me: {
    loading: "Ucitavanje...",
    loadingPayment: "Ucitavanje placanja...",
    reservationExpires: "Rezervacija istice za",
    reservationExpired: "Vrijeme rezervacije je isteklo. Molimo izaberite karte ponovo.",

    personalData: "Licni podaci",
    fullName: "Ime i prezime",
    fullNamePlaceholder: "Vase ime i prezime",
    fullNameRequired: "Ime i prezime je obavezno",
    email: "Email adresa",
    emailPlaceholder: "vasa@email.com",
    emailRequired: "Email je obavezan",
    emailInvalid: "Neispravan email format",
    phone: "Broj telefona",
    phonePlaceholder: "6X XXX XXX",
    phoneRequired: "Broj telefona je obavezan",
    phoneInvalid: "Neispravan format broja telefona",

    billingCountry: "Drzava",

    wantInsurance: "Zelis li osiguranje ulaznica?",
    required: "OBAVEZNO",
    selectInsuranceOption: "Molimo izaberi jednu od opcija da bi nastavio kupovinu",
    yesInsurance: "Zelim da osiguram ulaznice",
    fullRefund: "100% POVRAT",
    insuranceDesc: "Kompletna zastita u slucaju nepredvidjenih okolnosti. Pun povrat novca garantovan.",
    showDetails: "Vidi sta je pokriveno",
    hideDetails: "Sakrij detalje",
    noInsurance: "Ne zelim osiguranje",
    noInsuranceDesc: "Nastavicu bez dodatne zastite",
    acceptTermsText: "Prihvatam",
    insuranceTerms: "uslove osiguranja",
    selectInsurance: "Molimo odaberite da li zelite osiguranje.",
    acceptInsuranceTerms: "Morate prihvatiti uslove osiguranja!",

    transportDelay: "Kasnjenje prevoza",
    courtSummons: "Poziv na sud",
    burglary: "Provala/kradja u stan",
    fire: "Pozar u stanu/kuci",
    flood: "Poplava u stanu/kuci",
    fractures: "Prelomi kostiju",
    workIncapacity: "Nesposobnost za rad",
    childIllness: "Bolest djeteta",
    jobLoss: "Gubitak zaposlenja",
    seriousIllness: "Teska bolest",
    deathLoved: "Smrt bliske osobe",
    carAccident: "Saobracajna nesreca",

    orderReview: "Pregled narudzbe",
    ticketsLabel: "Ulaznice",
    insurance: "Osiguranje",
    serviceFee: "Servisna naknada",
    discount: "Popust",
    total: "UKUPNO",

    payment: "Placanje",
    paymentLoadError: "Greska pri ucitavanju placanja",
    paymentProcessError: "Greska pri placanju",
    processing: "Procesiranje...",
    pay: "Plati",
    securePayment: "Sigurna SSL enkripcija \u2022 Zasticeno placanje",

    continueToPayment: "Nastavi na placanje",
    creatingPayment: "Sacekajte...",
    cancelPurchase: "Otkazi kupovinu",
    cancelConfirm: "Da li ste sigurni da zelite otkazati kupovinu?",

    step1: "Podaci",
    step2: "Placanje",
    back: "Nazad",

    binDiscountDetected: "Popust detektovan!",
    binDiscountDesc: "kartica - popust",
  },
  en: {
    loading: "Loading...",
    loadingPayment: "Loading payment...",
    reservationExpires: "Reservation expires in",
    reservationExpired: "Reservation time has expired. Please select tickets again.",

    personalData: "Personal information",
    fullName: "Full name",
    fullNamePlaceholder: "Your full name",
    fullNameRequired: "Full name is required",
    email: "Email address",
    emailPlaceholder: "your@email.com",
    emailRequired: "Email is required",
    emailInvalid: "Invalid email format",
    phone: "Phone number",
    phonePlaceholder: "6X XXX XXX",
    phoneRequired: "Phone number is required",
    phoneInvalid: "Invalid phone number format",

    billingCountry: "Country",

    wantInsurance: "Do you want ticket insurance?",
    required: "REQUIRED",
    selectInsuranceOption: "Please select an option to continue with your purchase",
    yesInsurance: "I want to insure my tickets",
    fullRefund: "100% REFUND",
    insuranceDesc: "Complete protection in case of unforeseen circumstances. Full refund guaranteed.",
    showDetails: "See what's covered",
    hideDetails: "Hide details",
    noInsurance: "I don't want insurance",
    noInsuranceDesc: "I'll continue without additional protection",
    acceptTermsText: "I accept the",
    insuranceTerms: "insurance terms",
    selectInsurance: "Please select whether you want insurance.",
    acceptInsuranceTerms: "You must accept the insurance terms!",

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

    orderReview: "Order review",
    ticketsLabel: "Tickets",
    insurance: "Insurance",
    serviceFee: "Service fee",
    discount: "Discount",
    total: "TOTAL",

    payment: "Payment",
    paymentLoadError: "Error loading payment",
    paymentProcessError: "Payment error",
    processing: "Processing...",
    pay: "Pay",
    securePayment: "Secure SSL encryption \u2022 Protected payment",

    continueToPayment: "Continue to payment",
    creatingPayment: "Please wait...",
    cancelPurchase: "Cancel purchase",
    cancelConfirm: "Are you sure you want to cancel the purchase?",

    step1: "Details",
    step2: "Payment",
    back: "Back",

    binDiscountDetected: "Discount detected!",
    binDiscountDesc: "card - discount",
  },
};

const languageFlags: Record<Language, string> = {
  me: "\u{1F1F2}\u{1F1EA}",
  en: "\u{1F1EC}\u{1F1E7}",
};

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE APPEARANCE
// ═══════════════════════════════════════════════════════════════════════════

const stripeAppearance = {
  theme: "stripe" as const,
  variables: {
    colorBackground: "#ffffff",
    colorText: "#1a1a1a",
    colorTextSecondary: "#4a5568",
    colorPrimary: "#2563eb",
    colorDanger: "#dc2626",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    borderRadius: "8px",
    colorInputText: "#000000",
    colorInputBackground: "#ffffff",
    colorInputPlaceholder: "#9ca3af",
  },
  rules: {
    ".Input": {
      color: "#000000",
      backgroundColor: "#ffffff",
      borderColor: "#d1d5db",
    },
    ".Input:focus": {
      borderColor: "#2563eb",
      boxShadow: "0 0 0 2px rgba(37, 99, 235, 0.2)",
    },
    ".Label": { color: "#374151" },
    ".Tab": { color: "#374151", backgroundColor: "#ffffff" },
    ".Tab--selected": { color: "#2563eb", backgroundColor: "#eff6ff" },
  },
};

const TIMER_MINUTES = 15;

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT SECTION (inside Elements provider — PaymentIntent flow)
// ═══════════════════════════════════════════════════════════════════════════

function PaymentSection({
  total,
  subtotal,
  currency,
  t,
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  customerPostalCode,
  customerCity,
  billingCountry,
  paymentIntentId,
  onBinDiscount,
}: {
  total: number;
  subtotal: number;
  currency: string;
  t: (typeof translations)["me"];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerPostalCode: string;
  customerCity: string;
  billingCountry: string;
  paymentIntentId: string;
  onBinDiscount: (discount: BinDiscountConfig | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [isCheckingBin, setIsCheckingBin] = useState(false);
  const [localDiscount, setLocalDiscount] = useState<BinDiscountConfig | null>(null);
  const [cardBrand, setCardBrand] = useState("");
  const binCheckedRef = useRef(false);

  // Manual BIN input for instant discount check (before Stripe returns iin)
  const [manualBin, setManualBin] = useState("");
  const handleManualBin = async (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 6);
    setManualBin(clean);
    if (clean.length === 6) {
      const discount = await findBinDiscount(clean);
      setLocalDiscount(discount);
      onBinDiscount(discount);
    } else if (clean.length < 6 && localDiscount) {
      setLocalDiscount(null);
      onBinDiscount(null);
    }
  };

  // Auto-detect BIN when card fields are complete (like your Wix project)
  const handlePaymentElementChange = async (event: any) => {
    // When card is complete, auto-detect BIN via createPaymentMethod
    if (event.complete && !binCheckedRef.current && stripe && elements) {
      binCheckedRef.current = true;
      setIsCheckingBin(true);

      // Small delay to let Stripe iframe fully sync
      await new Promise((r) => setTimeout(r, 500));

      try {
        const { error: submitError } = await elements.submit();
        if (submitError) {
          console.log("Submit error during BIN check:", submitError.message);
          setIsCheckingBin(false);
          binCheckedRef.current = false;
          return;
        }

        const { error, paymentMethod } = await stripe.createPaymentMethod({
          elements,
          params: {
            billing_details: {
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              address: {
                line1: customerAddress,
                line2: "",
                city: customerCity,
                state: "",
                postal_code: customerPostalCode,
                country: billingCountry,
              },
            },
          },
        });

        if (error) {
          console.log("BIN check createPaymentMethod error:", error.message);
          setIsCheckingBin(false);
          binCheckedRef.current = false;
          return;
        }

        if (paymentMethod) {
          const brand = paymentMethod.card?.brand || "";
          setCardBrand(brand);

          // Frontend may not return iin — retrieve full card data from backend
          const { data: binData } = await supabase.functions.invoke(
            "create-checkout-session-festival",
            {
              body: {
                action: "detect_bin",
                paymentMethodId: paymentMethod.id,
              },
            }
          );

          const iin = binData?.iin || (paymentMethod.card as any)?.iin || "";
          const issuer = binData?.issuer || (paymentMethod.card as any)?.issuer || "";
          console.log("Card BIN detected:", JSON.stringify({ iin, issuer, brand, source: binData?.iin ? "backend" : "frontend" }));

          // Use iin from backend/frontend, or fall back to manual BIN input
          const binToCheck = iin || manualBin;
          if (binToCheck && binToCheck.length >= 6) {
            const discount = await findBinDiscount(binToCheck);
            setLocalDiscount(discount);
            onBinDiscount(discount);

            // If discount found, update PaymentIntent amount on backend
            if (discount) {
              const discountAmt = Math.round(subtotal * (discount.percentage / 100) * 100) / 100;
              const newTotal = total - discountAmt;
              const newAmountCents = Math.round(newTotal * 100);

              await supabase.functions.invoke("create-checkout-session-festival", {
                body: {
                  action: "update_amount",
                  paymentIntentId,
                  newAmount: newAmountCents,
                  discountBin: binToCheck,
                  discountPercentage: discount.percentage,
                  discountBankName: discount.bankName,
                },
              });
            }
          }
        }
      } catch (err: any) {
        console.error("BIN detection error:", err);
      } finally {
        setIsCheckingBin(false);
      }
    }

    // Reset BIN check if card changes (user clears/re-enters)
    if (!event.complete && binCheckedRef.current) {
      binCheckedRef.current = false;
      setLocalDiscount(null);
      onBinDiscount(null);
      setCardBrand("");
    }
  };

  // Pay button
  const handlePay = async () => {
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setPaymentError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setPaymentError(submitError.message || "Card validation error");
        setIsSubmitting(false);
        return;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `https://etickets.ba/uspjesno-placanje?payment_intent=${paymentIntentId}`,
          payment_method_data: {
            billing_details: {
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              address: {
                line1: customerAddress,
                line2: "",
                city: customerCity,
                state: "",
                postal_code: customerPostalCode,
                country: billingCountry,
              },
            },
          },
        },
      });

      if (error) {
        setPaymentError(error.message || t.paymentProcessError);
      }
    } catch (err: any) {
      setPaymentError(err.message || t.paymentProcessError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sym =
    currency.toUpperCase() === "EUR" ? "\u20AC" : currency.toUpperCase();

  const discountAmount = localDiscount
    ? Math.round(subtotal * (localDiscount.percentage / 100) * 100) / 100
    : 0;
  const finalTotal = total - discountAmount;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-600" />
        {t.payment}
      </h3>

      <PaymentElement
        id="payment-element"
        options={{
          layout: "accordion",
          fields: {
            billingDetails: { name: "never", email: "never", phone: "never", address: "never" },
          },
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
        className="light-mode-stripe"
        onReady={() => setPaymentElementReady(true)}
        onChange={handlePaymentElementChange}
      />

      {/* BIN checking indicator */}
      {isCheckingBin && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t.binDiscountDetected === "Popust detektovan!" ? "Provjera popusta..." : "Checking for discount..."}
        </div>
      )}

      {/* Discount banner - appears automatically after card BIN is detected */}
      {localDiscount && (
        <div className="bg-green-50 border-2 border-green-400 rounded-xl p-3 flex items-center gap-3">
          <Tag className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-700">{t.binDiscountDetected}</p>
            <p className="text-xs text-green-600">
              {localDiscount.bankName} — {localDiscount.percentage}% (-{discountAmount.toFixed(2)} {sym})
            </p>
          </div>
        </div>
      )}

      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {paymentError}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={isSubmitting || !paymentElementReady || isCheckingBin}
        className="w-full py-3.5 rounded-xl text-base font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 transition-all"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t.processing}
          </>
        ) : (
          <>
            {t.pay} {finalTotal.toFixed(2)} {sym}
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-gray-400">
        {t.securePayment}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function FestivalCheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [checkoutData, setCheckoutData] = useState<FestivalCheckoutData | null>(null);
  const [loading, setLoading] = useState(true);

  // Language
  const [language, setLanguage] = useState<Language>("me");
  const t = translations[language];

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form
  const [form, setForm] = useState<CustomerForm>({
    name: "",
    email: "",
    phone: "",
    postalCode: "",
    city: "",
    address: "",
  });
  const [cityLoading, setCityLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof CustomerForm, string>>
  >({});

  // Insurance
  const [insuranceChoice, setInsuranceChoice] = useState<"yes" | "no" | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [insuranceError, setInsuranceError] = useState<string | null>(null);

  // Phone prefix & billing country
  const [phonePrefix, setPhonePrefix] = useState("+382");
  const [billingCountry, setBillingCountry] = useState("ME");

  // Scroll to error
  const [shouldScrollToError, setShouldScrollToError] = useState(false);

  // Checkout session
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const stripePromise = getStripe();

  // BIN discount
  const [binDiscount, setBinDiscount] = useState<BinDiscountConfig | null>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════

  const insurancePrice = checkoutData
    ? Math.round(checkoutData.subtotal * 0.07 * 100) / 100
    : 0;

  const discountAmount = checkoutData && binDiscount
    ? Math.round(checkoutData.subtotal * (binDiscount.percentage / 100) * 100) / 100
    : 0;

  const displayTotal = checkoutData
    ? checkoutData.subtotal -
      discountAmount +
      checkoutData.serviceFee +
      (insuranceChoice === "yes" ? insurancePrice : 0)
    : 0;

  // ═══════════════════════════════════════════════════════════════════════
  // BIN DETECTION HANDLER
  // ═══════════════════════════════════════════════════════════════════════

  // Called from PaymentSection when BIN discount is detected via live input
  const handleBinDiscount = useCallback((discount: BinDiscountConfig | null) => {
    setBinDiscount(discount);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // DETECT PHONE PREFIX BY IP
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const countryToPrefix: Record<string, string> = {
      ME: "+382", RS: "+381", BA: "+387", HR: "+385", AL: "+355",
      MK: "+389", SI: "+386", XK: "+383", BG: "+359", RO: "+40",
      HU: "+36", GR: "+30", TR: "+90",
      AT: "+43", DE: "+49", CH: "+41", IT: "+39", FR: "+33",
      ES: "+34", PT: "+351", GB: "+44", IE: "+353", NL: "+31",
      BE: "+32", LU: "+352",
      DK: "+45", SE: "+46", NO: "+47", FI: "+358", IS: "+354",
      PL: "+48", CZ: "+420", SK: "+421", UA: "+380",
      LT: "+370", LV: "+371", EE: "+372",
      US: "+1", CA: "+1", BR: "+55", AR: "+54",
      AE: "+971", SA: "+966", IL: "+972",
      IN: "+91", CN: "+86", JP: "+81", KR: "+82",
      AU: "+61", NZ: "+64", ZA: "+27",
    };
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        if (data?.country_code) {
          if (countryToPrefix[data.country_code]) {
            setPhonePrefix(countryToPrefix[data.country_code]);
          }
          setBillingCountry(data.country_code);
        }
      })
      .catch(() => {});
    // Preload BIN discounts from database
    loadBinDiscounts();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // LOAD CHECKOUT DATA
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!slug) {
      navigate("/");
      return;
    }
    const stored = sessionStorage.getItem(`festivalCheckoutData_${slug}`);
    const startTime = sessionStorage.getItem(`festivalCheckoutStart_${slug}`);
    if (!stored || !startTime) {
      navigate(`/festival/${slug}`);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as FestivalCheckoutData;
      setCheckoutData(parsed);
      const elapsed = Date.now() - parseInt(startTime, 10);
      const remaining = Math.max(0, TIMER_MINUTES * 60 * 1000 - elapsed);
      if (remaining <= 0) {
        alert(translations.me.reservationExpired);
        sessionStorage.removeItem(`festivalCheckoutData_${slug}`);
        sessionStorage.removeItem(`festivalCheckoutStart_${slug}`);
        navigate(`/festival/${slug}`);
        return;
      }
      setTimeLeft(Math.floor(remaining / 1000));
      setLoading(false);
    } catch {
      navigate(`/festival/${slug}`);
    }
  }, [slug, navigate]);

  // ═══════════════════════════════════════════════════════════════════════
  // TIMER
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          alert(t.reservationExpired);
          sessionStorage.removeItem(`festivalCheckoutData_${slug}`);
          sessionStorage.removeItem(`festivalCheckoutStart_${slug}`);
          navigate(`/festival/${slug}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft > 0, slug, navigate]);

  // Scroll to first error
  useEffect(() => {
    if (!shouldScrollToError) return;
    setShouldScrollToError(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el =
          document.querySelector('[data-has-error="true"]') ||
          document.querySelector(".border-red-400") ||
          document.querySelector(".text-red-500");
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      });
    });
  }, [shouldScrollToError, formErrors, insuranceError]);

  // Body scroll lock
  useEffect(() => {
    if (showPaymentOverlay) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPaymentOverlay]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FORM
  // ═══════════════════════════════════════════════════════════════════════

  const updateField = (field: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field])
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Auto-fill city from postal code
  const handlePostalCodeChange = async (value: string) => {
    const clean = value.replace(/[^\d]/g, "").slice(0, 5);
    updateField("postalCode", clean);
    if (clean.length >= 4) {
      setCityLoading(true);
      const city = await lookupCity(clean, billingCountry);
      if (city) {
        setForm((prev) => ({ ...prev, city }));
        if (formErrors.city)
          setFormErrors((prev) => ({ ...prev, city: undefined }));
      }
      setCityLoading(false);
    }
  };

  const selectInsurance = (choice: "yes" | "no") => {
    setInsuranceChoice(choice);
    setInsuranceError(null);
    if (choice === "no") setAcceptTerms(false);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CustomerForm, string>> = {};
    if (!form.name.trim()) errors.name = t.fullNameRequired;
    if (!form.email.trim()) errors.email = t.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = t.emailInvalid;
    if (!form.phone.trim()) errors.phone = t.phoneRequired;
    else if (!/^[\d\s\-]{5,15}$/.test(form.phone.trim()))
      errors.phone = t.phoneInvalid;
    if (!form.postalCode.trim()) errors.postalCode = language === "me" ? "Poštanski broj je obavezan" : "Postal code is required";
    if (!form.address.trim()) errors.address = language === "me" ? "Adresa je obavezna" : "Address is required";
    // Insurance validation
    if (!insuranceChoice) {
      setInsuranceError(t.selectInsurance);
      setFormErrors(errors);
      return false;
    }
    if (insuranceChoice === "yes" && !acceptTerms) {
      setInsuranceError(t.acceptInsuranceTerms);
      setFormErrors(errors);
      return false;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CREATE CHECKOUT SESSION
  // ═══════════════════════════════════════════════════════════════════════

  const handleProceedToPayment = async () => {
    if (!validateForm()) {
      setShouldScrollToError(true);
      return;
    }
    if (!checkoutData) return;

    setIsCreatingSession(true);
    setSessionError(null);

    try {
      const body = {
        eventId: checkoutData.eventId,
        tickets: checkoutData.tickets,
        eventDetails: checkoutData.eventDetails,
        hasInsurance: insuranceChoice === "yes",
        insurancePrice: insuranceChoice === "yes" ? insurancePrice : 0,
        subtotal: checkoutData.subtotal,
        serviceFee: checkoutData.serviceFee,
        total: displayTotal,
        currency: checkoutData.currency,
        analytics: checkoutData.analytics,
        customerName: form.name.trim(),
        customerEmail: form.email.trim(),
        customerPhone: `${phonePrefix}${form.phone.trim().replace(/[\s\-]/g, "")}`,
        customerAddress: form.address.trim(),
        customerCity: form.city.trim(),
        customerZip: form.postalCode.trim(),
        customerCountry: billingCountry,
        binDiscount: binDiscount
          ? {
              applied: true,
              percentage: binDiscount.percentage,
              bin: binDiscount.bin,
              bankName: binDiscount.bankName,
            }
          : { applied: false, percentage: 0, bin: "", bankName: "" },
      };

      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session-festival",
        { body }
      );

      if (error) {
        const errMsg = data?.message || data?.error || error.message || "Error";
        throw new Error(errMsg);
      }
      if (!data?.success) throw new Error(data?.message || "Error creating session");

      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setShowPaymentOverlay(true);
    } catch (err: any) {
      console.error("Session error:", err);
      setSessionError(err.message || "Error creating payment");
    } finally {
      setIsCreatingSession(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CANCEL
  // ═══════════════════════════════════════════════════════════════════════

  const handleCancel = useCallback(() => {
    if (confirm(t.cancelConfirm)) {
      sessionStorage.removeItem(`festivalCheckoutData_${slug}`);
      sessionStorage.removeItem(`festivalCheckoutStart_${slug}`);
      navigate(`/festival/${slug}`);
    }
  }, [slug, navigate, t]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  if (loading || !checkoutData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">{t.loading}</span>
      </div>
    );
  }

  const currencySymbol =
    checkoutData.currency?.toUpperCase() === "EUR"
      ? "\u20AC"
      : checkoutData.currency?.toUpperCase() || "\u20AC";
  const formDisabled = !!clientSecret;

  return (
    <div
      className="min-h-screen bg-gray-50 light"
      data-theme="light"
      style={{ colorScheme: "light" }}
    >
      <style>{`
        .light, .light *, .light *::before, .light *::after {
          color-scheme: light !important;
        }
        .light input,
        .light select,
        .light textarea,
        .light option,
        .light input:-webkit-autofill,
        .light input:-webkit-autofill:hover,
        .light input:-webkit-autofill:focus {
          color: #000000 !important;
          background-color: #ffffff !important;
          -webkit-text-fill-color: #000000 !important;
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          box-shadow: 0 0 0 1000px #ffffff inset !important;
          border-color: #d1d5db !important;
        }
        .light select option {
          color: #000000 !important;
          background-color: #ffffff !important;
        }
        .light input::placeholder, .light textarea::placeholder {
          color: #9ca3af !important;
          -webkit-text-fill-color: #9ca3af !important;
        }
        .light input:disabled, .light select:disabled {
          color: #6b7280 !important;
          background-color: #f9fafb !important;
          -webkit-text-fill-color: #6b7280 !important;
          -webkit-box-shadow: 0 0 0 1000px #f9fafb inset !important;
        }
        .light label { color: #4b5563 !important; }
        .light h2, .light h3, .light p, .light span, .light div {
          color-scheme: light !important;
        }
        .light .StripeElement, .light .__PrivateStripeElement,
        .light .StripeElement iframe, .light .__PrivateStripeElement iframe {
          color-scheme: light !important;
        }
        [data-theme="light"] input,
        [data-theme="light"] select,
        [data-theme="light"] textarea {
          color: #000000 !important;
          background-color: #ffffff !important;
          -webkit-text-fill-color: #000000 !important;
        }
      `}</style>

      <div className="max-w-[540px] mx-auto px-3 py-4 pb-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Timer + Language — sticky */}
          <div
            className={`py-3 px-4 flex items-center justify-between sticky top-0 z-50 ${
              timeLeft < 180
                ? "bg-red-50 border-b border-red-200"
                : "bg-blue-50 border-b border-blue-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock
                className={`w-4 h-4 ${
                  timeLeft < 180 ? "text-red-600" : "text-blue-600"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  timeLeft < 180 ? "text-red-700" : "text-blue-700"
                }`}
              >
                {t.reservationExpires}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {(["me", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`text-2xl leading-none transition-opacity ${
                    language === lang ? "opacity-100" : "opacity-40"
                  }`}
                >
                  {languageFlags[lang]}
                </button>
              ))}
              <span
                className={`text-lg font-bold tabular-nums ml-1 ${
                  timeLeft < 180
                    ? "text-red-600 animate-pulse"
                    : "text-blue-600"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-5">
            {/* Event title */}
            <div className="text-center pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {checkoutData.eventDetails.name}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {checkoutData.eventDetails.date} &bull;{" "}
                {checkoutData.eventDetails.time} &bull;{" "}
                {checkoutData.eventDetails.venue}
              </p>
              <p className="text-lg font-extrabold text-gray-900 mt-1">
                {displayTotal.toFixed(2)} {currencySymbol}
              </p>
            </div>

            {/* BIN Discount Banner — shown after card check in PaymentSection */}
            {binDiscount && (
              <div className="bg-green-50 border-2 border-green-400 rounded-xl p-3 flex items-center gap-3 animate-in fade-in">
                <Tag className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-700">
                    {t.binDiscountDetected}
                  </p>
                  <p className="text-xs text-green-600">
                    {binDiscount.bankName} {t.binDiscountDesc} {binDiscount.percentage}%
                    (-{discountAmount.toFixed(2)} {currencySymbol})
                  </p>
                </div>
              </div>
            )}

            {/* Personal Data */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                {t.personalData}
              </h3>
              <div className="space-y-3">
                {/* Name */}
                <div data-has-error={formErrors.name ? "true" : undefined}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                    {t.fullName} *
                  </label>
                  <input
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    disabled={formDisabled}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      formErrors.name ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder={t.fullNamePlaceholder}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div data-has-error={formErrors.email ? "true" : undefined}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                    {t.email} *
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    disabled={formDisabled}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      formErrors.email ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder={t.emailPlaceholder}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div data-has-error={formErrors.phone ? "true" : undefined}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                    {t.phone} *
                  </label>
                  <div className="flex">
                    <select
                      value={phonePrefix}
                      onChange={(e) => setPhonePrefix(e.target.value)}
                      disabled={formDisabled}
                      className="px-2 py-2.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 cursor-pointer"
                    >
                      {/* Balkan & region */}
                      <option value="+382">🇲🇪 +382</option>
                      <option value="+381">🇷🇸 +381</option>
                      <option value="+387">🇧🇦 +387</option>
                      <option value="+385">🇭🇷 +385</option>
                      <option value="+355">🇦🇱 +355</option>
                      <option value="+389">🇲🇰 +389</option>
                      <option value="+386">🇸🇮 +386</option>
                      <option value="+383">🇽🇰 +383</option>
                      <option value="+359">🇧🇬 +359</option>
                      <option value="+40">🇷🇴 +40</option>
                      <option value="+36">🇭🇺 +36</option>
                      <option value="+30">🇬🇷 +30</option>
                      <option value="+90">🇹🇷 +90</option>
                      {/* Western Europe */}
                      <option value="+43">🇦🇹 +43</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+41">🇨🇭 +41</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+351">🇵🇹 +351</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+353">🇮🇪 +353</option>
                      <option value="+31">🇳🇱 +31</option>
                      <option value="+32">🇧🇪 +32</option>
                      <option value="+352">🇱🇺 +352</option>
                      {/* Nordics */}
                      <option value="+45">🇩🇰 +45</option>
                      <option value="+46">🇸🇪 +46</option>
                      <option value="+47">🇳🇴 +47</option>
                      <option value="+358">🇫🇮 +358</option>
                      <option value="+354">🇮🇸 +354</option>
                      {/* Eastern Europe */}
                      <option value="+48">🇵🇱 +48</option>
                      <option value="+420">🇨🇿 +420</option>
                      <option value="+421">🇸🇰 +421</option>
                      <option value="+380">🇺🇦 +380</option>
                      <option value="+370">🇱🇹 +370</option>
                      <option value="+371">🇱🇻 +371</option>
                      <option value="+372">🇪🇪 +372</option>
                      {/* Americas */}
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+55">🇧🇷 +55</option>
                      <option value="+54">🇦🇷 +54</option>
                      {/* Middle East & Asia */}
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+972">🇮🇱 +972</option>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+82">🇰🇷 +82</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+64">🇳🇿 +64</option>
                      <option value="+27">🇿🇦 +27</option>
                    </select>
                    <input
                      type="tel"
                      autoComplete="tel-national"
                      value={form.phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^\d\s\-]/g, "");
                        // Strip leading 0 (local format) — backend adds prefix
                        while (val.startsWith("0")) val = val.slice(1);
                        updateField("phone", val);
                      }}
                      disabled={formDisabled}
                      className={`flex-1 px-3 py-2.5 border rounded-r-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                        formErrors.phone ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder={t.phonePlaceholder}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>
                  )}
                </div>

                {/* Address */}
                <div data-has-error={formErrors.address ? "true" : undefined}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                    {language === "me" ? "Adresa" : "Address"} *
                  </label>
                  <input
                    type="text"
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    disabled={formDisabled}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                      formErrors.address ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder={language === "me" ? "Ulica i broj" : "Street and number"}
                  />
                  {formErrors.address && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>
                  )}
                </div>

                {/* Postal Code + City */}
                <div className="flex gap-3">
                  <div className="w-1/3" data-has-error={formErrors.postalCode ? "true" : undefined}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                      {language === "me" ? "Poštanski broj" : "Postal code"} *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={5}
                      value={form.postalCode}
                      onChange={(e) => handlePostalCodeChange(e.target.value)}
                      disabled={formDisabled}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 font-mono tracking-wider ${
                        formErrors.postalCode ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder="81000"
                    />
                    {formErrors.postalCode && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.postalCode}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                      {language === "me" ? "Grad" : "City"}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoComplete="address-level2"
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        disabled={formDisabled}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder={cityLoading ? "..." : (language === "me" ? "Auto-popunjava se" : "Auto-fills")}
                      />
                      {cityLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500 absolute right-3 top-3" />
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Insurance Section */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  {t.wantInsurance}
                </h3>
                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {t.required}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {t.selectInsuranceOption}
              </p>

              {/* Yes */}
              <div
                onClick={() => !formDisabled && selectInsurance("yes")}
                className={`rounded-xl p-4 mb-3 border-2 transition-all ${
                  formDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${
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
                    {insuranceChoice === "yes" && (
                      <div className="w-3.5 h-3.5 rounded-full bg-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">
                          {t.yesInsurance}
                        </span>
                        <span className="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                          {t.fullRefund}
                        </span>
                      </div>
                      <span className="text-base font-bold text-green-600 flex-shrink-0">
                        +{insurancePrice.toFixed(2)} {currencySymbol}
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
                      {showBenefits ? `\u25B2 ${t.hideDetails}` : `\u25BC ${t.showDetails}`}
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        showBenefits ? "max-h-96 mt-3 pt-3 border-t border-green-200" : "max-h-0"
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                        {[
                          ["\u{1F68C}", t.transportDelay],
                          ["\u2696\uFE0F", t.courtSummons],
                          ["\u{1F3E0}", t.burglary],
                          ["\u{1F525}", t.fire],
                          ["\u{1F4A7}", t.flood],
                          ["\u{1F9B4}", t.fractures],
                          ["\u{1F4BC}", t.workIncapacity],
                          ["\u{1F476}", t.childIllness],
                          ["\u{1F4CB}", t.jobLoss],
                          ["\u{1F3E5}", t.seriousIllness],
                          ["\u{1F494}", t.deathLoved],
                          ["\u{1F697}", t.carAccident],
                        ].map(([icon, label], i) => (
                          <div key={i} className="flex items-center gap-2">
                            {icon} {label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {insuranceChoice === "yes" && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!formDisabled) setAcceptTerms(!acceptTerms);
                        }}
                        className={`mt-3 pt-3 border-t border-green-200 flex items-center gap-3 cursor-pointer rounded-lg transition-colors ${
                          !acceptTerms ? "bg-red-50 -mx-4 -mb-4 px-4 py-3" : ""
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            acceptTerms
                              ? "border-green-500 bg-green-500"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {acceptTerms && (
                            <span className="text-white text-xs font-bold">
                              \u2713
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-700">
                          {t.acceptTermsText}{" "}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
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

              {/* No */}
              <div
                onClick={() => !formDisabled && selectInsurance("no")}
                className={`rounded-xl p-4 border-2 transition-all ${
                  formDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${
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
                    {insuranceChoice === "no" && (
                      <div className="w-3.5 h-3.5 rounded-full bg-gray-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900">
                      {t.noInsurance}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.noInsuranceDesc}
                    </p>
                  </div>
                </div>
              </div>

              {insuranceError && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {insuranceError}
                </p>
              )}
            </div>

            {/* Order Review */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                {t.orderReview}
              </h3>
              <div className="space-y-2 text-sm">
                {checkoutData.tickets.map((ticket, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-500">
                      {ticket.category} ({ticket.quantity}x)
                    </span>
                    <span className="font-medium text-gray-700">
                      {(ticket.price * ticket.quantity).toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                ))}
                {binDiscount && discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      {t.discount} ({binDiscount.bankName} {binDiscount.percentage}%)
                    </span>
                    <span className="font-medium">
                      -{discountAmount.toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t.serviceFee}</span>
                  <span className="font-medium text-gray-700">
                    {checkoutData.serviceFee.toFixed(2)} {currencySymbol}
                  </span>
                </div>
                {insuranceChoice === "yes" && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.insurance}</span>
                    <span className="font-medium text-green-600">
                      +{insurancePrice.toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-900">{t.total}</span>
                  <span className="font-bold text-gray-900 text-lg">
                    {displayTotal.toFixed(2)} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Error */}
            {sessionError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{sessionError}</span>
              </div>
            )}

            {/* Proceed / Re-open overlay button */}
            {clientSecret ? (
              <button
                onClick={() => setShowPaymentOverlay(true)}
                className="w-full py-3.5 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                {t.continueToPayment} &mdash; {displayTotal.toFixed(2)}{" "}
                {currencySymbol}
              </button>
            ) : (
              <button
                onClick={handleProceedToPayment}
                disabled={
                  isCreatingSession ||
                  Object.values(formErrors).some(Boolean)
                }
                className="w-full py-3.5 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                {isCreatingSession ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.creatingPayment}
                  </>
                ) : (
                  `${t.continueToPayment} \u2014 ${displayTotal.toFixed(2)} ${currencySymbol}`
                )}
              </button>
            )}
          </div>
        </div>

        {/* Cancel */}
        <button
          onClick={handleCancel}
          className="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-red-600 font-medium flex items-center justify-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.cancelPurchase}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PAYMENT OVERLAY — Step 2 (fullscreen)
          ═══════════════════════════════════════════════════════════════════ */}
      {showPaymentOverlay && clientSecret && stripePromise && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col light"
          data-theme="light"
          style={{ colorScheme: "light" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
            <button
              onClick={() => setShowPaymentOverlay(false)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.back}
            </button>
            <div className="flex items-center gap-2">
              <Clock
                className={`w-4 h-4 ${
                  timeLeft < 180 ? "text-red-600" : "text-blue-600"
                }`}
              />
              <span
                className={`text-lg font-bold tabular-nums ${
                  timeLeft < 180 ? "text-red-600 animate-pulse" : "text-blue-600"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-green-600">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                \u2713
              </div>
              <span className="text-xs font-medium">{t.step1}</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-1.5 text-blue-600">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                2
              </div>
              <span className="text-xs font-bold">{t.step2}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[540px] mx-auto p-4 space-y-4">
              <div className="text-center pb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">
                  {checkoutData.eventDetails.name}
                </h2>
                <p className="text-lg font-extrabold text-gray-900 mt-1">
                  {displayTotal.toFixed(2)} {currencySymbol}
                </p>
                {binDiscount && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    {binDiscount.bankName} -{binDiscount.percentage}%
                  </p>
                )}
              </div>

              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: stripeAppearance,
                  paymentMethodCreation: "manual",
                  paymentMethodOrder: ["card", "apple_pay", "google_pay"],
                }}
              >
                <PaymentSection
                  total={displayTotal}
                  subtotal={checkoutData.subtotal}
                  currency={checkoutData.currency}
                  t={t}
                  customerName={form.name.trim()}
                  customerEmail={form.email.trim()}
                  customerPhone={`${phonePrefix}${form.phone.trim().replace(/[\s\-]/g, "")}`}
                  customerAddress={form.address.trim()}
                  customerPostalCode={form.postalCode.trim()}
                  customerCity={form.city.trim()}
                  billingCountry={billingCountry}
                  paymentIntentId={paymentIntentId || ""}
                  onBinDiscount={handleBinDiscount}
                />
              </Elements>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
