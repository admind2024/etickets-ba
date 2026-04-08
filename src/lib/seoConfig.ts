/**
 * SEO Configuration for etiketing.me
 * Centralized config for production domain and SEO settings
 */

// Production domain - used for canonical URLs, sitemaps, etc.
export const SITE_URL = import.meta.env.VITE_SITE_URL || "https://etickets.ba";

// Extract domain without protocol for comparisons
export const PRODUCTION_DOMAIN = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Organization info for schema.org
export const ORGANIZATION = {
  name: "etickets",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [
    // Add social media links here when available
    // "https://facebook.com/etiketing",
    // "https://instagram.com/etiketing",
  ],
};

// Supported languages
export const SUPPORTED_LANGUAGES = ["bs", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = "bs";

/**
 * Check if current hostname matches production domain
 */
export const isProductionDomain = (): boolean => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === PRODUCTION_DOMAIN || hostname === PRODUCTION_DOMAIN.replace("www.", "");
};

/**
 * Routes that should be noindex AND nofollow (internal/admin routes)
 */
export const NOINDEX_NOFOLLOW_ROUTES = [
  "/admin",
  "/checkout",
  "/confirmation",
  "/ticket-display",
  "/seat-selection",
  "/reset-password",
];

/**
 * Query parameters that should trigger noindex (but still follow links)
 * These are filter/search params that create duplicate content
 */
export const NOINDEX_QUERY_PARAMS = ["search", "category", "page", "sort", "filter", "q", "query"];

/**
 * Check if URL has query params that should trigger noindex
 */
export const hasNoindexQueryParam = (searchParams?: URLSearchParams): boolean => {
  if (!searchParams) return false;
  return NOINDEX_QUERY_PARAMS.some((p) => searchParams.has(p));
};

/**
 * Check if a path is an internal/admin route (noindex + nofollow)
 */
export const isNoFollowRoute = (path: string): boolean => {
  return NOINDEX_NOFOLLOW_ROUTES.some((route) => path.startsWith(route));
};

/**
 * Get canonical URL for a path
 * Root always returns with trailing slash for consistency
 */
export const getCanonicalUrl = (path: string): string => {
  const baseUrl = SITE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Root canonical must be SITE_URL + "/" for consistency
  if (normalizedPath === "/" || normalizedPath === "") {
    return `${baseUrl}/`;
  }

  // Everything else without trailing slash
  const cleanPath = normalizedPath.replace(/\/$/, "");
  return `${baseUrl}${cleanPath}`;
};

/**
 * Get canonical URL for an event
 */
export const getCanonicalEventUrl = (slug: string): string => {
  const cleanSlug = slug.replace(/^\//, "");
  return getCanonicalUrl(`/dogadjaj/${cleanSlug}`);
};

/**
 * Get canonical URL for a performer
 */
export const getCanonicalPerformerUrl = (slug: string): string => {
  const cleanSlug = slug.replace(/^\//, "");
  return getCanonicalUrl(`/izvodjaci/${cleanSlug}`);
};

/**
 * Get canonical URL for a venue
 */
export const getCanonicalVenueUrl = (slug: string): string => {
  const cleanSlug = slug.replace(/^\//, "");
  return getCanonicalUrl(`/lokacije/${cleanSlug}`);
};

/**
 * Determine robots meta content
 *
 * Priority:
 * 1. Staging/demo → noindex, nofollow
 * 2. Admin/internal routes → noindex, nofollow (don't follow internal links)
 * 3. Filter/search params → noindex, follow (still follow links to events!)
 * 4. Old URL patterns → noindex, follow
 * 5. Everything else → null (indexable)
 */
export const getRobotsContent = (path: string, searchParams?: URLSearchParams): string | null => {
  // Staging/demo domains should be completely hidden
  if (!isProductionDomain()) {
    return "noindex, nofollow";
  }

  // Admin, checkout, internal routes - noindex AND nofollow
  if (isNoFollowRoute(path)) {
    return "noindex, nofollow";
  }

  // Filter/search/pagination params - noindex but FOLLOW links to events
  if (hasNoindexQueryParam(searchParams)) {
    return "noindex, follow";
  }

  // Old/duplicate URL patterns - noindex but follow links
  if (path.startsWith("/about-events/") || path.startsWith("/events/") || path.startsWith("/simple-event/")) {
    return "noindex, follow";
  }

  // Allow indexing for all other routes
  return null;
};
