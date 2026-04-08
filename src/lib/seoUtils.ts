/**
 * SEO Utilities for URL/Slug generation
 * Re-exports config from seoConfig.ts for backwards compatibility
 */

export {
  SITE_URL,
  PRODUCTION_DOMAIN,
  isProductionDomain,
  getCanonicalUrl,
  getCanonicalEventUrl,
  getCanonicalPerformerUrl,
  getCanonicalVenueUrl,
  getRobotsContent,
  NOINDEX_NOFOLLOW_ROUTES,
  NOINDEX_QUERY_PARAMS,
  hasNoindexQueryParam,
  isNoFollowRoute,
  ORGANIZATION,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from "./seoConfig";

export type { SupportedLanguage } from "./seoConfig";

/**
 * Normalize text for slugs: lowercase, replace diacritics
 */
export const normalizeForSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/đ/g, "dj")
    .replace(/ž/g, "z")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/š/g, "s")
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

/**
 * Generate event slug from performers, venue, city, and date
 * Format: {performer1}-{performer2?|gosti}-{venue}-{city}-{yyyy-mm-dd}
 *
 * Rules:
 * - Max 2 performers in slug; if more use "gosti" after first performer
 * - Always include date to avoid duplicates
 */
export const generateEventSlug = (
  performers: string[],
  venue: string,
  city: string,
  date: string | Date
): string => {
  // Handle performers (max 2, or first + "gosti")
  let performerPart = "";
  if (performers.length === 0) {
    performerPart = "event";
  } else if (performers.length === 1) {
    performerPart = normalizeForSlug(performers[0]);
  } else if (performers.length === 2) {
    performerPart = `${normalizeForSlug(performers[0])}-${normalizeForSlug(performers[1])}`;
  } else {
    performerPart = `${normalizeForSlug(performers[0])}-gosti`;
  }

  // Normalize venue and city
  const venuePart = normalizeForSlug(venue);
  const cityPart = normalizeForSlug(city);

  // Format date as yyyy-mm-dd
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  return `${performerPart}-${venuePart}-${cityPart}-${datePart}`;
};

/**
 * Check if a route path is a duplicate (non-canonical) event route
 * @deprecated Use shouldNoIndex from seoConfig instead
 */
export const isDuplicateEventRoute = (path: string): boolean => {
  return (
    path.startsWith("/about-events/") ||
    path.startsWith("/events/") ||
    path.startsWith("/simple-event/")
  );
};
