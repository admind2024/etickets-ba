import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const Footer = () => {
  const { lang: currentLang } = useLanguage();

  // Translations
  const translations: Record<string, Record<string, string>> = {
    tagline: {
      bs: "etickets je regionalni brend za online prodaju ulaznica koji posluje u Bosni i Hercegovini, Crnoj Gori i Srbiji.",
      en: "etickets is a regional brand for online ticket sales operating in Bosnia and Herzegovina, Montenegro and Serbia.",
    },
    quickLinks: { bs: "Brzi linkovi", en: "Quick Links" },
    allEvents: { bs: "Svi događaji", en: "All Events" },
    performers: { bs: "Izvođači", en: "Performers" },
    venues: { bs: "Lokacije", en: "Venues" },
    aboutUs: { bs: "O nama", en: "About Us" },
    contact: { bs: "Kontakt", en: "Contact" },
    support: { bs: "Podrška", en: "Support" },
    howToBuy: { bs: "Kako kupiti", en: "How to Buy" },
    ticketRefund: { bs: "Povrat ulaznica", en: "Ticket Refund" },
    faq: { bs: "Česta pitanja", en: "FAQ" },
    termsOfUse: { bs: "Uslovi korišćenja", en: "Terms of Use" },
    privacyPolicy: { bs: "Politika privatnosti", en: "Privacy Policy" },
    paymentMethods: { bs: "Način plaćanja", en: "Payment Methods" },
    contactTitle: { bs: "Kontakt", en: "Contact" },
    seoText: {
      bs: "etickets je regionalni brend za online prodaju ulaznica za koncerte, festivale, sportske i kulturne događaje. Poslujemo u Bosni i Hercegovini, Crnoj Gori i Srbiji.",
      en: "etickets is a regional brand for online ticket sales for concerts, festivals, sports and cultural events. We operate in Bosnia and Herzegovina, Montenegro and Serbia.",
    },
    copyright: {
      bs: "© 2025 etickets. Sva prava zadržana.",
      en: "© 2025 etickets. All rights reserved.",
    },
    privacy: { bs: "Privatnost", en: "Privacy" },
  };

  const t = (key: string) => translations[key]?.[currentLang] || translations[key]?.bs || key;

  // Build link with language suffix
  const buildLink = (basePath: string) => {
    if (basePath === "/" || basePath.startsWith("/#")) {
      return basePath;
    }
    if (currentLang === "bs") {
      return basePath;
    }
    return `${basePath}/${currentLang}`;
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4 text-center md:text-left">
            <Link to="/" className="inline-flex items-center">
              <img src="/logo.png" alt="etickets" className="h-9" />
            </Link>
            <p className="text-sm text-primary-foreground/80 max-w-xs mx-auto md:mx-0">{t("tagline")}</p>
            <div className="flex gap-4 justify-center md:justify-start">
              <a
                href="https://www.facebook.com/etickets.ba"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 transition-colors hover:bg-primary-foreground/20"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/etickets.ba/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 transition-colors hover:bg-primary-foreground/20"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">{t("quickLinks")}</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/"
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("allEvents")}
                </Link>
              </li>
              <li>
                <Link
                  to={buildLink("/izvodjaci")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("performers")}
                </Link>
              </li>
              <li>
                <Link
                  to={buildLink("/lokacije")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("venues")}
                </Link>
              </li>
              <li>
                <Link
                  to={buildLink("/o-nama")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("aboutUs")}
                </Link>
              </li>
              <li>
                <Link
                  to={buildLink("/kontakt")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="text-center md:text-left">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">{t("support")}</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to={buildLink("/kako-kupiti")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("howToBuy")}
                </Link>
              </li>
              <li>
                <Link
                  to={buildLink("/povrat-ulaznica")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("ticketRefund")}
                </Link>
              </li>
              <li>
                <Link
                  to={buildLink("/faq")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("faq")}
                </Link>
              </li>
              <li>
                <Link
                  to={buildLink("/uslovi-koriscenja")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("termsOfUse")}
                </Link>
              </li>
              <li>
                <Link
                  to={buildLink("/politika-privatnosti")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  to={buildLink("/nacin-placanja")}
                  className="text-sm text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  {t("paymentMethods")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="text-center md:text-left">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">{t("contactTitle")}</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-primary-foreground/80 justify-center md:justify-start">
                <Mail className="h-4 w-4 shrink-0" />
                <span>support@e-tickets.me</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-primary-foreground/80 justify-center md:justify-start">
                <Phone className="h-4 w-4 shrink-0" />
                <span>+387 33 000 000</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-primary-foreground/80 justify-center md:justify-start">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Bosna i Hercegovina</span>
              </li>
            </ul>
          </div>
        </div>

        {/* SEO Text */}
        <div className="mt-8 pt-6 border-t border-primary-foreground/10">
          <p className="text-xs text-primary-foreground/50 text-center max-w-4xl mx-auto leading-relaxed">
            {t("seoText")}
          </p>
        </div>

        <div className="mt-6 border-t border-primary-foreground/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-primary-foreground/60 text-center md:text-left">{t("copyright")}</p>
            <div className="flex gap-6">
              <Link
                to={buildLink("/uslovi-koriscenja")}
                className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground"
              >
                {t("termsOfUse")}
              </Link>
              <Link
                to={buildLink("/politika-privatnosti")}
                className="text-sm text-primary-foreground/60 transition-colors hover:text-primary-foreground"
              >
                {t("privacy")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
