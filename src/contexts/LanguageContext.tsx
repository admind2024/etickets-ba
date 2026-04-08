import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "bs" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  setLangFromUrl: (urlLang: string | undefined) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Funkcija za izvlačenje jezika iz URL-a
const getLangFromPath = (): Language => {
  if (typeof window === "undefined") return "bs";

  const pathname = window.location.pathname;

  // Check if URL ends with /en
  if (pathname.endsWith("/en") || pathname === "/en") {
    return "en";
  }

  return "bs";
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from URL first, then localStorage
  const [lang, setLangState] = useState<Language>(() => {
    const urlLang = getLangFromPath();
    if (urlLang !== "bs") return urlLang;

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lang") as Language;
      if (saved && ["bs", "en"].includes(saved)) {
        return saved;
      }
    }
    return "bs";
  });

  // Sync with URL on pathname change using MutationObserver on document.title
  // or periodic check (more reliable approach)
  useEffect(() => {
    let lastPathname = window.location.pathname;
    
    const checkPathChange = () => {
      const currentPathname = window.location.pathname;
      if (currentPathname !== lastPathname) {
        lastPathname = currentPathname;
        const urlLang = getLangFromPath();
        setLangState(urlLang);
        localStorage.setItem("lang", urlLang);
      }
    };

    // Check on initial render
    const urlLang = getLangFromPath();
    if (urlLang !== lang) {
      setLangState(urlLang);
      localStorage.setItem("lang", urlLang);
    }

    // Listen for popstate (browser back/forward)
    const handlePopState = () => {
      const urlLang = getLangFromPath();
      setLangState(urlLang);
      localStorage.setItem("lang", urlLang);
    };
    
    window.addEventListener("popstate", handlePopState);
    
    // Use MutationObserver to detect URL changes from SPA navigation
    const observer = new MutationObserver(checkPathChange);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("popstate", handlePopState);
      observer.disconnect();
    };
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
  };

  const setLangFromUrl = (urlLang: string | undefined) => {
    if (urlLang && urlLang === "en") {
      setLangState(urlLang as Language);
      localStorage.setItem("lang", urlLang);
    } else {
      setLangState("bs");
      localStorage.setItem("lang", "bs");
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, setLangFromUrl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

export type { Language };
