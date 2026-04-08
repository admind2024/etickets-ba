import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import SEO from "@/components/SEO";
import { MousePointer, MapPin, ShoppingCart, CreditCard, Ticket, CheckCircle } from "lucide-react";

const HowToBuy = () => {
  const { lang } = useParams<{ lang?: string }>();
  const currentLang = lang === "en" ? lang : "bs";

  const content = {
    bs: {
      seo: {
        title: "Kako kupiti ulaznice online putem e-tickets platforme | e-tickets",
        description:
          "Saznajte kako kupiti ulaznice online putem e-tickets. Jednostavan proces kupovine u par klikova za koncerte, festivale i događaje u Bosni i Hercegovini, Crnoj Gori i Srbiji.",
      },
      h1: "Kako kupiti ulaznice online",
      subtitle:
        "Kupovina ulaznica putem interneta nikada nije bila jednostavnija. Pratite korake ispod i za par minuta imate svoju ulaznicu.",
      steps: [
        {
          icon: MousePointer,
          title: "Izaberite događaj",
          description: "Pregledajte listu dostupnih događaja i kliknite na onaj koji vas zanima.",
          link: { text: "Pogledaj sve događaje", url: "/" },
        },
        {
          icon: MapPin,
          title: "Izaberite sjedište (ako postoji mapa)",
          description:
            "Za događaje sa mapom dvorane, izaberite željeno sjedište ili zonu. Za ostale događaje, izaberite kategoriju ulaznice.",
        },
        {
          icon: ShoppingCart,
          title: "Dodajte u korpu",
          description: "Provjerite odabrane ulaznice u korpi i kliknite 'Nastavi na plaćanje'.",
        },
        {
          icon: CreditCard,
          title: "Izvršite plaćanje",
          description: "Unesite email adresu i platite sigurno karticom putem Stripe sistema.",
        },
        {
          icon: Ticket,
          title: "Preuzmite ulaznice",
          description: "E-karte stižu odmah na vašu email adresu. Možete ih sačuvati na telefonu ili odštampati.",
        },
      ],
      securityTitle: "Sigurna kupovina",
      securityText:
        "Svi podaci se obrađuju putem SSL enkripcije, a transakcije su zaštićene najvišim bezbjednosnim standardima kroz Stripe payment sistem.",
      ctaTitle: "Spremni za kupovinu?",
      ctaText: "Pogledajte dostupne događaje i kupite ulaznice već danas.",
      ctaButton: "Pregledaj događaje",
    },
    en: {
      seo: {
        title: "How to Buy Tickets Online via e-tickets Platform | e-tickets",
        description:
          "Learn how to buy tickets online via e-tickets. Simple purchasing process in just a few clicks for concerts, festivals and events in Bosnia and Herzegovina, Montenegro and Serbia.",
      },
      h1: "How to Buy Tickets Online",
      subtitle:
        "Buying tickets online has never been easier. Follow the steps below and get your ticket in just a few minutes.",
      steps: [
        {
          icon: MousePointer,
          title: "Select an Event",
          description: "Browse the list of available events and click on the one that interests you.",
          link: { text: "View all events", url: "/en" },
        },
        {
          icon: MapPin,
          title: "Choose Your Seat (if venue map available)",
          description:
            "For events with a venue map, select your preferred seat or zone. For other events, choose the ticket category.",
        },
        {
          icon: ShoppingCart,
          title: "Add to Cart",
          description: "Review your selected tickets in the cart and click 'Proceed to Payment'.",
        },
        {
          icon: CreditCard,
          title: "Complete Payment",
          description: "Enter your email address and pay securely by card through the Stripe system.",
        },
        {
          icon: Ticket,
          title: "Download Your Tickets",
          description:
            "E-tickets arrive immediately to your email address. You can save them on your phone or print them.",
        },
      ],
      securityTitle: "Secure Purchase",
      securityText:
        "All data is processed via SSL encryption, and transactions are protected by the highest security standards through the Stripe payment system.",
      ctaTitle: "Ready to Buy?",
      ctaText: "Browse available events and purchase your tickets today.",
      ctaButton: "Browse Events",
    },
  };

  const t = content[currentLang] || content.bs;
  const homeUrl = currentLang === "bs" ? "/" : `/${currentLang}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={t.seo.title} description={t.seo.description} basePath="/kako-kupiti" />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-10 md:py-14">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{t.h1}</h1>
              <p className="text-sm md:text-base text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-10 md:py-14">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-5 md:left-6 top-0 bottom-0 w-0.5 bg-border hidden md:block" />

                <div className="space-y-6 md:space-y-8">
                  {t.steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={index} className="relative flex gap-4">
                        {/* Step Number & Icon */}
                        <div className="flex-shrink-0 relative z-10">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                            <Icon className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <h2 className="text-base md:text-lg font-semibold text-foreground mb-1">{step.title}</h2>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{step.description}</p>
                          {step.link && (
                            <Link
                              to={step.link.url}
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                            >
                              {step.link.text}
                              <span>→</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-10 md:py-12 bg-secondary/30">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">{t.securityTitle}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.securityText}</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10 md:py-14">
          <div className="container">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">{t.ctaTitle}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t.ctaText}</p>
              <Link
                to={homeUrl}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
              >
                {t.ctaButton}
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowToBuy;
