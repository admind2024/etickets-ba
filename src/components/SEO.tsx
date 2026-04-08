import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_NAME = "etickets";
const BASE_URL = "https://etickets.ba";
const DEFAULT_IMAGE = "https://etickets.ba/og-image.jpg";
const DEFAULT_LOCALE = "bs_BA";
const DEFAULT_HTML_LANG = "bs";

interface HreflangItem {
  lang: string;
  url: string;
}

interface SEOProps {
  /** Page title - will be used for <title>, og:title, twitter:title */
  title?: string;
  /** Page description - will be used for meta description, og:description, twitter:description */
  description?: string;
  /** Full canonical URL of the page - if not provided, will be auto-generated from current route */
  url?: string;
  /** Image URL for social sharing (og:image, twitter:image) - relative paths will be converted to absolute */
  image?: string;
  /** OpenGraph locale (e.g., "sr_ME", "en_US", "ru_RU") */
  locale?: string;
  /** HTML lang attribute (e.g., "sr-ME", "en", "ru") */
  lang?: string;
  /** Canonical URL - overrides auto-generated canonical */
  canonical?: string;
  /** Hreflang alternate links for multilingual pages */
  hreflangs?: HreflangItem[];
  /** OpenGraph type - defaults to "website" */
  type?: "website" | "article" | "event" | "profile" | "place";
  /** If true, adds noindex,nofollow to robots meta */
  noIndex?: boolean;
  /** Base path for generating hreflangs (without language suffix) */
  basePath?: string;
}

/**
 * Central SEO component that handles all meta tags.
 * Uses react-helmet-async to inject tags into <head>.
 * 
 * IMPORTANT: All SEO tags should be managed through this component to avoid duplicates.
 * The index.html file should NOT contain any SEO meta tags (title, description, og:*, twitter:*).
 * 
 * Features:
 * - Auto-generates canonical URL from current route if not provided
 * - Converts relative image paths to absolute URLs
 * - Generates proper hreflang tags for multilingual support
 * - Sets proper og:* and twitter:* meta tags
 */
const SEO = ({
  title = `${SITE_NAME} | Ulaznice za koncerte i događaje u BiH, Crnoj Gori i Srbiji`,
  description = "etickets je regionalni brend za online prodaju ulaznica za koncerte, festivale i događaje. Poslujemo u Bosni i Hercegovini, Crnoj Gori i Srbiji.",
  url,
  image,
  locale,
  lang,
  canonical,
  hreflangs,
  type = "website",
  noIndex = false,
  basePath,
}: SEOProps) => {
  const location = useLocation();
  
  // Ensure image is absolute URL - handle null, undefined, empty string, and relative paths
  const imageUrl = image || DEFAULT_IMAGE;
  const absoluteImage = imageUrl.startsWith("http") 
    ? imageUrl 
    : `${BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  
  // Extract language from current path
  const pathLang = extractLangFromPath(location.pathname);
  const activeLang = lang || (pathLang === "en" ? pathLang : "bs");
  
  // Generate canonical URL from current route if not provided
  const currentPath = getBasePathWithoutLang(location.pathname);
  const autoCanonicalUrl = activeLang === "bs"
    ? `${BASE_URL}${currentPath}`
    : `${BASE_URL}${currentPath}${currentPath === "/" ? "" : "/"}${activeLang}`;
  
  // Use provided canonical, or provided url, or auto-generated
  const canonicalUrl = canonical || url || autoCanonicalUrl;
  
  // Use url for og:url if provided, otherwise use canonical
  const ogUrl = url || canonicalUrl;
  
  // Determine locale from language
  const activeLocale = locale || getLocaleFromLang(activeLang);
  
  // Determine HTML lang attribute
  const htmlLang = getHtmlLangFromLang(activeLang);

  // Generate hreflangs - use provided, or generate from basePath, or from current path
  const effectiveBasePath = basePath || currentPath;
  const defaultHreflangs: HreflangItem[] = hreflangs || generateHreflangs(effectiveBasePath);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <html lang={htmlLang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Canonical Link */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={activeLocale} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={ogUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
      
      {/* Hreflang Alternate Links */}
      {defaultHreflangs.map((item) => (
        <link
          key={item.lang}
          rel="alternate"
          hrefLang={item.lang}
          href={item.url}
        />
      ))}
    </Helmet>
  );
};

export default SEO;

/**
 * Extract language from URL path
 * Handles patterns like /kontakt/en, /dogadjaj/slug/ru, /en, /ru
 */
function extractLangFromPath(path: string): string | null {
  // Homepage language routes
  if (path === "/en") {
    return path.slice(1);
  }

  // Check if path ends with /en
  const langMatch = path.match(/\/(en)$/);
  if (langMatch) {
    return langMatch[1];
  }

  return null;
}

/**
 * Get base path without language suffix
 * /kontakt/en -> /kontakt
 * /dogadjaj/slug/ru -> /dogadjaj/slug
 * /en -> /
 * /ru -> /
 */
function getBasePathWithoutLang(path: string): string {
  // Homepage language routes
  if (path === "/en") {
    return "/";
  }

  // Remove trailing /en
  return path.replace(/\/(en)$/, "") || "/";
}

/**
 * Helper to generate hreflang items for a specific path
 * 
 * @param basePath - Path without language suffix (e.g., "/kontakt" or "/dogadjaj/event-slug")
 * @returns Array of HreflangItem for me, en, ru, and x-default
 */
export function generateHreflangs(basePath: string): HreflangItem[] {
  // Normalize path - ensure it starts with / and doesn't end with /
  const normalizedPath = basePath.startsWith("/") ? basePath : `/${basePath}`;
  const cleanPath = normalizedPath.endsWith("/") && normalizedPath !== "/" 
    ? normalizedPath.slice(0, -1) 
    : normalizedPath;

  if (cleanPath === "/") {
    return [
      { lang: "bs", url: BASE_URL },
      { lang: "en", url: `${BASE_URL}/en` },
      { lang: "x-default", url: BASE_URL },
    ];
  }

  return [
    { lang: "bs", url: `${BASE_URL}${cleanPath}` },
    { lang: "en", url: `${BASE_URL}${cleanPath}/en` },
    { lang: "x-default", url: `${BASE_URL}${cleanPath}` },
  ];
}

/**
 * Helper to get locale code from language code
 */
export function getLocaleFromLang(lang: string): string {
  const localeMap: Record<string, string> = {
    bs: "bs_BA",
    en: "en_US",
  };
  return localeMap[lang] || "bs_BA";
}

/**
 * Helper to get HTML lang attribute from language code
 */
export function getHtmlLangFromLang(lang: string): string {
  const langMap: Record<string, string> = {
    bs: "bs",
    en: "en",
  };
  return langMap[lang] || "bs";
}

// Re-export constants for use in other components
export { BASE_URL, SITE_NAME, DEFAULT_IMAGE };
