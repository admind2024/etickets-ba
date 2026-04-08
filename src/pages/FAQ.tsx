import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChevronDown, Mail, HelpCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import SEO from "@/components/SEO";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem = ({ question, answer, isOpen, onClick }: FAQItemProps) => {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
      <button
        onClick={onClick}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-muted/50 transition-colors duration-200"
      >
        <span className="text-lg font-medium text-foreground pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-primary flex-shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-5 pt-2 text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border/50">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { lang: urlLang } = useParams<{ lang?: string }>();
  const { lang: contextLang } = useLanguage();
  const activeLang = urlLang || contextLang || "bs";

  const seoTranslations = {
    bs: {
      title: "Česta pitanja | e-tickets",
      description: "Pronađite odgovore na najčešća pitanja o kupovini ulaznica na e-tickets. Informacije o dostavi, plaćanju i povratku ulaznica.",
    },
    en: {
      title: "Frequently Asked Questions | e-tickets",
      description: "Find answers to the most common questions about buying tickets on e-tickets. Information about delivery, payment and ticket refunds.",
    },
  };

  const seo = seoTranslations[activeLang as keyof typeof seoTranslations] || seoTranslations.bs;

  const translations = {
    bs: {
      title: "Česta pitanja",
      subtitle: "Pronađite odgovore na najčešća pitanja o kupovini ulaznica, dostavi i plaćanju.",
      contactTitle: "Imate dodatna pitanja?",
      contactText: "Naš tim za podršku je tu da vam pomogne. Javite nam se i odgovorićemo u najkraćem roku.",
      faqs: [
        {
          question: "Gdje mogu pogledati uslove korištenja i izjavu o privatnosti?",
          answer:
            "Da biste pogledali naše uslove korištenja i izjavu o privatnosti, molimo Vas kliknite na odgovarajuće linkove u podnožju stranice.",
        },
        {
          question: "Da li imam nekih dodatnih troškova?",
          answer:
            "Svaka ulaznica postaje važeća nakon cjelokupne uplate cijene ulaznica i troškova obrade prikazanih prilikom kupovine. PDV je uračunat u cijenu i nema skrivenih troškova.\n\nTroškovi obrade za kupovinu ulaznica na Internet prodavnici obračunavaju se na nivou porudžbine i iznose 5% od cijene ulaznice + 20 centi trošak softvera za mapiranje sjedišta.\n\nTroškovi obrade se odnose na pokriće nužnih troškova obrade platnih transakcija putem platnih kartica, te administrativnih, materijalnih i ostalih operativnih troškova Rakunat-a.",
        },
        {
          question: "Kako se ulaznice dostavljaju?",
          answer:
            "Nakon uspješnog plaćanja, na email adresu koju ste unijeli prilikom registracije automatski se šalje potvrda o kupovini, kao i link za pristup vašim ulaznicama.\n\nUlaznice se inicijalno nalaze u digitalnom formatu i povezane su s vašim nalogom. QR kod na ulaznicama biće automatski aktiviran 3 sata prije početka događaja, nakon čega ćete moći preuzeti ulaznice u JPG formatu putem dostavljenog linka.\n\nOvaj proces je osmišljen kako bi se dodatno spriječile zloupotrebe i osigurala bezbjednost svih posjetilaca. Svaka ulaznica sadrži jedinstveni QR kod koji se skenira ili ručno provjerava na ulazu.\n\nUkoliko nemate pristup svom emailu ili linku za ulaznice na dan događaja, ulazak neće biti moguć. Molimo vas da na vrijeme provjerite prijem emaila i pristup ulaznicama.",
        },
        {
          question: "Kupio sam ulaznice na internetu, ali još nisam dobio potvrdu.",
          answer:
            "Molimo Vas da provjerite da li naš e-mail sa potvrdom nije završio u nekom neželjenom mail folderu (spam, junk, important…). Takođe je moguće da niste dobili potvrdu zbog pogrešno unijete e-mail adrese ili iz nekih drugih razloga.\n\nU tom slučaju, kontaktirajte nas putem e-maila support@etickets.me. Navedite svoje puno ime, datum Vašeg naloga i koji je događaj u pitanju. Mi ćemo Vas obavijestiti da li je Vaša porudžbina uspješna ili ne.",
        },
        {
          question: "Nakon otkazivanja događaja, refundirani iznos je manji od konačnog iznosa koji sam platio.",
          answer:
            "Rakunat je odgovoran za prodaju ulaznica i ne garantuje povraćaj iznosa koji je plaćen ako je događaj otkazan. Međutim, trudimo se da kontaktiramo organizatora događaja da bi regulisao povraćaj novca.\n\nU slučaju povraćaja dobićete cio iznos koji je naveden na ulaznici. Ekstra naknade koje bi nastale (promjene cijena, dodatni troškovi, troškovi isporuke, itd.) neće biti vraćene od strane Rakunat-a.",
        },
        {
          question: "Da li djeca plaćaju ulaznicu?",
          answer:
            "Djeca do 7 godina starosti koja sjede u krilu roditelja ne plaćaju ulaznicu. Za djecu stariju od 7 godina, kao i za djecu kojoj je potrebno zasebno sjedište, obavezna je kupovina ulaznice.",
        },
      ],
    },
    en: {
      title: "Frequently Asked Questions",
      subtitle: "Find answers to the most common questions about ticket purchases, delivery and payment.",
      contactTitle: "Have additional questions?",
      contactText: "Our support team is here to help. Contact us and we'll respond as soon as possible.",
      faqs: [
        {
          question: "Where can I view the terms of use and privacy statement?",
          answer:
            "To view our terms of use and privacy statement, please click on the appropriate links in the footer of the page.",
        },
        {
          question: "Are there any additional costs?",
          answer:
            "Each ticket becomes valid after full payment of the ticket price and processing fees shown during purchase. VAT is included in the price and there are no hidden costs.\n\nProcessing fees for purchasing tickets in the online store are calculated at the order level and amount to 5% of the ticket price + 20 cents for the seat mapping software.\n\nProcessing fees cover the necessary costs of processing payment transactions via credit cards, as well as administrative, material and other operational costs of Rakunat.",
        },
        {
          question: "How are tickets delivered?",
          answer:
            "After successful payment, a purchase confirmation is automatically sent to the email address you entered during registration, as well as a link to access your tickets.\n\nTickets are initially in digital format and are linked to your account. The QR code on the tickets will be automatically activated 3 hours before the start of the event, after which you will be able to download the tickets in JPG format via the provided link.\n\nThis process is designed to further prevent misuse and ensure the safety of all visitors. Each ticket contains a unique QR code that is scanned or manually checked at the entrance.\n\nIf you do not have access to your email or ticket link on the day of the event, entry will not be possible. Please check your email receipt and ticket access in advance.",
        },
        {
          question: "I bought tickets online, but I still haven't received confirmation.",
          answer:
            "Please check if our confirmation email has ended up in an unwanted mail folder (spam, junk, important...). It is also possible that you did not receive confirmation due to an incorrectly entered email address or for other reasons.\n\nIn that case, contact us via email at support@etickets.me. Provide your full name, the date of your order and which event it is. We will inform you whether your order was successful or not.",
        },
        {
          question: "After the event was cancelled, the refunded amount is less than the final amount I paid.",
          answer:
            "Rakunat is responsible for ticket sales and does not guarantee a refund of the amount paid if the event is cancelled. However, we try to contact the event organizer to arrange a refund.\n\nIn case of a refund, you will receive the full amount stated on the ticket. Extra fees that would arise (price changes, additional costs, delivery costs, etc.) will not be refunded by Rakunat.",
        },
        {
          question: "Do children pay for tickets?",
          answer:
            "Children up to 7 years of age who sit in their parent's lap do not pay for a ticket. For children older than 7 years, as well as for children who need a separate seat, purchasing a ticket is mandatory.",
        },
      ],
    },
  };

  const t = translations[activeLang as keyof typeof translations] || translations.bs;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={seo.title} description={seo.description} basePath="/faq" />
      <Header />

      <main className="flex-1 container py-16">
        {/* Hero sekcija */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t.title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto space-y-4">
          {t.faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => toggleFAQ(index)}
            />
          ))}
        </div>

        {/* Kontakt sekcija */}
        <div className="max-w-3xl mx-auto mt-16">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 md:p-10">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t.contactTitle}</h2>
              </div>
              <p className="text-muted-foreground mb-6">{t.contactText}</p>
              <a
                href="mailto:support@etickets.me"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200"
              >
                <Mail className="w-4 h-4" />
                support@etickets.me
              </a>
            </div>
            {/* Dekorativni elementi */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
