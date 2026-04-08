import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RotateCcw, ShieldCheck, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import SEO from "@/components/SEO";

const RefundPolicy = () => {
  const { lang: urlLang } = useParams<{ lang?: string }>();
  const { lang: contextLang } = useLanguage();
  const activeLang = urlLang || contextLang || "bs";

  const seoContent = {
    bs: {
      title: "Povrat novca i reklamacije | etickets",
      description: "Sve o vraćanju ulaznica, refundaciji i osiguranju ulaznica na etickets platformi.",
    },
    en: {
      title: "Refunds and Complaints | etickets",
      description: "Everything about returning tickets, refunds and ticket insurance on etickets platform.",
    },
  };

  const seo = seoContent[activeLang as keyof typeof seoContent] || seoContent.bs;

  const translations = {
    bs: {
      title: "Povrat novca i reklamacije",
      subtitle: "Sve što trebate znati o vraćanju ulaznica, refundaciji i osiguranju ulaznica.",
      insuranceTitle: "Osiguranje ulaznica",
      insuranceSubtitle: "100% POVRAT NOVCA",
      insuranceText: "Kompletna zaštita u slučaju nepredviđenih okolnosti. Pun povrat novca garantovan –",
      insuranceTextBold: "uključujući cijenu ulaznice i troškove obrade",
      insuranceTip: "Preporuka:",
      insuranceTipText:
        "Osigurajte svoje ulaznice prilikom kupovine i budite potpuno zaštićeni. U slučaju bilo koje od navedenih okolnosti, vraćamo vam puni iznos – i cijenu ulaznice i troškove obrade (fee).",
      insuranceCoverage: [
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
      ],
      refundRightsTitle: "Pravo na povrat novca",
      refundRights: [
        "Otkazivanje događaja",
        "Odlaganje događaja na rok duži od 120 dana",
        "Odlaganje zbog više sile duže od 180 dana",
      ],
      refundNote: "Napomena:",
      refundNoteText: "Za povrat sredstava potrebni su fiskalni račun i ulaznica.",
      noRefundTitle: "Nije moguć povrat",
      noRefund: [
        "Odustajanje od kupovine nakon plaćanja",
        "Povezani troškovi (prevoz, smještaj, isporuka)",
        "Troškovi obrade (5% + 20 centi)",
      ],
      partialRefundTitle: "Djelimični povrat sredstava",
      partialRefundText: "U posebnim okolnostima možemo razmotriti djelimični povrat u iznosu od",
      partialRefundPercent: "80%",
      partialRefundText2: "vrijednosti ulaznice.",
      partialRefundNote: "Troškovi obrade (2.30 EUR) se ne refundiraju. Za više informacija kontaktirajte nas na",
      // Glavni sadržaj
      mainTitle1: "Pravo na vraćanje ulaznica",
      mainText1: "Pravo na vraćanje ulaznica i povrat novca kupac ima samo u sledećim slučajevima:",
      mainList1: [
        "Otkazivanje događaja",
        "Odlaganje događaja na rok duži od 120 dana od dana planiranog održavanja događaja",
        "Odlaganje događaja zbog nastupanja više sile koja traje duže od 180 dana od dana planiranog održavanja događaja",
      ],
      forceTitle: "Viša sila",
      forceText1:
        "Viša sila, tokom koje miruju obaveze Organizatora, nastupa kada Organizator događaja nije u stanju da ispuni svoju obavezu održavanja događaja zbog rata, pobune, terorističkih akata, štrajkova, nesreća, požara, blokade, poplave, odluke ili akcije epidemiološke vlasti, prirodne katastrofe, teškog poremećaja u snabdevanju energijom ili bilo čega drugog, iz razloga koji je van njegove moći i kontrole.",
      forceText2:
        "Ako je događaj otkazan ili odložen zbog navedenih okolnosti, Rakunat će o tome obavijestiti kupce što je prije moguće putem veb-sajta www.e-tickets.me ili drugim kanalima komunikacije.",
      refundTitle: "Povraćaj sredstava",
      refundText1:
        "U slučaju povraćaja sredstava kupcu koji je prethodno platio nekom od platnih kartica, djelimično ili u cjelosti, a bez obzira na razlog vraćanja, taj povraćaj se vrši isključivo preko iste VISA, Maestro ili MasterCard kartice koja je korištena za plaćanje. Ovo znači da će naša banka na naš zahtjev obaviti povraćaj sredstava na račun korisnika kartice.",
      refundText2:
        "U slučaju povraćaja novca za kupovinu obavljenu na Internet prodavnici, kupcu će biti vraćen iznos cijene ulaznice za predmetni događaj. Kupcu neće biti izvršen povraćaj troškova obrade od 5% od cijene ulaznice + 20 centi za trošak koji naplaćuje softver za mapiranje sjedišta, budući da se usluga Rakunat-a smatra u cjelosti pruženom u trenutku kupovine ulaznice, o čemu je kupac obavješten i na šta pristaje.",
      refundText3:
        "U slučaju otkazivanja ili odlaganja događaja ili drugih promjena programa u vezi sa događajem, ni u kom slučaju neće biti izvršen povraćaj novca za povezane troškove (npr. prevoz, hotelski smještaj, troškovi isporuke itd.).",
      complaintTitle: "Reklamacija",
      complaintText1:
        "Uvođenjem Zakona o fiskalizaciji u prometu proizvoda i usluga, ulaznica više nema vrijednost računa već se izdaje račun uz kupljenu ulaznicu i kojeg je potrebno sačuvati do dana održavanja događaja. Ukoliko se događaj odloži ili otkaže, nije moguće vratiti ulaznicu i ostvariti reklamaciju odnosno povrat sredstava bez predaje računa koji dokazuju kupovinu ulaznice.",
      complaintText2: "Email adresa za prijavu reklamacija:",
      obligationTitle: "Obaveza vraćanja novca i isključenje odgovornosti",
      obligation1:
        "Rakunat nije organizator ponuđenih događanja. Događaj organizuje, vodi i realizuje organizator, koji takođe izdaje ulaznice. Organizator je isključivo odgovoran za povraćaj novca kupcima u slučaju otkazivanja ili odlaganja događaja.",
      obligation2:
        "RAKUNAT D.O.O. deluje isključivo kao distributer za prodaju ulaznica u ime organizatora, zbog čega ne snosi nikakvu odgovornost u vezi sa organizacijom i/ili održavanjem događaja, te nije odgovoran za povraćaj novca kupcima u slučajevima otkazivanja ili odlaganja događaja.",
      obligation3:
        "Rakunat ima obavezu povraćaja novca kupcima ulaznica u ime Organizatora jedino u sledećim slučajevima:",
      obligation3List: [
        "novac koji je naplatio u ime Organizatora nije prenio tom Organizatoru i uz jasan nalog u pisanoj formi od strane Organizatora da u njegovo ime izvrši povraćaj novca kupcima; ili",
        "Organizator je prenio sredstva Rakunat-u u svrhu vraćanja novca kupcima ulaznica sa jasnim nalogom da izvrši povraćaj novca kupcima u ime Organizatora.",
      ],
      obligation4:
        "U slučajevima kada Rakunat ima obavezu povraćaja novca kupcima ulaznica u ime Organizatora, Rakunat će izvršiti povraćaj novca na tekući račun kupca ili na prodajnom mestu gdje su ulaznice kupljene, i to u roku od:",
      obligation4List: [
        "90 dana od dana otkazivanja događaja,",
        "60 dana od dana planiranog održavanja događaja koji je odložen na rok duži od 120 dana, i",
        "240 dana od dana planiranog održavanja događaja u slučaju nastupanja više sile u trajanju preko 180 dana usled koje Organizator nije u mogućnosti da održi događaj,",
      ],
      obligation4End: "a sve pod uslovom da je kupac podnio zahtjev za vraćanje novca.",
    },
    en: {
      title: "Refunds and Complaints",
      subtitle: "Everything you need to know about returning tickets, refunds and ticket insurance.",
      insuranceTitle: "Ticket Insurance",
      insuranceSubtitle: "100% MONEY BACK",
      insuranceText: "Complete protection in case of unforeseen circumstances. Full refund guaranteed –",
      insuranceTextBold: "including ticket price and processing fees",
      insuranceTip: "Recommendation:",
      insuranceTipText:
        "Insure your tickets when purchasing and be fully protected. In case of any of the listed circumstances, we will refund the full amount – both the ticket price and processing fees.",
      insuranceCoverage: [
        { icon: "🚌", text: "Transport delay" },
        { icon: "⚖️", text: "Court summons" },
        { icon: "🏠", text: "Burglary/theft at home" },
        { icon: "🔥", text: "Fire at home" },
        { icon: "💧", text: "Flood at home" },
        { icon: "🦴", text: "Bone fractures or injuries" },
        { icon: "💼", text: "Temporary incapacity for work" },
        { icon: "👶", text: "Sudden illness of child" },
        { icon: "📋", text: "Job loss" },
        { icon: "🏥", text: "Serious illness" },
        { icon: "💔", text: "Death of a close person" },
        { icon: "🚗", text: "Traffic accident" },
      ],
      refundRightsTitle: "Right to Refund",
      refundRights: [
        "Event cancellation",
        "Event postponement for more than 120 days",
        "Force majeure postponement for more than 180 days",
      ],
      refundNote: "Note:",
      refundNoteText: "Fiscal receipt and ticket are required for refund.",
      noRefundTitle: "Refund Not Possible",
      noRefund: [
        "Withdrawal from purchase after payment",
        "Related costs (transport, accommodation, delivery)",
        "Processing fees (5% + 20 cents)",
      ],
      partialRefundTitle: "Partial Refund",
      partialRefundText: "In special circumstances, we may consider a partial refund of",
      partialRefundPercent: "80%",
      partialRefundText2: "of the ticket value.",
      partialRefundNote: "Processing fees (2.30 EUR) are non-refundable. For more information contact us at",
      // Main content
      mainTitle1: "Right to Return Tickets",
      mainText1: "The buyer has the right to return tickets and receive a refund only in the following cases:",
      mainList1: [
        "Event cancellation",
        "Postponement of the event for more than 120 days from the planned date of the event",
        "Postponement of the event due to force majeure lasting more than 180 days from the planned date of the event",
      ],
      forceTitle: "Force Majeure",
      forceText1:
        "Force majeure, during which the Organizer's obligations are suspended, occurs when the event Organizer is unable to fulfill its obligation to hold the event due to war, rebellion, terrorist acts, strikes, accidents, fire, blockade, flood, decision or action of epidemiological authorities, natural disaster, severe disruption in energy supply, or anything else beyond its power and control.",
      forceText2:
        "If the event is canceled or postponed due to the above circumstances, Rakunat will notify buyers as soon as possible via the website www.e-tickets.me or other communication channels.",
      refundTitle: "Refund of Funds",
      refundText1:
        "In case of refund to a buyer who previously paid with one of the payment cards, partially or in full, regardless of the reason for the return, this refund is made exclusively through the same VISA, Maestro or MasterCard card that was used for payment. This means that our bank will, at our request, refund the funds to the cardholder's account.",
      refundText2:
        "In case of refund for a purchase made in the online store, the buyer will be refunded the ticket price for the event in question. The buyer will not be refunded the processing fee of 5% of the ticket price + 20 cents for the cost charged by the seat mapping software, since Rakunat's service is considered fully provided at the time of ticket purchase, of which the buyer has been informed and to which they agree.",
      refundText3:
        "In case of cancellation or postponement of the event or other changes to the program related to the event, under no circumstances will refunds be made for related costs (e.g. transport, hotel accommodation, delivery costs, etc.).",
      complaintTitle: "Complaints",
      complaintText1:
        "With the introduction of the Law on Fiscalization in the trade of products and services, the ticket no longer has the value of a receipt, but a receipt is issued with the purchased ticket, which must be kept until the day of the event. If the event is postponed or canceled, it is not possible to return the ticket and file a complaint or receive a refund without submitting receipts proving the ticket purchase.",
      complaintText2: "Email address for filing complaints:",
      obligationTitle: "Obligation to Refund and Exclusion of Liability",
      obligation1:
        "Rakunat is not the organizer of the offered events. The event is organized, managed and realized by the organizer, who also issues tickets. The organizer is solely responsible for refunding buyers in case of cancellation or postponement of the event.",
      obligation2:
        "RAKUNAT D.O.O. acts exclusively as a distributor for ticket sales on behalf of the organizer, therefore it bears no responsibility regarding the organization and/or holding of the event, and is not responsible for refunding buyers in cases of cancellation or postponement of the event.",
      obligation3:
        "Rakunat has the obligation to refund ticket buyers on behalf of the Organizer only in the following cases:",
      obligation3List: [
        "the money collected on behalf of the Organizer has not been transferred to that Organizer and with a clear written instruction from the Organizer to make refunds to buyers on their behalf; or",
        "the Organizer has transferred funds to Rakunat for the purpose of refunding ticket buyers with a clear instruction to make refunds to buyers on behalf of the Organizer.",
      ],
      obligation4:
        "In cases where Rakunat has the obligation to refund ticket buyers on behalf of the Organizer, Rakunat will make the refund to the buyer's bank account or at the point of sale where the tickets were purchased, within:",
      obligation4List: [
        "90 days from the date of event cancellation,",
        "60 days from the planned date of the event that has been postponed for more than 120 days, and",
        "240 days from the planned date of the event in case of force majeure lasting more than 180 days due to which the Organizer is unable to hold the event,",
      ],
      obligation4End: "all subject to the buyer having submitted a request for a refund.",
    },
  };

  const t = translations[activeLang as keyof typeof translations] || translations.bs;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={seo.title} description={seo.description} basePath="/povrat-novca" />
      <Header />

      <main className="flex-1 container py-16">
        {/* Hero sekcija */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <RotateCcw className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t.title}</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl text-left">{t.subtitle}</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Osiguranje ulaznica - istaknuto */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-2 border-green-500 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-white">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-800 dark:text-green-200">{t.insuranceTitle}</h2>
                <p className="text-green-600 dark:text-green-400 font-semibold">{t.insuranceSubtitle}</p>
              </div>
            </div>

            <p className="text-green-700 dark:text-green-300 mb-6">
              {t.insuranceText} <strong>{t.insuranceTextBold}</strong>.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {t.insuranceCoverage.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white dark:bg-green-900/30 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-green-800 dark:text-green-200">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/50 rounded-xl">
              <p className="text-green-800 dark:text-green-200 text-sm">
                <strong>💡 {t.insuranceTip}</strong> {t.insuranceTipText}
              </p>
            </div>
          </div>

          {/* Glavne informacije */}
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-sm">
            <div className="prose prose-neutral dark:prose-invert max-w-none text-justify">
              <h2 className="text-2xl font-bold mt-0 mb-4">{t.mainTitle1}</h2>
              <p>{t.mainText1}</p>
              <ul className="list-disc pl-6 space-y-2">
                {t.mainList1.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <h3 className="text-xl font-semibold mt-8 mb-3">{t.forceTitle}</h3>
              <p>{t.forceText1}</p>
              <p>{t.forceText2}</p>

              <h3 className="text-xl font-semibold mt-8 mb-3">{t.refundTitle}</h3>
              <p>{t.refundText1}</p>
              <p>{t.refundText2}</p>
              <p>{t.refundText3}</p>

              <h3 className="text-xl font-semibold mt-8 mb-3">{t.complaintTitle}</h3>
              <p>{t.complaintText1}</p>
              <p>
                {t.complaintText2}{" "}
                <a href="mailto:support@e-tickets.me" className="text-primary hover:underline">
                  support@e-tickets.me
                </a>
              </p>

              <h2 className="text-2xl font-bold mt-10 mb-4">{t.obligationTitle}</h2>

              <p>
                <strong>5.2.1.</strong> {t.obligation1}
              </p>
              <p>
                <strong>5.2.2.</strong> {t.obligation2}
              </p>
              <p>
                <strong>5.2.3.</strong> {t.obligation3}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                {t.obligation3List.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p>
                <strong>5.2.4.</strong> {t.obligation4}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                {t.obligation4List.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p>{t.obligation4End}</p>
            </div>
          </div>

          {/* Važne napomene */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Šta se refundira */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h3 className="text-lg font-bold text-foreground">{t.refundRightsTitle}</h3>
              </div>
              <ul className="space-y-3">
                {t.refundRights.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  <strong>{t.refundNote}</strong> {t.refundNoteText}
                </p>
              </div>
            </div>

            {/* Šta se NE refundira */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-bold text-foreground">{t.noRefundTitle}</h3>
              </div>
              <ul className="space-y-3">
                {t.noRefund.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">✗</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Djelimični povrat */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">{t.partialRefundTitle}</h3>
                <p className="text-blue-700 dark:text-blue-300 mb-3">
                  {t.partialRefundText} <strong>{t.partialRefundPercent}</strong> {t.partialRefundText2}
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-sm">
                  {t.partialRefundNote}{" "}
                  <a href="mailto:support@e-tickets.me" className="underline">
                    support@e-tickets.me
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RefundPolicy;
