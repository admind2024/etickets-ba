// ============================================
// REFUND PAGE - Za Lovable
// Koristi Edge funkcije umjesto RPC
// ============================================

import React, { useState, useEffect } from "react";

// Supabase config
const SUPABASE_URL = "https://hvpytasddzeprgqkwlbu.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper za pozivanje Edge funkcija
async function callEdgeFunction(functionName: string, body?: object) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

// Tipovi
interface EventOption {
  id: string;
  name: string;
  date: string;
  dateFormatted?: string;
}

interface FormData {
  orderNumber: string;
  fullName: string;
  email: string;
  phone: string;
  eventName: string;
  eventId: string;
  ticketCount: number;
  ticketPrice: number;
  currency: string;
  refundReason: string;
  otherReason: string;
  refundMethod: "card" | "bank";
  isForeignCustomer: boolean;
  bankAccount: string;
  accountHolder: string;
  sameAsPurchaser: boolean;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  agreeTerms: boolean;
  agreeProcessing: boolean;
}

const initialFormData: FormData = {
  orderNumber: "",
  fullName: "",
  email: "",
  phone: "",
  eventName: "",
  eventId: "",
  ticketCount: 1,
  ticketPrice: 0,
  currency: "EUR",
  refundReason: "",
  otherReason: "",
  refundMethod: "bank",
  isForeignCustomer: false,
  bankAccount: "",
  accountHolder: "",
  sameAsPurchaser: true,
  requesterName: "",
  requesterEmail: "",
  requesterPhone: "",
  agreeTerms: false,
  agreeProcessing: false,
};

export default function RefundPage() {
  const [lang, setLang] = useState<"mne" | "eng">("mne");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [orderVerified, setOrderVerified] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateMsg, setDuplicateMsg] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [refundId, setRefundId] = useState("");

  const t = translations[lang];
  const refundPercent = formData.refundReason === "cancelled_event" ? 100 : 80;
  const refundAmount = formData.ticketPrice * (refundPercent / 100);

  // Učitaj događaje - poziva Edge funkciju get-refund-events
  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await callEdgeFunction("get-refund-events");
        if (data.success && data.events) {
          setEvents(data.events);
        }
      } catch (e) {
        console.error("Error loading events:", e);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  // Handler za order number
  const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 8);
    setFormData((prev) => ({ ...prev, orderNumber: val }));
    setOrderVerified(false);
    setIsDuplicate(false);
    setDuplicateMsg("");
  };

  // Generisanje varijacija broja narudžbe za slične karaktere (I/l, O/0, 1/l)
  const generateSimilarVariations = (orderNum: string): string[] => {
    const similarChars: Record<string, string[]> = {
      I: ["l", "1"],
      l: ["I", "1"],
      "1": ["l", "I"],
      O: ["0"],
      "0": ["O"],
    };
    const variations: string[] = [];
    for (let i = 0; i < orderNum.length; i++) {
      const ch = orderNum[i];
      if (similarChars[ch]) {
        for (const alt of similarChars[ch]) {
          variations.push(orderNum.slice(0, i) + alt + orderNum.slice(i + 1));
        }
      }
    }
    return variations;
  };

  // Provjera narudžbe na blur - poziva Edge funkcije
  const handleOrderBlur = async () => {
    if (formData.orderNumber.length !== 8) return;

    setOrderLoading(true);
    setError("");

    try {
      // 1. Provjeri duplikat - poziva check-duplicate-refund
      const dupData = await callEdgeFunction("check-duplicate-refund", {
        order_number: formData.orderNumber,
      });

      if (dupData.is_duplicate) {
        setIsDuplicate(true);
        setDuplicateMsg(dupData.message);
        setOrderLoading(false);
        return;
      }

      // 2. Verifikuj narudžbu - poziva verify-order
      const orderData = await callEdgeFunction("verify-order", {
        order_number: formData.orderNumber,
      });

      if (orderData.order_exists) {
        setOrderVerified(true);
        setFormData((prev) => ({
          ...prev,
          fullName: orderData.customer_data?.customer_name || prev.fullName,
          email: orderData.customer_data?.customer_email || prev.email,
          phone: orderData.customer_data?.customer_phone || prev.phone,
          eventName: orderData.event_name || prev.eventName,
          eventId: orderData.event_id || prev.eventId,
          ticketCount: orderData.ticket_count || prev.ticketCount,
          ticketPrice: Number(orderData.total_price) || prev.ticketPrice,
          currency: orderData.currency || prev.currency,
        }));
      } else {
        // 3. Ako nije pronađeno, probaj varijacije sličnih karaktera (I/l/1, O/0)
        const variations = generateSimilarVariations(formData.orderNumber);
        let found = false;

        for (const variant of variations) {
          const varData = await callEdgeFunction("verify-order", {
            order_number: variant,
          });
          if (varData.order_exists) {
            found = true;
            setOrderVerified(true);
            setFormData((prev) => ({
              ...prev,
              orderNumber: variant,
              fullName: varData.customer_data?.customer_name || prev.fullName,
              email: varData.customer_data?.customer_email || prev.email,
              phone: varData.customer_data?.customer_phone || prev.phone,
              eventName: varData.event_name || prev.eventName,
              eventId: varData.event_id || prev.eventId,
              ticketCount: varData.ticket_count || prev.ticketCount,
              ticketPrice: Number(varData.total_price) || prev.ticketPrice,
              currency: varData.currency || prev.currency,
            }));
            break;
          }
        }

        if (!found) {
          setError(orderData.message || t.orderRequired);
        }
      }
    } catch (e) {
      console.error("Order lookup error:", e);
      setError("Greška pri provjeri narudžbe");
    } finally {
      setOrderLoading(false);
    }
  };

  // Submit - poziva Edge funkciju create-refund-request
  const handleSubmit = async () => {
    if (!orderVerified) {
      setError(t.orderRequired);
      return;
    }

    if (!formData.agreeTerms || !formData.agreeProcessing) {
      setError(lang === "mne" ? "Morate prihvatiti uslove" : "You must accept the terms");
      return;
    }

    setSubmitLoading(true);
    setError("");

    try {
      const result = await callEdgeFunction("create-refund-request", {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        order_number: formData.orderNumber,
        same_as_purchaser: formData.sameAsPurchaser,
        requester_name: formData.requesterName || null,
        requester_email: formData.requesterEmail || null,
        requester_phone: formData.requesterPhone || null,
        event_name: formData.eventName,
        event_id: formData.eventId || null,
        ticket_count: formData.ticketCount,
        ticket_price: formData.ticketPrice,
        raw_ticket_price: formData.ticketPrice,
        currency: formData.currency,
        refund_reason: formData.refundReason,
        other_reason: formData.otherReason || null,
        refund_method: formData.refundMethod,
        is_foreign_customer: formData.isForeignCustomer,
        bank_account: formData.bankAccount || null,
        account_holder: formData.accountHolder || null,
        terms_accepted: formData.agreeTerms,
        data_processing_accepted: formData.agreeProcessing,
      });

      if (result.success) {
        setSuccess(true);
        setRefundId(result.refund_id || "");
        setFormData(initialFormData);
        setOrderVerified(false);
      } else if (result.is_duplicate) {
        setIsDuplicate(true);
        setDuplicateMsg(result.message);
      } else {
        setError(result.error || "Došlo je do greške");
      }
    } catch (e: any) {
      setError(e.message || "Greška pri slanju");
    } finally {
      setSubmitLoading(false);
    }
  };

  const update = (updates: Partial<FormData>) => setFormData((prev) => ({ ...prev, ...updates }));
  const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString("hr-HR") : "");

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Language */}
        <div className="flex justify-end gap-2 mb-3">
          <button
            onClick={() => setLang("mne")}
            className={`px-3 py-1 text-sm font-semibold rounded-full border-2 border-blue-500 ${lang === "mne" ? "bg-blue-600 text-white" : "text-blue-600"}`}
          >
            🇲🇪 MNE
          </button>
          <button
            onClick={() => setLang("eng")}
            className={`px-3 py-1 text-sm font-semibold rounded-full border-2 border-blue-500 ${lang === "eng" ? "bg-blue-600 text-white" : "text-blue-600"}`}
          >
            🇬🇧 ENG
          </button>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-t-lg p-4">
          <h1 className="text-white text-xl font-bold text-center">{t.title}</h1>
        </div>

        {/* Success */}
        {success && (
          <div className="bg-white border-l-4 border-green-500 p-4 rounded-md my-4 shadow">
            <h3 className="font-bold text-green-700 mb-2">✓ {t.successTitle}</h3>
            <p className="text-sm text-gray-700">{t.successMessage}</p>
            {refundId && (
              <p className="text-xs mt-2">
                {t.refNumber}: <span className="font-bold text-blue-600">{refundId.substring(0, 8).toUpperCase()}</span>
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md my-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-b-lg shadow p-4 space-y-6">
          {/* Reason */}
          <Section title={t.refundReason} icon="?">
            <select
              value={formData.refundReason}
              onChange={(e) => update({ refundReason: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-md"
            >
              <option value="">{t.selectReason}</option>
              {Object.entries(t.reasons).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {formData.refundReason && (
              <div
                className={`mt-2 p-2 rounded text-sm ${formData.refundReason === "cancelled_event" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
              >
                {formData.refundReason === "cancelled_event" ? t.fullRefund : t.partialRefund}
              </div>
            )}
            {formData.refundReason === "other" && (
              <textarea
                value={formData.otherReason}
                onChange={(e) => update({ otherReason: e.target.value })}
                placeholder={t.otherReasonPlaceholder}
                className="w-full p-2.5 border border-gray-300 rounded-md mt-2"
                rows={3}
              />
            )}
          </Section>

          {/* Order */}
          <Section title={t.findOrder} icon="🔍">
            <input
              type="text"
              value={formData.orderNumber}
              onChange={handleOrderChange}
              onBlur={handleOrderBlur}
              maxLength={8}
              placeholder="AB12CD34"
              className={`w-full p-2.5 border rounded-md font-mono text-lg tracking-wider ${orderVerified ? "border-green-500 bg-green-50" : "border-gray-300"}`}
            />
            <p className="text-xs text-gray-500 mt-1">{t.orderHint}</p>

            {orderLoading && (
              <div className="text-center py-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}

            {orderVerified && !orderLoading && (
              <div className="mt-2 p-2 bg-green-50 border border-green-500 rounded text-sm text-green-700">
                ✓ {t.orderFound}
              </div>
            )}

            {isDuplicate && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-500 rounded text-sm text-yellow-700">
                ⚠️ {duplicateMsg}
              </div>
            )}

            {!orderVerified &&
              !isDuplicate &&
              !orderLoading &&
              formData.orderNumber.length > 0 &&
              formData.orderNumber.length !== 8 && <p className="text-xs text-yellow-600 mt-1">{t.orderRequired}</p>}
          </Section>

          {/* Customer */}
          <Section title={t.customerInfo} icon="👤">
            <Input
              label={t.fullName}
              value={formData.fullName}
              onChange={(e) => update({ fullName: e.target.value })}
            />
            <Input
              label={t.email}
              type="email"
              value={formData.email}
              onChange={(e) => update({ email: e.target.value })}
            />
            <Input
              label={t.phone}
              type="tel"
              value={formData.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />

            <div className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={formData.sameAsPurchaser}
                onChange={(e) => update({ sameAsPurchaser: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">{t.sameAsPurchaser}</label>
            </div>

            {!formData.sameAsPurchaser && (
              <div className="bg-gray-50 p-3 rounded mt-2 space-y-2">
                <Input
                  label={t.applicantName}
                  value={formData.requesterName}
                  onChange={(e) => update({ requesterName: e.target.value })}
                />
                <Input
                  label={t.applicantEmail}
                  type="email"
                  value={formData.requesterEmail}
                  onChange={(e) => update({ requesterEmail: e.target.value })}
                />
                <Input
                  label={t.applicantPhone}
                  type="tel"
                  value={formData.requesterPhone}
                  onChange={(e) => update({ requesterPhone: e.target.value })}
                />
              </div>
            )}
          </Section>

          {/* Event */}
          <Section title={t.eventInfo} icon="📅">
            <select
              value={formData.eventName}
              onChange={(e) => {
                const selected = events.find((ev) => ev.name === e.target.value);
                update({
                  eventName: e.target.value,
                  eventId: selected?.id || "",
                });
              }}
              className="w-full p-2.5 border border-gray-300 rounded-md"
            >
              <option value="">{t.selectEvent}</option>
              {events.map((e) => (
                <option key={e.id} value={e.name}>
                  {e.name} - {e.dateFormatted || formatDate(e.date)}
                </option>
              ))}
            </select>

            <div className="flex gap-2 mt-3">
              <div className="flex-1">
                <label className="text-sm text-gray-600">{t.ticketCount}</label>
                <input
                  type="number"
                  value={formData.ticketCount}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-gray-600">{t.totalPrice}</label>
                <div className="flex">
                  <input
                    type="number"
                    value={formData.ticketPrice}
                    readOnly
                    className="flex-1 p-2 border border-gray-300 rounded-l bg-gray-100"
                  />
                  <span className="px-3 py-2 bg-gray-200 border border-l-0 border-gray-300 rounded-r text-sm">
                    {formData.currency}
                  </span>
                </div>
              </div>
            </div>

            {formData.ticketPrice > 0 && formData.refundReason && (
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">
                    {refundPercent}% {t.refundLabel}:
                  </span>
                  <span className="font-bold text-blue-700">
                    {refundAmount.toFixed(2)} {formData.currency}
                  </span>
                </div>
              </div>
            )}
          </Section>

          {/* Payment */}
          <Section title={t.refundMethod} icon="💳">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={formData.isForeignCustomer}
                onChange={(e) =>
                  update({ isForeignCustomer: e.target.checked, refundMethod: e.target.checked ? "card" : "bank" })
                }
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-700">{t.foreignCustomer}</label>
            </div>

            {formData.isForeignCustomer && (
              <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mb-3">{t.foreignNotice}</p>
            )}

            <div className="space-y-2">
              <div
                onClick={() => formData.isForeignCustomer && update({ refundMethod: "card" })}
                className={`p-3 border rounded cursor-pointer ${formData.refundMethod === "card" ? "border-blue-500 bg-blue-50" : "border-gray-200"} ${!formData.isForeignCustomer ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="font-medium text-sm">{t.refundToCard}</div>
                <div className="text-xs text-gray-500">
                  {formData.isForeignCustomer ? t.cardDesc : t.cardOnlyForeign}
                </div>
              </div>
              <div
                onClick={() => update({ refundMethod: "bank" })}
                className={`p-3 border rounded cursor-pointer ${formData.refundMethod === "bank" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
              >
                <div className="font-medium text-sm">{t.refundToBank}</div>
                <div className="text-xs text-gray-500">{t.bankDesc}</div>
              </div>
            </div>

            {formData.refundMethod === "bank" && !formData.isForeignCustomer && (
              <div className="mt-3 space-y-2">
                <Input
                  label={t.bankAccount}
                  value={formData.bankAccount}
                  onChange={(e) => update({ bankAccount: e.target.value })}
                />
                <Input
                  label={t.accountHolder}
                  value={formData.accountHolder}
                  onChange={(e) => update({ accountHolder: e.target.value })}
                />
              </div>
            )}
          </Section>

          {/* Agreements */}
          <div className="space-y-3">
            <Checkbox
              checked={formData.agreeTerms}
              onChange={(e) => update({ agreeTerms: e.target.checked })}
              label={t.agreeTerms}
            />
            <Checkbox
              checked={formData.agreeProcessing}
              onChange={(e) => update({ agreeProcessing: e.target.checked })}
              label={t.agreeProcessing}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!orderVerified || isDuplicate || submitLoading}
            className={`w-full py-3 rounded-md font-semibold text-white ${orderVerified && !isDuplicate ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
          >
            {submitLoading ? t.submitting : t.submit}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-4">
          {t.footer}{" "}
          <a href="mailto:support@etickets.ba" className="text-blue-600">
            support@etickets.ba
          </a>
        </p>
      </div>

      {/* Loading overlay */}
      {submitLoading && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// Helper komponente
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-blue-100 px-3 py-2 rounded flex items-center mb-3">
        <span className="mr-2">{icon}</span>
        <span className="text-sm font-semibold text-blue-800">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Input({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="mb-2">
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} className="w-full p-2.5 border border-gray-300 rounded-md" />
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}) {
  return (
    <div className="border border-blue-200 p-2.5 rounded flex items-start gap-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-1 w-4 h-4" />
      <label className="text-xs text-blue-700 font-medium">{label}</label>
    </div>
  );
}

// Translations
const translations = {
  mne: {
    title: "Zahtjev za povrat sredstava",
    loading: "Učitavanje...",
    refundReason: "Razlog za povrat",
    findOrder: "Pronađi narudžbu",
    customerInfo: "Podaci o kupcu",
    eventInfo: "Podaci o događaju",
    refundMethod: "Način povrata",
    selectReason: "Odaberite razlog",
    reasons: {
      cancelled_event: "Otkazan događaj (100% povrat)",
      personal_reasons: "Lični razlozi (80% povrat)",
      health_issues: "Zdravstveni problemi (80% povrat)",
      transport_issues: "Problemi sa prevozom (80% povrat)",
      lineup_changes: "Promjene u programu (80% povrat)",
      weather_conditions: "Loše vremenske prilike (80% povrat)",
      other: "Drugi razlog (80% povrat)",
    },
    fullRefund: "✓ Otkazan događaj: Povrat 100%",
    partialRefund: "ℹ Djelimični povrat: 80%",
    otherReasonPlaceholder: "Opišite razlog...",
    orderHint: "Broj narudžbe ima 8 karaktera (bez #)",
    orderFound: "Narudžba pronađena!",
    orderRequired: "Unesite ispravan broj narudžbe",
    fullName: "Ime i prezime *",
    email: "Email *",
    phone: "Telefon *",
    sameAsPurchaser: "Ja sam kupac ulaznice",
    applicantName: "Ime podnosioca *",
    applicantEmail: "Email podnosioca *",
    applicantPhone: "Telefon podnosioca *",
    selectEvent: "Izaberite događaj",
    ticketCount: "Broj ulaznica",
    totalPrice: "Ukupna cijena",
    refundLabel: "povrat",
    foreignCustomer: "Strani državljanin",
    foreignNotice: "Povrat na karticu kojom ste platili.",
    refundToCard: "Povrat na karticu",
    refundToBank: "Povrat na bankovni račun",
    cardOnlyForeign: "Samo za strane državljane",
    cardDesc: "Na karticu kojom ste platili",
    bankDesc: "Na žiro račun",
    bankAccount: "Broj žiro računa *",
    accountHolder: "Vlasnik računa *",
    agreeTerms: "Potvrđujem tačnost podataka i upoznat sam sa uslovima *",
    agreeProcessing: "Saglasan sam sa obradom ličnih podataka *",
    submit: "Pošalji zahtjev",
    submitting: "Slanje...",
    successTitle: "Zahtjev podnesen!",
    successMessage: "Bićete obaviješteni o odluci u roku od 24h.",
    refNumber: "Referentni broj",
    footer: "Kontakt:",
  },
  eng: {
    title: "Refund Request",
    loading: "Loading...",
    refundReason: "Reason for refund",
    findOrder: "Find order",
    customerInfo: "Customer info",
    eventInfo: "Event info",
    refundMethod: "Refund method",
    selectReason: "Select reason",
    reasons: {
      cancelled_event: "Cancelled event (100%)",
      personal_reasons: "Personal reasons (80%)",
      health_issues: "Health issues (80%)",
      transport_issues: "Transport issues (80%)",
      lineup_changes: "Lineup changes (80%)",
      weather_conditions: "Bad weather (80%)",
      other: "Other reason (80%)",
    },
    fullRefund: "✓ Cancelled event: 100% refund",
    partialRefund: "ℹ Partial refund: 80%",
    otherReasonPlaceholder: "Describe reason...",
    orderHint: "Order number has 8 characters",
    orderFound: "Order found!",
    orderRequired: "Enter valid order number",
    fullName: "Full name *",
    email: "Email *",
    phone: "Phone *",
    sameAsPurchaser: "I am the ticket buyer",
    applicantName: "Applicant name *",
    applicantEmail: "Applicant email *",
    applicantPhone: "Applicant phone *",
    selectEvent: "Select event",
    ticketCount: "Tickets",
    totalPrice: "Total price",
    refundLabel: "refund",
    foreignCustomer: "Foreign citizen",
    foreignNotice: "Refund to the card used for payment.",
    refundToCard: "Refund to card",
    refundToBank: "Refund to bank",
    cardOnlyForeign: "For foreign citizens only",
    cardDesc: "To payment card",
    bankDesc: "To bank account",
    bankAccount: "Bank account *",
    accountHolder: "Account holder *",
    agreeTerms: "I confirm accuracy and accept terms *",
    agreeProcessing: "I agree to data processing *",
    submit: "Submit request",
    submitting: "Submitting...",
    successTitle: "Request submitted!",
    successMessage: "You will be notified within 24h.",
    refNumber: "Reference",
    footer: "Contact:",
  },
};
