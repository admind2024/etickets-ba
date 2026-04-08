import { Shield, Ticket, Clock, CreditCard } from "lucide-react";
import { useLocation } from "react-router-dom";

const AboutSection = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Determine current language from URL
  let currentLang = "bs";
  if (pathname === "/en" || pathname.endsWith("/en")) {
    currentLang = "en";
  }

  const content: Record<
    string,
    {
      title: string;
      titleHighlight: string;
      description1: string;
      description2: string;
      features: {
        securePurchase: { title: string; description: string };
        instantDelivery: { title: string; description: string };
        support: { title: string; description: string };
        allCards: { title: string; description: string };
      };
    }
  > = {
    bs: {
      title: "Zašto",
      titleHighlight: "e-tickets?",
      description1:
        "Nudimo sigurnu kupovinu karata sa SSL enkripcijom i zaštićenim transakcijama. Vaše e-karte stižu instant na email, a naš tim podrške dostupan je 24/7. Garantujemo najbolje cijene bez skrivenih troškova, a sve karte možete prikazati direktno na telefonu.",
      description2:
        "Na e-tickets platformi možete pronaći karte za koncerte, pozorišne predstave, sportske događaje, festivale, stand-up nastupe, klubske evente, dječije predstave, kulturne manifestacije, konferencije i mnoge druge specijalne događaje u Bosni i Hercegovini, Crnoj Gori i Srbiji.",
      features: {
        securePurchase: { title: "Sigurna kupovina", description: "SSL enkripcija" },
        instantDelivery: { title: "Instant dostava", description: "E-karte na email" },
        support: { title: "24/7 Podrška", description: "Uvijek dostupni" },
        allCards: { title: "Sve kartice", description: "Visa, MasterCard" },
      },
    },
    en: {
      title: "Why",
      titleHighlight: "e-tickets?",
      description1:
        "We offer secure ticket purchases with SSL encryption and protected transactions. Your e-tickets arrive instantly via email, and our support team is available 24/7. We guarantee the best prices with no hidden fees, and all tickets can be displayed directly on your phone.",
      description2:
        "On the e-tickets platform you can find tickets for concerts, theater performances, sports events, festivals, stand-up shows, club events, children's shows, cultural events, conferences and many other special events in Bosnia and Herzegovina, Montenegro and Serbia.",
      features: {
        securePurchase: { title: "Secure Purchase", description: "SSL encryption" },
        instantDelivery: { title: "Instant Delivery", description: "E-tickets to email" },
        support: { title: "24/7 Support", description: "Always available" },
        allCards: { title: "All Cards", description: "Visa, MasterCard" },
      },
    },
  };

  const t = content[currentLang] || content.bs;

  return (
    <section className="py-12 md:py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t.title} <span className="text-gradient">{t.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">{t.description1}</p>
          <p className="text-muted-foreground mb-10 leading-relaxed">{t.description2}</p>
          {/* Feature Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title={t.features.securePurchase.title}
              description={t.features.securePurchase.description}
            />
            <FeatureCard
              icon={<Ticket className="w-5 h-5" />}
              title={t.features.instantDelivery.title}
              description={t.features.instantDelivery.description}
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title={t.features.support.title}
              description={t.features.support.description}
            />
            <FeatureCard
              icon={<CreditCard className="w-5 h-5" />}
              title={t.features.allCards.title}
              description={t.features.allCards.description}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="gradient-card rounded-xl p-4 border border-border hover:border-primary/50 transition-all duration-300 shadow-card">
    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mx-auto mb-2 text-primary-foreground">
      {icon}
    </div>
    <h3 className="font-semibold text-foreground text-sm">{title}</h3>
    <p className="text-muted-foreground text-xs mt-1">{description}</p>
  </div>
);

export default AboutSection;
