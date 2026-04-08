import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useLanguage, Language } from "@/contexts/LanguageContext";

const languages: { code: Language; flag: string; label: string }[] = [
  { code: "bs", flag: "🇧🇦", label: "BS" },
  { code: "en", flag: "🇬🇧", label: "EN" },
];

// Stranice koje podržavaju URL-based i18n
const i18nRoutes = [
  { prefix: "/dogadjaj/", hasSlug: true },
  { prefix: "/event-select/", hasSlug: true },
  { prefix: "/event/", hasSlug: true },
  { prefix: "/izvodjaci/", hasSlug: true },
  { prefix: "/lokacije/", hasSlug: true },
  { prefix: "/o-nama", hasSlug: false },
  { prefix: "/kontakt", hasSlug: false },
  { prefix: "/kako-kupiti", hasSlug: false },
  { prefix: "/povrat-ulaznica", hasSlug: false },
  { prefix: "/faq", hasSlug: false },
  { prefix: "/uslovi-koriscenja", hasSlug: false },
  { prefix: "/politika-privatnosti", hasSlug: false },
  { prefix: "/nacin-placanja", hasSlug: false },
];

interface LanguageSwitcherProps {
  slugForEvent?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ slugForEvent }) => {
  const { lang: contextLang, setLang } = useLanguage();
  const { lang: urlLang } = useParams<{ lang?: string; slug?: string }>();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pathname = location.pathname;

  // Determine if we're on an i18n-supported page
  const isHomepage = pathname === "/" || pathname === "/en";
  const currentRoute = i18nRoutes.find((route) => pathname.startsWith(route.prefix));
  const isI18nPage = isHomepage || !!currentRoute || !!slugForEvent;

  // Determine current language from URL or context
  let activeLang: Language = contextLang;
  if (isI18nPage) {
    // Homepage first
    if (pathname === "/en") {
      activeLang = "en";
    } else if (pathname === "/") {
      activeLang = "bs";
    } else if (pathname.endsWith("/en")) {
      activeLang = "en";
    } else if (urlLang === "en") {
      activeLang = urlLang;
    } else {
      activeLang = "bs";
    }
  }

  const currentLangData = languages.find((l) => l.code === activeLang) || languages[0];

  // Adjust dropdown position to stay within viewport
  useEffect(() => {
    if (isOpen && dropdownRef.current && buttonRef.current) {
      const dropdown = dropdownRef.current;
      const button = buttonRef.current;
      const buttonRect = button.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();

      // Check if dropdown goes off the right edge
      if (buttonRect.right - dropdownRect.width < 0) {
        dropdown.style.right = "auto";
        dropdown.style.left = "0";
      } else {
        dropdown.style.right = "0";
        dropdown.style.left = "auto";
      }

      // Check if dropdown goes off the left edge
      if (dropdownRect.left < 8) {
        dropdown.style.left = "0";
        dropdown.style.right = "auto";
      }
    }
  }, [isOpen]);

  const handleLanguageChange = (newLang: Language) => {
    setIsOpen(false);

    if (newLang === activeLang) return;

    // Event stranica sa slugForEvent prop
    if (slugForEvent) {
      if (newLang === "bs") {
        navigate(`/dogadjaj/${slugForEvent}`);
      } else {
        navigate(`/dogadjaj/${slugForEvent}/${newLang}`);
      }
      return;
    }

    // Pronađi koja ruta je aktivna
    const route = i18nRoutes.find((r) => pathname.startsWith(r.prefix));

    // Homepage - /, /en (before route check since / would match nothing)
    if (pathname === "/" || pathname === "/en") {
      if (newLang === "bs") {
        navigate("/");
      } else {
        navigate(`/${newLang}`);
      }
      return;
    }

    if (route) {
      if (route.hasSlug) {
        // Stranice sa slugom: /dogadjaj/:slug, /izvodjaci/:slug, /lokacije/:slug, /event-select/:slug
        const parts = pathname.split("/").filter(Boolean);
        const routeBase = "/" + parts[0]; // /dogadjaj, /izvodjaci, /lokacije, /event-select
        const theSlug = parts[1]; // slug

        if (newLang === "bs") {
          navigate(`${routeBase}/${theSlug}`);
        } else {
          navigate(`${routeBase}/${theSlug}/${newLang}`);
        }
      } else {
        // Statičke stranice bez sluga: /o-nama, /kontakt, etc.
        const basePath = route.prefix.replace(/\/$/, ""); // Ukloni trailing slash ako postoji

        if (newLang === "bs") {
          navigate(basePath);
        } else {
          navigate(`${basePath}/${newLang}`);
        }
      }
      return;
    }

    // Fallback - koristi kontekst za ostale stranice
    setLang(newLang);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-white hover:text-white/80 transition-all duration-200"
      >
        <span className="text-2xl">{currentLangData.flag}</span>
        <span className="hidden md:inline">{currentLangData.label}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-2 w-36 bg-white rounded-xl shadow-xl py-2 border border-gray-100 overflow-hidden"
            style={{ right: 0 }}
          >
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  activeLang === language.code
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <span>{language.label}</span>
                {activeLang === language.code && (
                  <svg className="w-4 h-4 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
