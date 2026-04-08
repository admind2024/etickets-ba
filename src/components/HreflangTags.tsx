import { Helmet } from "react-helmet-async";
import { SITE_URL, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/seoConfig";

interface HreflangTagsProps {
  /**
   * Base path without language suffix (e.g., "/kontakt" or "/dogadjaj/event-slug")
   */
  basePath: string;
  /**
   * Current language (used for self-referencing canonical)
   */
  currentLang?: string;
}

/**
 * Renders hreflang tags for multilingual pages
 * URL pattern: /page for default (me), /page/en for English, /page/ru for Russian
 * Uses BCP 47 language codes: sr for Serbian/Montenegrin, en for English, ru for Russian
 */
const HreflangTags = ({ basePath, currentLang = DEFAULT_LANGUAGE }: HreflangTagsProps) => {
  // Normalize basePath - ensure it starts with / and doesn't end with /
  const normalizedPath = basePath.startsWith("/") ? basePath : `/${basePath}`;
  const cleanPath = normalizedPath.endsWith("/") && normalizedPath !== "/" 
    ? normalizedPath.slice(0, -1) 
    : normalizedPath;

  // Generate URLs for each language
  const getUrlForLang = (lang: string): string => {
    if (lang === DEFAULT_LANGUAGE) {
      // Default language (me) uses the base path without suffix
      return `${SITE_URL}${cleanPath}`;
    }
    // Other languages append /{lang} to the path
    // Homepage special case: /en, /ru instead of //en, //ru
    if (cleanPath === "/") {
      return `${SITE_URL}/${lang}`;
    }
    return `${SITE_URL}${cleanPath}/${lang}`;
  };

  // Map our language codes to BCP 47 codes for hreflang attribute
  // Using "sr" for Serbian (which covers Montenegrin) as per user requirement
  const langCodeMap: Record<string, string> = {
    bs: "bs",      // Bosnian
    en: "en",      // English
  };

  return (
    <Helmet>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={langCodeMap[lang] || lang}
          href={getUrlForLang(lang)}
        />
      ))}
      {/* x-default points to the default language version */}
      <link rel="alternate" hrefLang="x-default" href={getUrlForLang(DEFAULT_LANGUAGE)} />
    </Helmet>
  );
};

export default HreflangTags;
