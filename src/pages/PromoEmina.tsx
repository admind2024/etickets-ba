import { useState, useMemo } from "react";
import { Minus, Plus, Loader2, Calendar, Clock, MapPin, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";

// ─── Hardkodirani podaci ───
const EVENT = {
  name: "Emina Jahovic",
  date: "2026-03-06",
  dateDisplay: "06.03.2026",
  time: "21:00",
  venue: "Bemax Arena",
  id: "f0b13dbe-5f1d-4d0a-8a03-e4dba2a30197",
  image: "https://hvpytasddzeprgqkwlbu.supabase.co/storage/v1/object/public/event-images/events/emina-jahovic-bemax-arena-podgorica-2026-03-06-21-00-1769098625252.jpg",
  currency: "EUR",
  serviceFeePercentage: 5,
};

const PROMO_CATEGORY = "Tribina sjever";
const PROMO_PRICE = 15;
const MAX_TICKETS = 10;
const INSURANCE_PERCENTAGE = 0.07;
const CURRENCY_SYMBOL = "€";

const PromoEmina = () => {
  const [quantity, setQuantity] = useState(0);
  const [insuranceChoice, setInsuranceChoice] = useState<"yes" | "no" | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = useMemo(() => quantity * PROMO_PRICE, [quantity]);

  const serviceFee = useMemo(() => {
    if (subtotal === 0) return 0;
    const percentageFee = subtotal * (EVENT.serviceFeePercentage / 100);
    const fixedFee = 0.3;
    return Math.round((percentageFee + fixedFee) * 100) / 100;
  }, [subtotal]);

  const insurancePrice = useMemo(() => Math.round(subtotal * INSURANCE_PERCENTAGE * 100) / 100, [subtotal]);
  const insuranceTotal = insuranceChoice === "yes" ? insurancePrice : 0;
  const grandTotal = subtotal + serviceFee + insuranceTotal;

  const formatPrice = (n: number) => n.toFixed(2) + " " + CURRENCY_SYMBOL;

  const handleCheckout = async () => {
    if (quantity === 0) return;
    if (insuranceChoice === null) {
      alert("Molimo odaberite da li želite osiguranje.");
      return;
    }
    if (insuranceChoice === "yes" && !acceptTerms) {
      alert("Morate prihvatiti uslove osiguranja!");
      return;
    }

    setIsProcessing(true);

    try {
      const selectedTickets = Array(quantity).fill(null).map(() => ({
        type: PROMO_CATEGORY,
        category: PROMO_CATEGORY,
        categoryName: PROMO_CATEGORY,
        name: PROMO_CATEGORY,
        price: PROMO_PRICE,
        seatNumber: `${PROMO_CATEGORY}, slobodno sjedenje`,
        sectionLabel: PROMO_CATEGORY,
      }));

      const checkoutData = {
        eventId: EVENT.id,
        selectedTickets,
        eventDetails: {
          name: EVENT.name,
          date: EVENT.date,
          time: EVENT.time,
          venue: EVENT.venue,
        },
        hasInsurance: insuranceChoice === "yes",
        insurancePrice: insuranceChoice === "yes" ? insurancePrice : 0,
        subtotal,
        serviceFee,
        total: grandTotal,
        currency: EVENT.currency,
      };

      const { data, error } = await supabase.functions.invoke("create-checkout-session-simple", {
        body: checkoutData,
      });

      if (error) throw new Error(error.message || "Greška pri pozivu funkcije");

      if (data?.success && data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.message || "Greška pri kreiranju checkout sesije");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert("Greška pri plaćanju: " + error.message + "\n\nMolimo kontaktirajte podršku: support@etickets.me");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="Specijalna ponuda - Emina Jahovic | etickets"
        description="Specijalna ponuda za članove Sindikata Telekoma Crne Gore i Instituta sertifikovanih računovođa Crne Gore - Emina Jahovic, Bemax Arena, 06.03.2026"
        noIndex
      />

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={EVENT.image} alt={EVENT.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-12 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
              Specijalna ponuda
            </span>
            <span className="bg-yellow-400 text-yellow-900 rounded-full px-4 py-1.5 text-xs font-bold">
              8. mart poklon
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{EVENT.name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/80 mb-5">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{EVENT.venue}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{EVENT.dateDisplay}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{EVENT.time}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-sm leading-relaxed text-left">
            <p>
              Ova specijalna ponuda važi za članove Sindikata Telekoma Crne Gore i članove Instituta sertifikovanih računovođa Crne Gore, koji su kroz saradnju sa AP Production obezbijedili 8. martovski poklon —
              cijenu od <strong className="text-yellow-300">{PROMO_PRICE} EUR</strong> za kategoriju <strong>{PROMO_CATEGORY}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Ticket selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-sm font-semibold text-gray-900">{PROMO_CATEGORY}</span>
                  <span className="text-sm text-gray-400 ml-2">{formatPrice(PROMO_PRICE)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setQuantity(Math.max(0, quantity - 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-30"
                  disabled={quantity === 0}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-lg font-bold text-gray-900 w-6 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(MAX_TICKETS, quantity + 1))}
                  className="w-8 h-8 rounded-full border border-blue-500 bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-all disabled:opacity-30"
                  disabled={quantity >= MAX_TICKETS}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {quantity > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100 text-right text-xs text-gray-500">
                {quantity} x {formatPrice(PROMO_PRICE)} = <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Insurance + checkout - only show when tickets selected */}
        {quantity > 0 && (
          <>
            {/* Insurance card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-5 md:p-6">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-base font-bold text-gray-900">Želiš li osiguranje ulaznica?</h3>
                  <span className="bg-red-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">OBAVEZNO</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">Molimo izaberi jednu od opcija da bi nastavio kupovinu</p>

                {/* Yes insurance */}
                <div
                  onClick={() => { setInsuranceChoice("yes"); }}
                  className={`rounded-xl p-4 mb-3 cursor-pointer border-2 transition-all ${
                    insuranceChoice === "yes"
                      ? "border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      insuranceChoice === "yes" ? "border-green-500" : "border-gray-300"
                    }`}>
                      {insuranceChoice === "yes" && <div className="w-3.5 h-3.5 rounded-full bg-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">Želim da osiguram ulaznice</span>
                          <span className="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">100% POVRAT</span>
                        </div>
                        <span className="text-base font-bold text-green-600 flex-shrink-0">+{formatPrice(insurancePrice)}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Kompletna zaštita u slučaju nepredviđenih okolnosti.</p>

                      <button
                        onClick={(e) => { e.stopPropagation(); setShowBenefits(!showBenefits); }}
                        className="text-xs text-green-600 font-semibold border border-green-500 px-3 py-1.5 rounded-lg hover:bg-green-500 hover:text-white transition-colors"
                      >
                        {showBenefits ? "Sakrij detalje" : "Vidi šta je pokriveno"}
                      </button>

                      <div className={`overflow-hidden transition-all duration-300 ${showBenefits ? "max-h-96 mt-3 pt-3 border-t border-green-200" : "max-h-0"}`}>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                          <div>Kašnjenje prevoza</div>
                          <div>Poziv na sud</div>
                          <div>Provala/krađa u stan</div>
                          <div>Požar u stanu/kući</div>
                          <div>Poplava u stanu/kući</div>
                          <div>Prelomi kostiju</div>
                          <div>Nesposobnost za rad</div>
                          <div>Bolest djeteta</div>
                          <div>Gubitak zaposlenja</div>
                          <div>Teška bolest</div>
                          <div>Smrt bliske osobe</div>
                          <div>Saobraćajna nesreća</div>
                        </div>
                      </div>

                      {insuranceChoice === "yes" && (
                        <div
                          onClick={(e) => { e.stopPropagation(); setAcceptTerms(!acceptTerms); }}
                          className={`mt-3 pt-3 border-t border-green-200 flex items-center gap-3 cursor-pointer rounded-lg transition-colors ${
                            !acceptTerms ? "bg-red-50 -mx-4 -mb-4 px-4 py-3" : ""
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            acceptTerms ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"
                          }`}>
                            {acceptTerms && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <span className="text-xs text-gray-700">
                            Prihvatam{" "}
                            <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              className="text-green-600 underline font-semibold">uslove osiguranja</a>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* No insurance */}
                <div
                  onClick={() => { setInsuranceChoice("no"); setAcceptTerms(false); }}
                  className={`rounded-xl p-4 cursor-pointer border-2 transition-all ${
                    insuranceChoice === "no"
                      ? "border-gray-500 bg-gray-100 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      insuranceChoice === "no" ? "border-gray-500" : "border-gray-300"
                    }`}>
                      {insuranceChoice === "no" && <div className="w-3.5 h-3.5 rounded-full bg-gray-500" />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900">Ne želim osiguranje</span>
                      <p className="text-xs text-gray-500 mt-1">Nastavit ću bez dodatne zaštite</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order summary + checkout */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-5 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Pregled narudžbe</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>{PROMO_CATEGORY} ({quantity}x)</span>
                    <span className="font-medium text-gray-700">{formatPrice(subtotal)}</span>
                  </div>
                  {insuranceChoice === "yes" && (
                    <div className="flex justify-between text-green-600">
                      <span>Osiguranje</span>
                      <span className="font-medium">+{formatPrice(insurancePrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>Servisna naknada</span>
                    <span className="font-medium text-gray-700">{formatPrice(serviceFee)}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center mb-5">
                  <span className="text-base font-bold text-gray-900">UKUPNO</span>
                  <span className="text-2xl font-extrabold text-gray-900">{formatPrice(grandTotal)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || insuranceChoice === null}
                  className="w-full py-3.5 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Procesiranje...</>
                  ) : (
                    "Nastavi na plaćanje"
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-2">Sigurna SSL enkripcija • Zaštićeno plaćanje</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PromoEmina;
