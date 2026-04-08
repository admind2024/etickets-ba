import { useState } from "react";
import { SiteBanner } from "@/components/SiteBanner";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeaderProps {
  slugForEvent?: string;
}

export const Header = ({ slugForEvent }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { lang: currentLang } = useLanguage();

  // Navigation translations
  const navTranslations: Record<string, Record<string, string>> = {
    home: { bs: "Početna", en: "Home" },
    events: { bs: "Događaji", en: "Events" },
    about: { bs: "O nama", en: "About" },
    contact: { bs: "Kontakt", en: "Contact" },
    marketing: { bs: "Marketing", en: "Marketing" },
    faq: { bs: "FAQ", en: "FAQ" },
    admin: { bs: "Admin", en: "Admin" },
    signIn: { bs: "Prijavi se", en: "Sign In" },
    openMenu: { bs: "Otvori meni", en: "Open menu" },
  };

  const t = (key: string) => navTranslations[key]?.[currentLang] || navTranslations[key]?.bs || key;

  // Build link with language suffix
  const buildLink = (basePath: string) => {
    // Don't add language to home, hash links, or admin
    if (basePath === "/" || basePath.startsWith("/#") || basePath.startsWith("/admin")) {
      return basePath;
    }
    if (currentLang === "bs") {
      return basePath;
    }
    return `${basePath}/${currentLang}`;
  };

  const navigation = [
    { name: t("home"), href: "/" },
    { name: t("events"), href: buildLink("/dogadjaji") },
    { name: t("about"), href: buildLink("/o-nama") },
    { name: t("contact"), href: buildLink("/kontakt") },
    { name: t("marketing"), href: buildLink("/marketing") },
    { name: t("faq"), href: buildLink("/faq") },
  ];

  // Check if link is active
  const isActive = (href: string) => {
    const pathname = location.pathname;
    if (href === "/") {
      return pathname === "/";
    }
    if (href.startsWith("/#")) {
      return false;
    }
    // Remove language suffix for comparison
    const baseHref = href.replace(/\/(en)$/, "");
    const basePath = pathname.replace(/\/(en)$/, "");
    return basePath === baseHref || basePath.startsWith(baseHref + "/");
  };

  return (
    <>
    <SiteBanner />
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#013DC4]">
      <nav className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <img src="/logo.png" alt="etickets" className="h-9" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-8">
          {navigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-white",
                isActive(item.href) ? "text-white" : "text-white/70",
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop: Language Switcher & CTA Button */}
        <div className="hidden md:flex md:items-center md:gap-4">
          <LanguageSwitcher slugForEvent={slugForEvent} />
          <Button variant="gold" size="sm">
            {t("signIn")}
          </Button>
        </div>

        {/* Mobile: Language + Hamburger menu button */}
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher slugForEvent={slugForEvent} />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">{t("openMenu")}</span>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#013DC4]">
          <div className="container py-4">
            {/* Navigation links */}
            <div className="space-y-3">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block py-2 text-base font-medium transition-colors",
                    isActive(item.href) ? "text-white" : "text-white/70 hover:text-white",
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <Button variant="gold" className="w-full mt-4">
              {t("signIn")}
            </Button>
          </div>
        </div>
      )}
    </header>
    </>
  );
};
