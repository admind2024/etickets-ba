import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Shield,
  Clock,
  AlertCircle,
  Upload,
  Camera,
  CheckCircle,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DocumentScanner from "@/components/DocumentScanner";
import { useOcrMode } from "@/hooks/useAdminSettings";
import { getStripe } from "@/lib/stripe";
import {
  CheckoutProvider,
  PaymentElement,
  useCheckout,
} from "@stripe/react-stripe-js/checkout";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type Language = "me" | "en";

interface SelectedSeat {
  id: string;
  category: string;
  price: number;
  sectionLabel?: string;
  entrance?: string;
  view?: string;
  viewQuality?: string;
  label?: string;
  number?: string;
  objectType?: string;
  isVipTable?: boolean;
  tableFixedPrice?: number;
  tableId?: string;
}

interface CheckoutData {
  eventId: string;
  holdToken: string | null;
  selectedSeats: SelectedSeat[];
  vipTables?: Array<{ id: string; price: number; seats: string[] }>;
  eventDetails: {
    name: string;
    date: string;
    time: string;
    venue: string;
  };
  hasInsurance: boolean;
  insurancePrice: number;
  subtotal: number;
  totalTableFixedPrice?: number;
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
  gender: string;
  documentType: "id_card" | "passport";
  documentNumber: string;
  billingAddress: string;
  billingCity: string;
  billingPostalCode: string;
}

interface BillingAddress {
  name: string;
  country: string;
  line1: string;
  city: string;
  postal_code: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════

const translations = {
  me: {
    loading: "Učitavanje...",
    loadingPayment: "Učitavanje plaćanja...",
    reservationExpires: "Rezervacija ističe za",
    reservationExpired:
      "Vrijeme rezervacije je isteklo. Molimo izaberite sjedišta ponovo.",

    personalData: "Lični podaci",
    fullName: "Ime i prezime",
    fullNamePlaceholder: "Vaše ime i prezime",
    fullNameRequired: "Ime i prezime je obavezno",
    email: "Email adresa",
    emailPlaceholder: "vasa@email.com",
    emailRequired: "Email je obavezan",
    emailInvalid: "Neispravan email format",
    phone: "Broj telefona",
    phonePlaceholder: "6X XXX XXX",
    phoneRequired: "Broj telefona je obavezan",
    phoneInvalid: "Neispravan format broja telefona",
    gender: "Pol",
    genderRequired: "Pol je obavezan",
    genderMismatch: "Pol ne odgovara dokumentu. Na dokumentu:",
    male: "Muški",
    female: "Ženski",

    billingAddress: "Adresa",
    billingAddressPlaceholder: "Ulica i broj",
    billingAddressRequired: "Adresa je obavezna",
    billingCity: "Grad",
    billingCityPlaceholder: "Naziv grada",
    billingCityRequired: "Grad je obavezan",
    billingPostalCode: "Poštanski broj",
    billingPostalCodePlaceholder: "81000",
    billingPostalCodeRequired: "Poštanski broj je obavezan",
    billingCountry: "Država",

    identityDocument: "Identifikacioni dokument",
    documentDesc:
      "Kupovina je dozvoljena isključivo sa crnogorskim ličnim dokumentima. Potrebno je fotografisati prednju stranu dokumenta.",
    documentLegalNote:
      "Podaci se prikupljaju u skladu sa čl. 19 Zakona o sprječavanju nasilja i nedoličnog ponašanja na sportskim priredbama (Sl. list CG, br. 51/2017).",
    documentType: "Tip dokumenta",
    idCard: "Lična karta CG",
    passport: "Pasoš CG",
    documentNumber: "Broj dokumenta",
    documentNumberRequired: "Broj dokumenta je obavezan",
    documentNumberInvalid:
      "Broj dokumenta može sadržati samo slova, brojeve i crtice",
    documentNumberPlaceholder: "Broj lične karte",
    passportNumberPlaceholder: "Broj pasoša",
    readingDocument: "Čitanje podataka sa dokumenta...",
    analyzingDocument: "Analiziramo vaš dokument, molimo sačekajte...",
    documentPhoto: "Fotografija dokumenta",
    photoFrontSide: "Slikajte PREDNJU stranu dokumenta",
    takePhoto: "Slikaj dokument",
    useCamera: "Koristite kameru",
    chooseImage: "Odaberi sliku",
    uploaded: "Uploadovano",
    wrongSide: "Uploadovali ste poleđinu dokumenta. Molimo slikajte ili uploadujte PREDNJU stranu.",

    ocrDataRead: "Podaci očitani sa dokumenta:",
    nameLabel: "Ime:",
    genderLabel: "Pol:",
    validUntil: "Važi do:",
    documentAutoRead:
      "Broj dokumenta automatski očitan — provjerite ispravnost",

    notMontenegrinShort:
      "Dokument nije crnogorski. Uploadujte crnogorsku ličnu kartu ili pasoš.",
    nameDoesNotMatch: "Ime ne odgovara dokumentu. Na dokumentu:",
    documentNumberMismatch: "Broj dokumenta ne odgovara dokumentu. Na dokumentu:",
    documentRequired:
      "Morate fotografisati ili uploadovati sliku dokumenta.",
    documentExpired: "Dokument je istekao",
    useValidDocument: "Koristite važeći dokument.",

    wantInsurance: "Želiš li osiguranje ulaznica?",
    required: "OBAVEZNO",
    selectInsuranceOption:
      "Molimo izaberi jednu od opcija da bi nastavio kupovinu",
    yesInsurance: "Želim da osiguram ulaznice",
    fullRefund: "100% POVRAT",
    insuranceDesc:
      "Kompletna zaštita u slučaju nepredviđenih okolnosti. Pun povrat novca garantovan.",
    showDetails: "Vidi šta je pokriveno",
    hideDetails: "Sakrij detalje",
    noInsurance: "Ne želim osiguranje",
    noInsuranceDesc: "Nastaviću bez dodatne zaštite",
    acceptTermsText: "Prihvatam",
    insuranceTerms: "uslove osiguranja",
    selectInsurance: "Molimo odaberite da li želite osiguranje.",
    acceptInsuranceTerms: "Morate prihvatiti uslove osiguranja!",

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

    orderReview: "Pregled narudžbe",
    ticketsLabel: "Ulaznice",
    insurance: "Osiguranje",
    serviceFee: "Servisna naknada",
    total: "UKUPNO",

    payment: "Plaćanje",
    paymentLoadError: "Greška pri učitavanju plaćanja",
    paymentProcessError: "Greška pri plaćanju",
    processing: "Procesiranje...",
    pay: "Plati",
    securePayment: "Sigurna SSL enkripcija • Zaštićeno plaćanje",

    continueToPayment: "Nastavi na plaćanje",
    uploadingDocument: "Sačekajte...",
    creatingPayment: "Sačekajte...",
    cancelPurchase: "Otkaži kupovinu",
    cancelConfirm: "Da li ste sigurni da želite otkazati kupovinu?",

    step1: "Podaci",
    step2: "Plaćanje",
    back: "Nazad",

    allowedFormats: "Dozvoljeni formati: JPEG, PNG, WebP, HEIC",
    maxFileSize: "Maksimalna veličina fajla je 5MB",
    uploadError: "Greška pri uploadu: ",
  },
  en: {
    loading: "Loading...",
    loadingPayment: "Loading payment...",
    reservationExpires: "Reservation expires in",
    reservationExpired:
      "Reservation time has expired. Please select seats again.",

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
    gender: "Gender",
    genderRequired: "Gender is required",
    genderMismatch: "Gender does not match document. On document:",
    male: "Male",
    female: "Female",

    billingAddress: "Address",
    billingAddressPlaceholder: "Street and number",
    billingAddressRequired: "Address is required",
    billingCity: "City",
    billingCityPlaceholder: "City name",
    billingCityRequired: "City is required",
    billingPostalCode: "Postal code",
    billingPostalCodePlaceholder: "81000",
    billingPostalCodeRequired: "Postal code is required",
    billingCountry: "Country",

    identityDocument: "Identity document",
    documentDesc:
      "Purchase is allowed only with Montenegrin identity documents. You need to photograph the front side of the document.",
    documentLegalNote:
      "Data is collected in accordance with Art. 19 of the Law on Prevention of Violence and Misconduct at Sports Events (Official Gazette of MNE, No. 51/2017).",
    documentType: "Document type",
    idCard: "MNE ID card",
    passport: "MNE Passport",
    documentNumber: "Document number",
    documentNumberRequired: "Document number is required",
    documentNumberInvalid:
      "Document number can only contain letters, numbers and dashes",
    documentNumberPlaceholder: "ID card number",
    passportNumberPlaceholder: "Passport number",
    readingDocument: "Reading document data...",
    analyzingDocument: "Analyzing your document, please wait...",
    documentPhoto: "Document photo",
    photoFrontSide: "Photograph the FRONT side of the document",
    takePhoto: "Take photo",
    useCamera: "Use camera",
    chooseImage: "Choose image",
    uploaded: "Uploaded",
    wrongSide: "You uploaded the back side of the document. Please photograph or upload the FRONT side.",

    ocrDataRead: "Data read from document:",
    nameLabel: "Name:",
    genderLabel: "Gender:",
    validUntil: "Valid until:",
    documentAutoRead:
      "Document number automatically read — please verify",

    notMontenegrinShort:
      "Document is not Montenegrin. Upload a Montenegrin ID card or passport.",
    nameDoesNotMatch: "Name does not match document. On document:",
    documentNumberMismatch: "Document number does not match document. On document:",
    documentRequired:
      "You must photograph or upload a document image.",
    documentExpired: "Document has expired",
    useValidDocument: "Please use a valid document.",

    wantInsurance: "Do you want ticket insurance?",
    required: "REQUIRED",
    selectInsuranceOption:
      "Please select an option to continue with your purchase",
    yesInsurance: "I want to insure my tickets",
    fullRefund: "100% REFUND",
    insuranceDesc:
      "Complete protection in case of unforeseen circumstances. Full refund guaranteed.",
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
    total: "TOTAL",

    payment: "Payment",
    paymentLoadError: "Error loading payment",
    paymentProcessError: "Payment error",
    processing: "Processing...",
    pay: "Pay",
    securePayment: "Secure SSL encryption • Protected payment",

    continueToPayment: "Continue to payment",
    uploadingDocument: "Please wait...",
    creatingPayment: "Please wait...",
    cancelPurchase: "Cancel purchase",
    cancelConfirm: "Are you sure you want to cancel the purchase?",

    step1: "Details",
    step2: "Payment",
    back: "Back",

    allowedFormats: "Allowed formats: JPEG, PNG, WebP, HEIC",
    maxFileSize: "Maximum file size is 5MB",
    uploadError: "Upload error: ",
  },
};

const languageFlags: Record<Language, string> = {
  me: "\u{1F1F2}\u{1F1EA}",
  en: "\u{1F1EC}\u{1F1E7}",
};

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE APPEARANCE — force light mode, black text
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
    ".Label": {
      color: "#374151",
    },
    ".Tab": {
      color: "#374151",
      backgroundColor: "#ffffff",
    },
    ".Tab--selected": {
      color: "#2563eb",
      backgroundColor: "#eff6ff",
    },
  },
};

const TIMER_MINUTES = 15;

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT SECTION (inside CheckoutProvider)
// ═══════════════════════════════════════════════════════════════════════════

function PaymentSection({
  total,
  currency,
  t,
  billingAddress,
}: {
  total: number;
  currency: string;
  t: (typeof translations)["me"];
  billingAddress: BillingAddress;
}) {
  const checkoutState = useCheckout();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  if (checkoutState.type === "loading") {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 text-sm">{t.loadingPayment}</span>
      </div>
    );
  }

  if (checkoutState.type === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 font-medium text-sm">{t.paymentLoadError}</p>
        <p className="text-red-600 text-xs mt-1">
          {checkoutState.error.message}
        </p>
      </div>
    );
  }

  const handlePay = async () => {
    setIsSubmitting(true);
    setPaymentError(null);
    try {
      const { checkout } = checkoutState;
      // Set billing address before confirming
      await (checkout as any).updateBillingAddress({
        name: billingAddress.name,
        address: {
          country: billingAddress.country,
          line1: billingAddress.line1,
          city: billingAddress.city,
          postal_code: billingAddress.postal_code,
        },
      });
      const confirmResult = await checkout.confirm();
      if (confirmResult.type === "error") {
        setPaymentError(confirmResult.error.message);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setPaymentError(err.message || t.paymentProcessError);
      setIsSubmitting(false);
    }
  };

  const sym =
    currency.toUpperCase() === "EUR" ? "\u20AC" : currency.toUpperCase();

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
          fields: { billingDetails: { name: "never" } },
        }}
        className="light-mode-stripe"
        onReady={() => setPaymentElementReady(true)}
      />

      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {paymentError}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={isSubmitting || !paymentElementReady}
        className="w-full py-3.5 rounded-xl text-base font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 transition-all"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t.processing}
          </>
        ) : (
          <>
            {t.pay} {total.toFixed(2)} {sym}
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

export default function MatchCheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);

  // Language
  const [language, setLanguage] = useState<Language>("me");
  const t = translations[language];

  // OCR mode (strict = CG only, relaxed = all countries)
  const { mode: ocrMode } = useOcrMode();

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form
  const [form, setForm] = useState<CustomerForm>({
    name: "",
    email: "",
    phone: "",
    gender: "",
    documentType: "id_card",
    documentNumber: "",
    billingAddress: "",
    billingCity: "",
    billingPostalCode: "",
  });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof CustomerForm, string>>
  >({});

  // Document scanner
  const [scannerOpen, setScannerOpen] = useState(false);

  // Document image upload
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<string | null>(null);
  const [documentRejected, setDocumentRejected] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<{
    surname: string | null;
    givenNames: string | null;
    sex: string | null;
    expiryDate: string | null;
    documentNumber: string | null;
  } | null>(null);
  const [verificationWarnings, setVerificationWarnings] = useState<string[]>(
    []
  );

  // Insurance
  const [insuranceChoice, setInsuranceChoice] = useState<
    "yes" | "no" | null
  >(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [insuranceError, setInsuranceError] = useState<string | null>(null);

  // Phone prefix & billing country (detected by IP geolocation)
  const [phonePrefix, setPhonePrefix] = useState("+382");
  const [billingCountry, setBillingCountry] = useState("ME");

  // Scroll to error trigger
  const [shouldScrollToError, setShouldScrollToError] = useState(false);

  // Checkout session
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const stripePromise = getStripe();

  // ═══════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════

  const insurancePrice = checkoutData
    ? Math.round(checkoutData.subtotal * 0.07 * 100) / 100
    : 0;
  const displayTotal = checkoutData
    ? checkoutData.total +
      (insuranceChoice === "yes" ? insurancePrice : 0)
    : 0;

  // ═══════════════════════════════════════════════════════════════════════
  // DETECT PHONE PREFIX BY IP
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const countryToPrefix: Record<string, string> = {
      ME: "+382", RS: "+381", BA: "+387", HR: "+385", AL: "+355",
      MK: "+389", SI: "+386", XK: "+383", BG: "+359", RO: "+40",
      HU: "+36", AT: "+43", DE: "+49", IT: "+39", CH: "+41",
      GB: "+44", FR: "+33", US: "+1", TR: "+90",
    };
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(data => {
        if (data?.country_code) {
          if (countryToPrefix[data.country_code]) {
            setPhonePrefix(countryToPrefix[data.country_code]);
          }
          setBillingCountry(data.country_code);
        }
      })
      .catch(() => { /* default ME / +382 */ });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // LOAD CHECKOUT DATA
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!slug) {
      navigate("/");
      return;
    }
    const stored = sessionStorage.getItem(`fscgCheckoutData_${slug}`);
    const startTime = sessionStorage.getItem(`fscgCheckoutStart_${slug}`);
    if (!stored || !startTime) {
      navigate(`/fscg/${slug}`);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as CheckoutData;
      setCheckoutData(parsed);
      const elapsed = Date.now() - parseInt(startTime, 10);
      const remaining = Math.max(0, TIMER_MINUTES * 60 * 1000 - elapsed);
      if (remaining <= 0) {
        alert(translations.me.reservationExpired);
        sessionStorage.removeItem(`fscgCheckoutData_${slug}`);
        sessionStorage.removeItem(`fscgCheckoutStart_${slug}`);
        navigate(`/fscg/${slug}`);
        return;
      }
      setTimeLeft(Math.floor(remaining / 1000));
      setLoading(false);
    } catch {
      navigate(`/fscg/${slug}`);
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
          sessionStorage.removeItem(`fscgCheckoutData_${slug}`);
          sessionStorage.removeItem(`fscgCheckoutStart_${slug}`);
          navigate(`/fscg/${slug}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft > 0, slug, navigate]);

  // Real-time cross-verification: compare form data with OCR data
  useEffect(() => {
    if (!ocrData) return;

    console.log("Cross-verification running:", JSON.stringify({ ocrData, formName: form.name, formGender: form.gender, formDocNum: form.documentNumber }));

    const newErrors: Partial<Record<keyof CustomerForm, string>> = {};

    // Name check
    if ((ocrData.surname || ocrData.givenNames) && form.name.trim()) {
      const formName = normalizeStr(form.name);
      let nameMatches = false;
      const ocrNameDisplay = [ocrData.givenNames, ocrData.surname].filter(Boolean).join(" ");

      if (ocrData.surname && ocrData.givenNames) {
        const ocrFullName = normalizeStr(`${ocrData.givenNames} ${ocrData.surname}`);
        const ocrFullNameReversed = normalizeStr(`${ocrData.surname} ${ocrData.givenNames}`);
        const ocrSurname = normalizeStr(ocrData.surname);
        const ocrGiven = normalizeStr(ocrData.givenNames);
        nameMatches =
          formName === ocrFullName ||
          formName === ocrFullNameReversed ||
          (formName.includes(ocrSurname) && formName.includes(ocrGiven));
      } else if (ocrData.surname) {
        nameMatches = formName.includes(normalizeStr(ocrData.surname));
      } else if (ocrData.givenNames) {
        nameMatches = formName.includes(normalizeStr(ocrData.givenNames));
      }

      if (!nameMatches) {
        newErrors.name = `${t.nameDoesNotMatch} ${ocrNameDisplay}`;
      }
    }

    // Gender check
    if (ocrData.sex && form.gender) {
      const ocrGender = ocrData.sex === "M" ? "male" : "female";
      if (form.gender !== ocrGender) {
        newErrors.gender = `${t.genderMismatch} ${ocrData.sex === "M" ? t.male : t.female}`;
      }
    }

    // Document number check
    if (ocrData.documentNumber && form.documentNumber.trim()) {
      const ocrDocNorm = ocrData.documentNumber.replace(/[\s\-\/]/g, "").toUpperCase();
      const formDocNorm = form.documentNumber.trim().replace(/[\s\-\/]/g, "").toUpperCase();
      if (ocrDocNorm !== formDocNorm) {
        newErrors.documentNumber = `${t.documentNumberMismatch} ${ocrData.documentNumber}`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(prev => ({ ...prev, ...newErrors }));
      setShouldScrollToError(true);
    } else {
      // Clear OCR-related errors if now matching
      setFormErrors(prev => {
        const updated = { ...prev };
        if (prev.name?.includes(t.nameDoesNotMatch)) delete updated.name;
        if (prev.gender?.includes(t.genderMismatch)) delete updated.gender;
        if (prev.documentNumber?.includes(t.documentNumberMismatch)) delete updated.documentNumber;
        return updated;
      });
    }
  }, [ocrData, form.name, form.gender, form.documentNumber, t]);

  // Scroll to first error after form validation
  useEffect(() => {
    if (!shouldScrollToError) return;
    setShouldScrollToError(false);
    // Wait for DOM to update with error styles
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el =
          document.querySelector('[data-has-error="true"]') ||
          document.querySelector('.border-red-400') ||
          document.querySelector('.text-red-500');
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      });
    });
  }, [shouldScrollToError, formErrors, docError, insuranceError]);

  // Body scroll lock when payment overlay is open
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
    return `${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FORM
  // ═══════════════════════════════════════════════════════════════════════

  const updateField = (field: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field])
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const normalizeStr = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đ]/g, "d")
      .replace(/[ž]/g, "z")
      .replace(/[č]/g, "c")
      .replace(/[ć]/g, "c")
      .replace(/[š]/g, "s")
      .trim();

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CustomerForm, string>> = {};
    if (!form.name.trim()) errors.name = t.fullNameRequired;
    if (!form.email.trim()) errors.email = t.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = t.emailInvalid;
    if (!form.phone.trim()) errors.phone = t.phoneRequired;
    else if (!/^[\d\s\-]{5,15}$/.test(form.phone.trim()))
      errors.phone = t.phoneInvalid;
    if (!form.gender) errors.gender = t.genderRequired;
    if (!form.billingAddress.trim()) errors.billingAddress = t.billingAddressRequired;
    if (!form.billingCity.trim()) errors.billingCity = t.billingCityRequired;
    if (!form.billingPostalCode.trim()) errors.billingPostalCode = t.billingPostalCodeRequired;

    let hasDocError = false;
    if (documentRejected) {
      setDocError(t.notMontenegrinShort);
      hasDocError = true;
    } else if (!documentFile && !uploadedDocUrl) {
      setDocError(t.documentRequired);
      hasDocError = true;
    } else {
      setDocError(null);
    }

    // Cross-verify OCR data with form input
    if (ocrData && !hasDocError) {
      const warnings: string[] = [];

      if ((ocrData.surname || ocrData.givenNames) && form.name.trim()) {
        const formName = normalizeStr(form.name);
        let nameMatches = false;
        const ocrNameDisplay = [ocrData.givenNames, ocrData.surname].filter(Boolean).join(" ");

        if (ocrData.surname && ocrData.givenNames) {
          // Both available: full comparison
          const ocrFullName = normalizeStr(`${ocrData.givenNames} ${ocrData.surname}`);
          const ocrFullNameReversed = normalizeStr(`${ocrData.surname} ${ocrData.givenNames}`);
          const ocrSurname = normalizeStr(ocrData.surname);
          const ocrGiven = normalizeStr(ocrData.givenNames);
          nameMatches =
            formName === ocrFullName ||
            formName === ocrFullNameReversed ||
            (formName.includes(ocrSurname) && formName.includes(ocrGiven));
        } else if (ocrData.surname) {
          // Only surname: check if form contains it
          nameMatches = formName.includes(normalizeStr(ocrData.surname));
        } else if (ocrData.givenNames) {
          // Only givenNames: check if form contains it
          nameMatches = formName.includes(normalizeStr(ocrData.givenNames));
        }

        if (!nameMatches) {
          errors.name = `${t.nameDoesNotMatch} ${ocrNameDisplay}`;
        }
      }

      if (ocrData.sex && form.gender) {
        const ocrGender = ocrData.sex === "M" ? "male" : "female";
        if (form.gender !== ocrGender) {
          errors.gender = `${t.genderMismatch} ${ocrData.sex === "M" ? t.male : t.female}`;
        }
      }

      // Document number check
      if (ocrData.documentNumber && form.documentNumber.trim()) {
        const ocrDocNorm = ocrData.documentNumber.replace(/[\s\-\/]/g, "").toUpperCase();
        const formDocNorm = form.documentNumber.trim().replace(/[\s\-\/]/g, "").toUpperCase();
        if (ocrDocNorm !== formDocNorm) {
          errors.documentNumber = `${t.documentNumberMismatch} ${ocrData.documentNumber}`;
        }
      }

      setVerificationWarnings(warnings);
    }

    // Validate insurance
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
    setInsuranceError(null);

    setFormErrors(errors);
    return Object.keys(errors).length === 0 && !hasDocError;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // INSURANCE
  // ═══════════════════════════════════════════════════════════════════════

  const selectInsurance = (choice: "yes" | "no") => {
    setInsuranceChoice(choice);
    setInsuranceError(null);
    if (choice === "no") setAcceptTerms(false);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // DOCUMENT IMAGE
  // ═══════════════════════════════════════════════════════════════════════

  const runOcr = async (file: File) => {
    setIsOcrRunning(true);
    setOcrConfidence(null);
    setDocumentRejected(false);
    setDetectedCountry(null);
    setOcrData(null);
    setVerificationWarnings([]);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke(
        "ocr-document",
        {
          body: {
            imageBase64: base64,
            documentType: form.documentType,
            strict: ocrMode !== "relaxed",
          },
        }
      );

      if (error) throw new Error(error.message);

      console.log("OCR full response:", JSON.stringify(data));

      if (data?.success) {
        // FIRST: Reject documents that are not ID card or passport (check BEFORE rotation/back side)
        if (data.detectedDocumentType && data.detectedDocumentType !== "id_card" && data.detectedDocumentType !== "passport") {
          setDocumentRejected(true);
          const docTypeNames: Record<string, { me: string; en: string }> = {
            drivers_license: { me: "vozačka dozvola", en: "driver's license" },
            other: { me: "nepoznat dokument", en: "unknown document" },
          };
          const detected = docTypeNames[data.detectedDocumentType] || docTypeNames.other;
          setDocError(
            language === "me"
              ? `Ovaj dokument je ${detected.me}. Prihvataju se samo lična karta ili pasoš.`
              : `This document is a ${detected.en}. Only ID cards or passports are accepted.`
          );
          setShouldScrollToError(true);
          setDocumentFile(null);
          setDocumentPreview(null);
          return;
        }

        // Rotated image detection
        if (data.imageRotated) {
          setDocumentRejected(true);
          setDocError(
            language === "me"
              ? "Dokument je okrenut! Pozicionirajte dokument HORIZONTALNO (landscape) i pokušajte ponovo."
              : "Document is rotated! Position the document HORIZONTALLY (landscape) and try again."
          );
          setShouldScrollToError(true);
          setDocumentFile(null);
          setDocumentPreview(null);
          return;
        }

        // Back side detection
        if (data.isBackSide) {
          setDocumentRejected(true);
          setDocError(t.wrongSide);
          setShouldScrollToError(true);
          setDocumentFile(null);
          setDocumentPreview(null);
          return;
        }

        if (ocrMode !== "relaxed" && data.isMontenegrin === false) {
          setDocumentRejected(true);
          setDetectedCountry(data.detectedCountry || "nepoznata");
          setDocError(
            `${t.notMontenegrinShort}`
          );
          setShouldScrollToError(true);
          setDocumentFile(null);
          setDocumentPreview(null);
          return;
        }

        // Auto-correct document type if AI detected different type (id_card vs passport)
        if (data.detectedDocumentType && data.detectedDocumentType !== form.documentType) {
          console.log(`OCR auto-correcting document type: ${form.documentType} → ${data.detectedDocumentType}`);
          updateField("documentType", data.detectedDocumentType);
          console.info(
            data.detectedDocumentType === "id_card"
              ? "Automatski detektovana lična karta / ID card auto-detected"
              : "Automatski detektovan pasoš / Passport auto-detected"
          );
        }

        // Use the actual document type (detected or user-selected) for further processing
        const effectiveDocType = data.detectedDocumentType || form.documentType;

        // Fix OCR character confusion: digits → letters in name fields
        const fixOcrName = (s: string | null): string | null => {
          if (!s) return null;
          return s
            .replace(/1/g, "I")
            .replace(/0/g, "O")
            .replace(/5/g, "S")
            .replace(/8/g, "B");
        };

        // Process document number first so we can store the corrected version
        let ocrDocNum: string | null = null;
        if (data.documentNumber) {
          // CG ID card: first char is always a letter — fix digit→letter confusion (only in strict/CG mode)
          let docNum = data.documentNumber;
          if (ocrMode !== "relaxed" && effectiveDocType === "id_card" && /^\d/.test(docNum)) {
            const digitToLetter: Record<string, string> = { "1": "I", "0": "O", "5": "S", "8": "B", "2": "Z", "7": "T" };
            docNum = (digitToLetter[docNum[0]] || docNum[0]) + docNum.slice(1);
          }
          ocrDocNum = docNum;
          updateField("documentNumber", docNum);
          setOcrConfidence(data.confidence);
        }

        const ocrResult = {
          surname: fixOcrName(data.surname),
          givenNames: fixOcrName(data.givenNames),
          sex: data.sex || null,
          expiryDate: data.expiryDate || null,
          documentNumber: ocrDocNum,
        };
        console.log("OCR extracted data:", JSON.stringify(ocrResult));
        setOcrData(ocrResult);

        // Auto-fill gender from OCR
        if (data.sex) {
          updateField("gender", data.sex === "M" ? "male" : "female");
        }

        if (data.expiryDate) {
          try {
            const parts = data.expiryDate.replace(/\.$/, "").split(".");
            if (parts.length === 3) {
              const expiry = new Date(
                parseInt(parts[2]),
                parseInt(parts[1]) - 1,
                parseInt(parts[0])
              );
              if (expiry < new Date()) {
                setDocumentRejected(true);
                setDocError(
                  `${t.documentExpired} (${data.expiryDate}). ${t.useValidDocument}`
                );
                setDocumentFile(null);
                setDocumentPreview(null);
                return;
              }
            }
          } catch {
            // ignore date parse errors
          }
        }

        // Validate OCR read enough data — reject if name not read
        if (!data.surname && !data.givenNames) {
          setDocumentRejected(true);
          setDocError(
            language === "me"
              ? "Skeniranje nije uspjelo — ime nije pročitano. Pokušajte ponovo sa boljim osvjetljenjem."
              : "Scan failed — name could not be read. Please try again with better lighting."
          );
          setShouldScrollToError(true);
          setDocumentFile(null);
          setDocumentPreview(null);
          return;
        }

        // Reject low confidence scans
        if (data.confidence === "low") {
          setDocumentRejected(true);
          setDocError(
            language === "me"
              ? "Kvalitet skeniranja je nizak. Pokušajte ponovo — pozicionirajte dokument ravno i sa dobrim osvjetljenjem."
              : "Scan quality is too low. Please try again — position the document flat with good lighting."
          );
          setShouldScrollToError(true);
          setDocumentFile(null);
          setDocumentPreview(null);
          return;
        }
      }
    } catch (err: any) {
      console.error("OCR error:", err);
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert(t.allowedFormats);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(t.maxFileSize);
      return;
    }
    setDocumentFile(file);
    setUploadedDocUrl(null);
    setUploadedFilePath(null);
    setDocError(null);
    setDocumentRejected(false);
    setDetectedCountry(null);
    const reader = new FileReader();
    reader.onload = (e) => setDocumentPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    runOcr(file);
  };

  const removeDocument = () => {
    setDocumentFile(null);
    setDocumentPreview(null);
    setUploadedDocUrl(null);
    setUploadedFilePath(null);
    setDocumentRejected(false);
    setDetectedCountry(null);
    setDocError(null);
    setOcrData(null);
    setOcrConfidence(null);
    setVerificationWarnings([]);
  };

  const uploadDocument = async (): Promise<{
    url: string;
    path: string;
  } | null> => {
    if (uploadedDocUrl && uploadedFilePath)
      return { url: uploadedDocUrl, path: uploadedFilePath };
    if (!documentFile || !checkoutData) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("sessionId", `checkout_${Date.now()}`);
      formData.append("eventId", checkoutData.eventId);

      const { data, error } = await supabase.functions.invoke(
        "upload-match-document",
        { body: formData }
      );
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Upload failed");

      setUploadedDocUrl(data.documentUrl);
      setUploadedFilePath(data.filePath);
      return { url: data.documentUrl, path: data.filePath };
    } catch (err: any) {
      console.error("Upload error:", err);
      setDocError(t.uploadError + err.message);
      return null;
    } finally {
      setIsUploading(false);
    }
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
      const docResult = await uploadDocument();
      if (!docResult) {
        setIsCreatingSession(false);
        return;
      }

      const body = {
        eventId: checkoutData.eventId,
        holdToken: checkoutData.holdToken,
        selectedSeats: checkoutData.selectedSeats,
        vipTables: checkoutData.vipTables || [],
        eventDetails: checkoutData.eventDetails,
        hasInsurance: insuranceChoice === "yes",
        insurancePrice: insuranceChoice === "yes" ? insurancePrice : 0,
        subtotal: checkoutData.subtotal,
        totalTableFixedPrice: checkoutData.totalTableFixedPrice || 0,
        serviceFee: checkoutData.serviceFee,
        total: displayTotal,
        currency: checkoutData.currency,
        analytics: checkoutData.analytics,
        customerName: form.name.trim(),
        customerEmail: form.email.trim(),
        customerPhone: `${phonePrefix}${form.phone.trim().replace(/[\s\-]/g, "")}`,
        customerGender: form.gender,
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim(),
        documentImageUrl: docResult.url,
        documentFilePath: docResult.path,
        ocrSurname: ocrData?.surname || "",
        ocrGivenNames: ocrData?.givenNames || "",
        ocrSex: ocrData?.sex || "",
        documentExpiryDate: ocrData?.expiryDate || "",
        // Billing address (stored in metadata as fallback)
        customerAddress: form.billingAddress.trim(),
        customerCity: form.billingCity.trim(),
        customerZip: form.billingPostalCode.trim(),
        customerCountry: billingCountry,
        seatReservationSessionId:
          (checkoutData as any).seatReservationSessionId || undefined,
      };

      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session-match",
        { body }
      );

      if (error) {
        const errMsg =
          data?.message || data?.error || error.message || "Error";
        throw new Error(errMsg);
      }
      if (!data?.success)
        throw new Error(data?.message || "Error creating session");

      setClientSecret(data.clientSecret);
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
      sessionStorage.removeItem(`fscgCheckoutData_${slug}`);
      sessionStorage.removeItem(`fscgCheckoutStart_${slug}`);
      navigate(`/fscg/${slug}`);
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
      {/* Document Scanner Overlay */}
      {scannerOpen && (
        <DocumentScanner
          lang={language}
          documentType={form.documentType}
          skipMontenegrinCheck={ocrMode === "relaxed"}
          strict={ocrMode !== "relaxed"}
          onResult={(file, ocrData) => {
            setScannerOpen(false);
            // Set the file + preview without re-running OCR
            setDocumentFile(file);
            setUploadedDocUrl(null);
            setUploadedFilePath(null);
            setDocError(null);
            setDocumentRejected(false);
            setDetectedCountry(null);
            const reader = new FileReader();
            reader.onload = (e) => setDocumentPreview(e.target?.result as string);
            reader.readAsDataURL(file);
            // Process OCR data directly (already validated in scanner)
            if (ocrData.detectedDocumentType && ocrData.detectedDocumentType !== form.documentType) {
              updateField("documentType", ocrData.detectedDocumentType);
            }
            const effectiveDocType = ocrData.detectedDocumentType || form.documentType;
            const fixOcrName = (s: string | null): string | null => {
              if (!s) return null;
              return s.replace(/1/g, "I").replace(/0/g, "O").replace(/5/g, "S").replace(/8/g, "B");
            };
            let ocrDocNum: string | null = null;
            if (ocrData.documentNumber) {
              let docNum = ocrData.documentNumber;
              if (effectiveDocType === "id_card" && /^\d/.test(docNum)) {
                const d2l: Record<string, string> = { "1": "I", "0": "O", "5": "S", "8": "B", "2": "Z", "7": "T" };
                docNum = (d2l[docNum[0]] || docNum[0]) + docNum.slice(1);
              }
              ocrDocNum = docNum;
              updateField("documentNumber", docNum);
              setOcrConfidence(ocrData.confidence);
            }
            setOcrData({
              surname: fixOcrName(ocrData.surname),
              givenNames: fixOcrName(ocrData.givenNames),
              sex: ocrData.sex || null,
              expiryDate: ocrData.expiryDate || null,
              documentNumber: ocrDocNum,
            });
            // Auto-fill name from OCR
            if (ocrData.givenNames || ocrData.surname) {
              const fixedGiven = fixOcrName(ocrData.givenNames);
              const fixedSurname = fixOcrName(ocrData.surname);
              const fullName = [fixedGiven, fixedSurname].filter(Boolean).join(" ");
              if (fullName) updateField("name", fullName);
            }
            if (ocrData.sex) {
              updateField("gender", ocrData.sex === "M" ? "male" : "female");
            }
            // Check expiry date (safety net)
            if (ocrData.expiryDate) {
              try {
                const parts = ocrData.expiryDate.replace(/\.$/, "").split(".");
                if (parts.length === 3) {
                  const expiry = new Date(
                    parseInt(parts[2]),
                    parseInt(parts[1]) - 1,
                    parseInt(parts[0])
                  );
                  if (expiry < new Date()) {
                    setDocumentRejected(true);
                    setDocError(
                      `${t.documentExpired} (${ocrData.expiryDate}). ${t.useValidDocument}`
                    );
                    setDocumentFile(null);
                    setDocumentPreview(null);
                    return;
                  }
                }
              } catch {
                // ignore date parse errors
              }
            }
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <style>{`
        .light * { color-scheme: light !important; }
        .light input, .light select, .light textarea {
          color: #000000 !important;
          background-color: #ffffff !important;
          -webkit-text-fill-color: #000000 !important;
        }
        .light input::placeholder {
          color: #9ca3af !important;
          -webkit-text-fill-color: #9ca3af !important;
        }
        .light .StripeElement, .light .__PrivateStripeElement {
          color-scheme: light !important;
        }
      `}</style>

      <div className="max-w-[540px] mx-auto px-3 py-4 pb-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Timer + Language */}
          <div
            className={`py-3 px-4 flex items-center justify-between ${
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
            <div className="flex items-center gap-2">
              {(["me", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`text-lg leading-none transition-opacity ${
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

            {/* Document Section — must be completed first */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                {t.identityDocument}
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                {ocrMode === "relaxed"
                  ? (language === "me"
                    ? "Potrebno je fotografisati prednju stranu ličnog dokumenta (lična karta ili pasoš)."
                    : "You need to photograph the front side of your identity document (ID card or passport).")
                  : t.documentDesc}
              </p>
              {/* Document Type */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">
                  {t.documentType} *
                </label>
                <div className="flex gap-3">
                  {[
                    { value: "id_card" as const, label: ocrMode === "relaxed" ? (language === "me" ? "Lična karta" : "ID card") : t.idCard },
                    { value: "passport" as const, label: ocrMode === "relaxed" ? (language === "me" ? "Pasoš" : "Passport") : t.passport },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateField("documentType", opt.value)}
                      disabled={formDisabled}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all disabled:opacity-60 ${
                        form.documentType === opt.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Number — hidden, auto-filled by OCR */}
              <input type="hidden" value={form.documentNumber} />
              {formErrors.documentNumber && (
                <p className="text-xs text-red-500 mb-2" data-has-error="true">
                  {formErrors.documentNumber}
                </p>
              )}

              {/* Document Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">
                  {t.documentPhoto} *
                </label>

                {documentPreview ? (
                  <div>
                    {isOcrRunning ? (
                      <div className="flex items-center justify-center gap-2 py-4 border-2 border-blue-200 bg-blue-50 rounded-xl">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">{t.analyzingDocument}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between py-3 px-4 border-2 border-green-200 bg-green-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">
                            {language === "me" ? "Dokument skeniran" : "Document scanned"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Primary: Live scanner */}
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="flex items-center justify-center gap-2 py-4 border-2 border-blue-400 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-all"
                    >
                      <Camera className="w-6 h-6 text-blue-600" />
                      <div className="text-left">
                        <span className="text-sm font-bold text-blue-700 block">
                          {language === "me" ? "Skeniraj dokument" : "Scan document"}
                        </span>
                        <span className="text-[10px] text-blue-500">
                          {language === "me" ? "Otvorite kameru" : "Open camera"}
                        </span>
                      </div>
                    </button>

                    {/* Secondary: File picker fallback */}
                    <label className="flex items-center justify-center gap-2 py-3 border border-gray-200 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {t.chooseImage} (JPG, PNG, WebP)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                      />
                    </label>
                  </div>
                )}
                {!documentPreview && (
                  <p className="text-[11px] text-amber-600 mt-1.5 font-medium">
                    {t.photoFrontSide}
                  </p>
                )}

                {/* OCR extracted info */}
                {ocrData &&
                  !documentRejected &&
                  (ocrData.surname ||
                    ocrData.givenNames ||
                    ocrData.expiryDate ||
                    ocrData.documentNumber) && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2.5 text-xs space-y-1">
                      <p className="font-semibold text-green-800 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {t.ocrDataRead}
                      </p>
                      {ocrData.surname && ocrData.givenNames && (
                        <p className="text-green-700">
                          {t.nameLabel}{" "}
                          <span className="font-medium">
                            {ocrData.givenNames} {ocrData.surname}
                          </span>
                        </p>
                      )}
                      {ocrData.sex && (
                        <p className="text-green-700">
                          {t.genderLabel}{" "}
                          <span className="font-medium">
                            {ocrData.sex === "M" ? t.male : t.female}
                          </span>
                        </p>
                      )}
                      {ocrData.documentNumber && (
                        <p className="text-green-700">
                          {t.documentNumber}{" "}
                          <span className="font-medium">
                            {ocrData.documentNumber}
                          </span>
                        </p>
                      )}
                      {ocrData.expiryDate && (
                        <p className="text-green-700">
                          {t.validUntil}{" "}
                          <span className="font-medium">
                            {ocrData.expiryDate}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                {docError && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {docError}
                  </p>
                )}
              </div>
            </div>

            {/* Customer Info — shown after document is scanned */}
            {(documentFile || uploadedDocUrl) && !documentRejected && (
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
                      formErrors.name
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder={t.fullNamePlaceholder}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.name}
                    </p>
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
                      formErrors.email
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder={t.emailPlaceholder}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div data-has-error={formErrors.phone ? "true" : undefined}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                    {t.phone} *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-2.5 border border-r-0 border-gray-300 rounded-l-lg bg-gray-100 text-sm text-gray-600 font-medium select-none">
                      {phonePrefix}
                    </span>
                    <input
                      type="tel"
                      autoComplete="tel-local"
                      value={form.phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^\d\s\-]/g, "");
                        if (val.startsWith("0")) val = val.slice(1);
                        updateField("phone", val);
                      }}
                      disabled={formDisabled}
                      className={`flex-1 px-3 py-2.5 border rounded-r-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                        formErrors.phone
                          ? "border-red-400 bg-red-50"
                          : "border-gray-300"
                      }`}
                      placeholder={t.phonePlaceholder}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                {/* Gender (Pol) */}
                <div data-has-error={formErrors.gender ? "true" : undefined}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                    {t.gender} *
                  </label>
                  <div className="flex gap-3">
                    {[
                      { value: "male", label: t.male },
                      { value: "female", label: t.female },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("gender", opt.value)}
                        disabled={formDisabled}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all disabled:opacity-60 ${
                          form.gender === opt.value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {formErrors.gender && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.gender}
                    </p>
                  )}
                </div>

                {/* Billing Address */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">
                    {t.billingCountry}
                  </p>
                  <div className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 mb-3">
                    {billingCountry}
                  </div>

                  <div data-has-error={formErrors.billingAddress ? "true" : undefined}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                      {t.billingAddress} *
                    </label>
                    <input
                      type="text"
                      autoComplete="street-address"
                      value={form.billingAddress}
                      onChange={(e) => updateField("billingAddress", e.target.value)}
                      disabled={formDisabled}
                      className={`w-full px-3 py-2.5 border rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                        formErrors.billingAddress ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder={t.billingAddressPlaceholder}
                    />
                    {formErrors.billingAddress && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.billingAddress}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div data-has-error={formErrors.billingCity ? "true" : undefined}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                        {t.billingCity} *
                      </label>
                      <input
                        type="text"
                        autoComplete="address-level2"
                        value={form.billingCity}
                        onChange={(e) => updateField("billingCity", e.target.value)}
                        disabled={formDisabled}
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                          formErrors.billingCity ? "border-red-400 bg-red-50" : "border-gray-300"
                        }`}
                        placeholder={t.billingCityPlaceholder}
                      />
                      {formErrors.billingCity && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.billingCity}</p>
                      )}
                    </div>

                    <div data-has-error={formErrors.billingPostalCode ? "true" : undefined}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
                        {t.billingPostalCode} *
                      </label>
                      <input
                        type="text"
                        autoComplete="postal-code"
                        value={form.billingPostalCode}
                        onChange={(e) => updateField("billingPostalCode", e.target.value)}
                        disabled={formDisabled}
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                          formErrors.billingPostalCode ? "border-red-400 bg-red-50" : "border-gray-300"
                        }`}
                        placeholder={t.billingPostalCodePlaceholder}
                      />
                      {formErrors.billingPostalCode && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.billingPostalCode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

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

              {/* Yes — insure */}
              <div
                onClick={() => !formDisabled && selectInsurance("yes")}
                className={`rounded-xl p-4 mb-3 border-2 transition-all ${
                  formDisabled
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer"
                } ${
                  insuranceChoice === "yes"
                    ? "border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-lg scale-[1.01]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      insuranceChoice === "yes"
                        ? "border-green-500"
                        : "border-gray-300"
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
                    <p className="text-xs text-gray-600 mb-3">
                      {t.insuranceDesc}
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBenefits(!showBenefits);
                      }}
                      className="text-xs text-green-600 font-semibold border border-green-500 px-3 py-1.5 rounded-lg hover:bg-green-500 hover:text-white transition-colors"
                    >
                      {showBenefits
                        ? `\u25B2 ${t.hideDetails}`
                        : `\u25BC ${t.showDetails}`}
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        showBenefits
                          ? "max-h-96 mt-3 pt-3 border-t border-green-200"
                          : "max-h-0"
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                        <div className="flex items-center gap-2">
                          🚌 {t.transportDelay}
                        </div>
                        <div className="flex items-center gap-2">
                          ⚖️ {t.courtSummons}
                        </div>
                        <div className="flex items-center gap-2">
                          🏠 {t.burglary}
                        </div>
                        <div className="flex items-center gap-2">
                          🔥 {t.fire}
                        </div>
                        <div className="flex items-center gap-2">
                          💧 {t.flood}
                        </div>
                        <div className="flex items-center gap-2">
                          🦴 {t.fractures}
                        </div>
                        <div className="flex items-center gap-2">
                          💼 {t.workIncapacity}
                        </div>
                        <div className="flex items-center gap-2">
                          👶 {t.childIllness}
                        </div>
                        <div className="flex items-center gap-2">
                          📋 {t.jobLoss}
                        </div>
                        <div className="flex items-center gap-2">
                          🏥 {t.seriousIllness}
                        </div>
                        <div className="flex items-center gap-2">
                          💔 {t.deathLoved}
                        </div>
                        <div className="flex items-center gap-2">
                          🚗 {t.carAccident}
                        </div>
                      </div>
                    </div>

                    {insuranceChoice === "yes" && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!formDisabled) setAcceptTerms(!acceptTerms);
                        }}
                        className={`mt-3 pt-3 border-t border-green-200 flex items-center gap-3 cursor-pointer rounded-lg transition-colors ${
                          !acceptTerms
                            ? "bg-red-50 -mx-4 -mb-4 px-4 py-3"
                            : ""
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
                              ✓
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

              {/* No — skip insurance */}
              <div
                onClick={() => !formDisabled && selectInsurance("no")}
                className={`rounded-xl p-4 border-2 transition-all ${
                  formDisabled
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer"
                } ${
                  insuranceChoice === "no"
                    ? "border-gray-500 bg-gray-100 shadow-lg scale-[1.01]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      insuranceChoice === "no"
                        ? "border-gray-500"
                        : "border-gray-300"
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
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t.ticketsLabel} ({checkoutData.selectedSeats.length}x)
                  </span>
                  <span className="font-medium text-gray-700">
                    {checkoutData.subtotal.toFixed(2)} {currencySymbol}
                  </span>
                </div>
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
                disabled={isCreatingSession || isUploading || Object.values(formErrors).some(Boolean) || !!docError}
                className="w-full py-3.5 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                {isCreatingSession || isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isUploading ? t.uploadingDocument : t.creatingPayment}
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
          {/* Overlay header */}
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
                  timeLeft < 180
                    ? "text-red-600 animate-pulse"
                    : "text-blue-600"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-green-600">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                ✓
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

          {/* Payment content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[540px] mx-auto p-4 space-y-4">
              {/* Mini event info + total */}
              <div className="text-center pb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">
                  {checkoutData.eventDetails.name}
                </h2>
                <p className="text-lg font-extrabold text-gray-900 mt-1">
                  {displayTotal.toFixed(2)} {currencySymbol}
                </p>
              </div>

              <CheckoutProvider
                stripe={stripePromise}
                options={{
                  clientSecret,
                  elementsOptions: { appearance: stripeAppearance },
                }}
              >
                <PaymentSection
                  total={displayTotal}
                  currency={checkoutData.currency}
                  t={t}
                  billingAddress={{
                    name: form.name.trim(),
                    country: billingCountry,
                    line1: form.billingAddress.trim(),
                    city: form.billingCity.trim(),
                    postal_code: form.billingPostalCode.trim(),
                  }}
                />
              </CheckoutProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
