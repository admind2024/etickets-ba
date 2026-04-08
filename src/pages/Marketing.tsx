import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import SEO from "@/components/SEO";
import { useEffect, useState, useRef } from "react";
import {
  Users,
  Eye,
  MousePointerClick,
  Smartphone,
  Globe,
  TrendingUp,
  CheckCircle2,
  Star,
  Crown,
  Megaphone,
  BarChart3,
  Target,
  Zap,
  Mail,
} from "lucide-react";

// Hook for intersection observer animations
const useInView = (options = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, ...options },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
};

// Animated counter component
const AnimatedCounter = ({
  value,
  duration = 2000,
  suffix = "",
}: {
  value: string;
  duration?: number;
  suffix?: string;
}) => {
  const [displayValue, setDisplayValue] = useState("0");
  const { ref, isInView } = useInView();

  useEffect(() => {
    if (!isInView) return;

    const numericValue = parseInt(value.replace(/[^0-9]/g, ""));
    const hasDecimal = value.includes(":");
    const isPercentage = value.includes("%");

    if (hasDecimal) {
      // Handle time format (2:40)
      setDisplayValue(value);
      return;
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(numericValue * easeOut);

      if (isPercentage) {
        setDisplayValue(`${(parseFloat(value) * easeOut).toFixed(1)}%`);
      } else {
        setDisplayValue(current.toLocaleString());
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value, duration]);

  return (
    <span ref={ref}>
      {displayValue}
      {suffix}
    </span>
  );
};

// Animated progress bar component
const AnimatedProgressBar = ({
  percentage,
  color,
  delay = 0,
}: {
  percentage: number;
  color: string;
  delay?: number;
}) => {
  const { ref, isInView } = useInView();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setWidth(percentage), delay);
      return () => clearTimeout(timer);
    }
  }, [isInView, percentage, delay]);

  return (
    <div ref={ref} className="h-3 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

// Animated bar chart component
const AnimatedBarChart = ({
  percentage,
  delay = 0,
  children,
}: {
  percentage: number;
  delay?: number;
  children: React.ReactNode;
}) => {
  const { ref, isInView } = useInView();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setWidth(percentage), delay);
      return () => clearTimeout(timer);
    }
  }, [isInView, percentage, delay]);

  return (
    <div ref={ref} className="relative h-8 bg-muted rounded-lg overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-lg flex items-center justify-end pr-3 transition-all duration-1000 ease-out"
        style={{ width: `${width}%` }}
      >
        {children}
      </div>
    </div>
  );
};

// Fade in animation wrapper
const FadeInSection = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(30px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

const Marketing = () => {
  // Add global styles for animations
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fade-in-up {
        from { 
          opacity: 0; 
          transform: translateY(20px); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0); 
        }
      }
      .animate-fade-in {
        animation: fade-in 0.6s ease-out forwards;
      }
      .animate-fade-in-up {
        animation: fade-in-up 0.6s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const stats = [
    {
      value: "1,007,463",
      label: "Pregleda stranica",
      icon: Eye,
      description: "Godišnje",
    },
    {
      value: "508,894",
      label: "Sesija",
      icon: MousePointerClick,
      description: "Godišnje",
    },
    {
      value: "243,237",
      label: "Jedinstvenih posjetilaca",
      icon: Users,
      description: "39% populacije CG",
    },
    {
      value: "623,633",
      label: "Stanovnika Crne Gore",
      icon: Globe,
      description: "Popis 2023.",
    },
  ];

  const audienceData = [
    { label: "Mobilni uređaji", value: "96.4%", color: "bg-primary" },
    { label: "Desktop", value: "3.5%", color: "bg-primary/70" },
    { label: "Tableti", value: "0.1%", color: "bg-primary/40" },
  ];

  const geoData = [
    { country: "Crna Gora", percentage: "90.8%", sessions: "914,329" },
    { country: "Srbija", percentage: "4.0%", sessions: "40,696" },
    { country: "Bosna i Hercegovina", percentage: "1.1%", sessions: "11,493" },
    { country: "Hrvatska", percentage: "0.7%", sessions: "7,227" },
    { country: "Ostale zemlje", percentage: "3.4%", sessions: "33,718" },
  ];

  const trafficSources = [
    { source: "Direktni pristup", sessions: "222,006", percentage: 43.6 },
    { source: "Instagram", sessions: "122,364", percentage: 24.1 },
    { source: "Facebook", sessions: "97,372", percentage: 19.2 },
    { source: "Ostali izvori", sessions: "67,153", percentage: 13.1 },
  ];

  const packages = [
    {
      name: "Banner",
      icon: Megaphone,
      color: "border-blue-500",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
      features: [
        "Banner na početnoj stranici",
        "Prikaz na svim uređajima",
        "Mjesečna rotacija",
        "Mjesečni izvještaj o performansama",
        "3 pozicije na izbor",
      ],
      recommended: "Lokalni biznisi, jednokratne kampanje",
      cta: "Kontaktirajte nas",
    },
    {
      name: "Premium",
      icon: Star,
      color: "border-primary",
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      popular: true,
      features: [
        "Sve iz paketa Banner",
        "Prioritetna pozicija",
        "Banner na stranici detalja eventa",
        "Promocija na društvenim mrežama",
        "Uključenje u newsletter",
      ],
      recommended: "Srednji biznisi, višemjesečne kampanje",
      cta: "Kontaktirajte nas",
    },
    {
      name: "Partner",
      icon: Crown,
      color: "border-amber-500",
      bgColor: "bg-amber-500/10",
      iconColor: "text-amber-500",
      features: [
        "Sve iz paketa Premium",
        "Ekskluzivnost u kategoriji",
        "Logo na elektronskim kartama",
        "Co-branded kampanje",
        "Dedicirani account manager",
      ],
      recommended: "Brendovi, dugoročna partnerstva",
      cta: "Kontaktirajte nas",
    },
  ];

  const references = [
    { name: "Zdravko Čolić", category: "Koncert" },
    { name: "Bijelo Dugme", category: "Koncert" },
    { name: "KAMARAD Music", category: "Organizator" },
    { name: "BKFC", category: "Sportski događaj" },
    { name: "Beerfest", category: "Festival" },
    { name: "Top Hill", category: "Venue / Klub" },
    { name: "Divanhana", category: "Koncert" },
    { name: "Boris Vuku", category: "Organizator" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Marketing i Oglašavanje | etickets"
        description="Dosegnite preko 243,000 jedinstvenih posjetilaca godišnje. Oglašavajte na vodećoj ticketing platformi u Bosni i Hercegovini, Crnoj Gori i Srbiji."
        basePath="/marketing"
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-16 md:py-24">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          {/* Animated background elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6 animate-fade-in">
                Media Kit 2025
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in-up">
                Dosegnite{" "}
                <span className="text-primary relative">
                  39%
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                    <path
                      d="M1 5.5C47 2 153 2 199 5.5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="text-primary/30"
                    />
                  </svg>
                </span>{" "}
                Crne Gore
              </h1>
              <p
                className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                Vodeća platforma za prodaju karata u Bosni i Hercegovini, Crnoj Gori i Srbiji. Sa 243,000+ jedinstvenih posjetilaca godišnje, dosežemo
                ogromnu publiku u regionu. Povežite svoj brend sa publikom koja voli događaje.
              </p>
              <div
                className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
                style={{ animationDelay: "0.4s" }}
              >
                <a
                  href="#paketi"
                  className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Pogledaj pakete
                </a>
                <a
                  href="mailto:support@e-tickets.me"
                  className="inline-flex items-center justify-center px-8 py-3 border border-border rounded-lg font-semibold hover:bg-muted hover:scale-105 transition-all duration-300"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Kontaktiraj nas
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ključne metrike 2025</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Podaci iz Google Analytics 4 za period Januar - Decembar 2025.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <FadeInSection key={index} delay={index * 100}>
                  <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow hover:-translate-y-1 duration-300">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-4">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                      <AnimatedCounter value={stat.value} />
                    </div>
                    <div className="text-sm font-medium text-foreground mb-1">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.description}</div>
                  </div>
                </FadeInSection>
              ))}
            </div>

            {/* Market Penetration Highlight */}
            <FadeInSection delay={400}>
              <div className="mt-12 max-w-4xl mx-auto">
                <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/20 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                  <div className="relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/20 rounded-full text-sm font-medium text-primary mb-4">
                      <TrendingUp className="w-4 h-4" />
                      Tržišna dominacija
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                      Gotovo svaki <span className="text-primary">treći stanovnik</span> Crne Gore je posjetio etickets
                    </h3>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      Sa 243,237 jedinstvenih posjetilaca od ukupno 623,633 stanovnika (popis 2023.), etickets je
                      najposjećenija ticketing platforma u Crnoj Gori sa{" "}
                      <strong>39% penetracijom ukupne populacije</strong> i
                      <strong> 46.8% penetracijom ciljane populacije</strong> (15+ godina).
                    </p>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* Audience Profile */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Profil publike</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Razumijte ko čini našu publiku i kako ih možete najbolje dosegnuti.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Device Distribution */}
              <FadeInSection delay={0}>
                <div className="bg-card rounded-2xl p-8 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Uređaji</h3>
                  </div>
                  <div className="space-y-4">
                    {audienceData.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                          <span className="text-sm font-bold text-foreground">{item.value}</span>
                        </div>
                        <AnimatedProgressBar
                          percentage={parseFloat(item.value)}
                          color={item.color}
                          delay={index * 200}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-sm text-muted-foreground">
                    <strong>96.4%</strong> naše publike pristupa putem mobilnih uređaja - idealno za mobile-first
                    kampanje.
                  </p>
                </div>
              </FadeInSection>

              {/* Geographic Distribution */}
              <FadeInSection delay={200}>
                <div className="bg-card rounded-2xl p-8 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Geografija</h3>
                  </div>
                  <div className="space-y-3">
                    {geoData.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/50 rounded px-2 transition-colors"
                      >
                        <span className="text-sm font-medium text-foreground">{item.country}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">{item.sessions}</span>
                          <span className="text-sm font-bold text-primary w-16 text-right">{item.percentage}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* Traffic Sources */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Izvori saobraćaja</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Jak organski reach i lojalna baza korisnika koji se vraćaju.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <FadeInSection>
                <div className="bg-card rounded-2xl p-8 border border-border">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Pregled po kanalima</h3>
                  </div>
                  <div className="space-y-6">
                    {trafficSources.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{item.source}</span>
                          <span className="text-sm text-muted-foreground">{item.sessions} sesija</span>
                        </div>
                        <AnimatedBarChart percentage={item.percentage} delay={index * 150}>
                          <span className="text-xs font-bold text-primary-foreground">{item.percentage}%</span>
                        </AnimatedBarChart>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeInSection>
            </div>
          </div>
        </section>

        {/* Packages Section */}
        <section id="paketi" className="py-16 scroll-mt-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Mogućnosti oglašavanja</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Izaberite paket koji odgovara vašim ciljevima. Cijene se formiraju na osnovu trajanja kampanje i
                specifičnih zahtjeva.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {packages.map((pkg, index) => (
                <FadeInSection key={index} delay={index * 150}>
                  <div
                    className={`relative bg-card rounded-2xl border-2 ${pkg.color} overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
                      pkg.popular ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg animate-pulse">
                        POPULARNO
                      </div>
                    )}
                    <div className={`p-8 ${pkg.bgColor}`}>
                      <div
                        className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${pkg.bgColor} mb-4`}
                      >
                        <pkg.icon className={`w-7 h-7 ${pkg.iconColor}`} />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground">{pkg.recommended}</p>
                    </div>
                    <div className="p-8 pt-6">
                      <ul className="space-y-4 mb-8">
                        {pkg.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <a
                        href={`mailto:support@e-tickets.me?subject=Upit za oglašavanje - paket ${pkg.name}`}
                        className={`block w-full py-3 text-center rounded-lg font-semibold transition-all duration-300 ${
                          pkg.popular
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
                            : "bg-muted hover:bg-muted/80 text-foreground hover:scale-105"
                        }`}
                      >
                        {pkg.cta}
                      </a>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* Why Advertise */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Zašto oglašavati na etickets?</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: Target,
                  title: "Ciljana publika",
                  description: "Dosegnite ljude koji aktivno traže događaje i zabavu",
                },
                {
                  icon: Zap,
                  title: "Visoka angažovanost",
                  description: "Prosječno 2:40 min po sesiji, 1.98 stranica po posjeti",
                },
                {
                  icon: TrendingUp,
                  title: "Rastući reach",
                  description: "46.8% penetracija ciljane populacije u Crnoj Gori",
                },
                {
                  icon: Star,
                  title: "Premium pozicioniranje",
                  description: "Vaš brend uz najveće događaje u regionu",
                },
              ].map((item, index) => (
                <FadeInSection key={index} delay={index * 100}>
                  <div className="bg-card rounded-xl p-6 border border-border text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* References */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Reference</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Sarađujemo sa vodećim organizatorima događaja u regionu.
              </p>
            </div>

            <FadeInSection>
              <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
                {references.map((ref, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full hover:border-primary hover:shadow-md transition-all duration-300 cursor-default"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="font-medium text-foreground">{ref.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {ref.category}
                    </span>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-primary to-primary/80">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">Spremni za saradnju?</h2>
              <p className="text-lg text-primary-foreground/90 mb-8">
                Kontaktirajte nas za personalizovanu ponudu prilagođenu vašim ciljevima i budžetu.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:support@e-tickets.me?subject=Upit za oglašavanje"
                  className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-white/90 transition-colors"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  support@e-tickets.me
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Marketing;
