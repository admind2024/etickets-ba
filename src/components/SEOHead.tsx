import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
  SITE_URL,
  getCanonicalUrl,
  getCanonicalEventUrl,
  getRobotsContent,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from "@/lib/seoConfig";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article" | "event" | "profile" | "place";
  noIndex?: boolean;
  /**
   * Override canonical URL. If not provided, uses current path.
   * For event pages, pass the event slug (without /dogadjaj/ prefix)
   */
  canonicalSlug?: string;
  /**
   * If true, treats canonicalSlug as an event slug and generates /dogadjaj/{slug} URL
   */
  isEventPage?: boolean;
  /**
   * Current language for proper canonical URL generation
   * Used to generate self-referencing canonical for language variants
   */
  lang?: string;
}

const SEOHead = ({
  title = "etickets | Ulaznice za koncerte i događaje u Bosni i Hercegovini",
  description = "Kupite ulaznice za najbolje koncerte, festivale i događaje u Bosni i Hercegovini i regionu. Brzo, sigurno, jednostavno.",
  image = "/og-image.jpg",
  type = "website",
  noIndex = false,
  canonicalSlug,
  isEventPage = false,
  lang,
}: SEOHeadProps) => {
  const location = useLocation();
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);

  // Determine the active language from prop or URL
  const activeLang = lang || extractLangFromPath(path) || DEFAULT_LANGUAGE;

  // Get base path without language suffix for canonical generation
  const basePath = getBasePathWithoutLang(path);
  const baseUrl = SITE_URL.replace(/\/$/, "");

  // Determine canonical URL - each language version should self-reference
  // Canonical URL is always clean (without query parameters)
  let canonicalUrl: string;
  let canonicalBase: string; // Used for hreflang generation

  if (canonicalSlug) {
    // Clean the slug - remove leading slash if present
    const cleaned = canonicalSlug.replace(/^\//, "");

    if (isEventPage || cleaned.startsWith("event/") || cleaned.startsWith("dogadjaj/")) {
      const slug = cleaned.replace(/^(event|dogadjaj)\//, "");
      canonicalBase = getCanonicalEventUrl(slug);
    } else {
      // Ensure path starts with / for getCanonicalUrl
      canonicalBase = getCanonicalUrl(cleaned.startsWith("/") ? cleaned : `/${cleaned}`);
    }

    // Add language suffix if not default
    canonicalUrl = activeLang === DEFAULT_LANGUAGE ? canonicalBase : `${canonicalBase}/${activeLang}`;
  } else {
    // Use current path for canonical
    canonicalBase = getCanonicalUrl(basePath);
    canonicalUrl = activeLang === DEFAULT_LANGUAGE ? canonicalBase : `${canonicalBase}/${activeLang}`;
  }

  // Generate hreflang URLs
  // Structure: default (me) has no suffix, en/ru have suffix
  const hreflangs = generateHreflangs(canonicalBase, basePath);

  // Determine robots content - pass searchParams to check for filter/search params
  // noIndex prop uses "noindex, follow" (not nofollow) unless it's an admin route
  const robotsContent = noIndex ? "noindex, follow" : getRobotsContent(path, searchParams);

  // Ensure image is absolute URL
  const absoluteImage = image.startsWith("http") ? image : `${baseUrl}${image}`;

  // Determine locale based on language
  const localeMap: Record<string, string> = {
    bs: "bs_BA",
    en: "en_US",
  };
  const ogLocale = localeMap[activeLang] || "bs_BA";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang tags for language alternates */}
      <link rel="alternate" hrefLang="bs" href={hreflangs.bs} />
      <link rel="alternate" hrefLang="en" href={hreflangs.en} />
      <link rel="alternate" hrefLang="x-default" href={hreflangs.bs} />

      {/* Robots directive - only render if there's a restriction */}
      {robotsContent && <meta name="robots" content={robotsContent} />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="etickets" />
      <meta property="og:locale" content={ogLocale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
};

/**
 * Generate hreflang URLs for all supported languages
 *
 * URL structure:
 * - Default (me): /kontakt, /dogadjaj/slug, /
 * - English: /kontakt/en, /dogadjaj/slug/en, /en
 * - Russian: /kontakt/ru, /dogadjaj/slug/ru, /ru
 */
function generateHreflangs(canonicalBase: string, basePath: string): Record<string, string> {
  const baseUrl = SITE_URL.replace(/\/$/, "");
  const isRoot = basePath === "/" || basePath === "";

  // For root path, the canonical already has trailing slash
  // For other paths, no trailing slash
  const baseCanonical = canonicalBase.replace(/\/$/, "");

  return {
    bs: isRoot ? `${baseUrl}/` : baseCanonical,
    en: isRoot ? `${baseUrl}/en` : `${baseCanonical}/en`,
  };
}

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

export default SEOHead;
