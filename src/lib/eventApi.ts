const API_URL = "https://e-tickets-cache.rade-milosevic87.workers.dev";

/**
 * GET lista eventova (cached preko Cloudflare CDN)
 */
export async function getAboutEvents() {
  const res = await fetch(`${API_URL}/functions/v1/public-about-events`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to fetch about events: ${res.status} ${txt}`);
  }
  return res.json();
}

/**
 * GET detalj eventa (cached preko Cloudflare CDN)
 */
export async function getAboutEvent(slug: string) {
  const url = `${API_URL}/functions/v1/public-about-event?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to fetch about event: ${res.status} ${txt}`);
  }
  return res.json();
}

/**
 * GET sponzori (cached preko Cloudflare CDN)
 */
export async function getSponsors() {
  const res = await fetch(`${API_URL}/functions/v1/get-sponsors`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to fetch sponsors: ${res.status} ${txt}`);
  }
  return res.json();
}

/**
 * Stripe checkout (NO CACHE - real-time)
 */
export async function createCheckoutSession(type: "simple" | "seat", payload: any) {
  const res = await fetch(`/api/create-checkout-session-${type}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to create checkout session: ${res.status} ${txt}`);
  }
  return res.json();
}

// ============================================
// I18N FUNKCIJE (višejezičnost)
// ============================================

/**
 * GET lista eventova po jeziku (ME/RU/EN)
 */
export async function getEventsI18n(lang: string = "bs") {
  const res = await fetch(`${API_URL}/functions/v1/get-events-i18n?lang=${encodeURIComponent(lang)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to fetch events i18n: ${res.status} ${txt}`);
  }
  return res.json();
}

/**
 * GET detalj eventa po jeziku i slug-u
 */
export async function getEventI18n(lang: string, slug: string) {
  const url = `${API_URL}/functions/v1/get-event-i18n?lang=${encodeURIComponent(lang)}&slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to fetch event i18n: ${res.status} ${txt}`);
  }
  return res.json();
}

/**
 * POST - Prevedi event na RU/EN (DeepL)
 */
export async function translateEvent(eventId: string) {
  const res = await fetch(`${API_URL}/functions/v1/translate-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ event_id: eventId }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Translation failed: ${res.status} ${txt}`);
  }
  return res.json();
}

// ============================================
// PERFORMERS I18N
// ============================================

/**
 * GET performers sa prevodom biografije
 */
export async function getPerformersI18n(lang: string = "bs") {
  const performersRes = await fetch(`${API_URL}/functions/v1/get-performers`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });
  if (!performersRes.ok) {
    throw new Error("Failed to fetch performers");
  }
  const performers = await performersRes.json();

  if (lang === "bs" || lang === "me") {
    return performers;
  }

  const i18nRes = await fetch(`${API_URL}/functions/v1/get-performers-i18n?lang=${lang}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });
  if (!i18nRes.ok) {
    return performers;
  }
  const translations = await i18nRes.json();

  const transMap = new Map();
  for (const t of translations) {
    transMap.set(t.performer_id, t);
  }

  return performers.map((p: any) => {
    const trans = transMap.get(p.id);
    if (trans) {
      return {
        ...p,
        biography: trans.biography || p.biography,
      };
    }
    return p;
  });
}

// ============================================
// VENUES I18N
// ============================================

/**
 * GET venues sa prevodom opisa
 */
export async function getVenuesI18n(lang: string = "bs") {
  const venuesRes = await fetch(`${API_URL}/functions/v1/get-venues`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });
  if (!venuesRes.ok) {
    throw new Error("Failed to fetch venues");
  }
  const venues = await venuesRes.json();

  if (lang === "bs" || lang === "me") {
    return venues;
  }

  const i18nRes = await fetch(`${API_URL}/functions/v1/get-venues-i18n?lang=${lang}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });
  if (!i18nRes.ok) {
    return venues;
  }
  const translations = await i18nRes.json();

  const transMap = new Map();
  for (const t of translations) {
    transMap.set(t.venue_id, t);
  }

  return venues.map((v: any) => {
    const trans = transMap.get(v.id);
    if (trans) {
      return {
        ...v,
        description: trans.description || v.description,
      };
    }
    return v;
  });
}

// ============================================
// STATIC PAGES I18N
// ============================================

/**
 * GET static page content by key and language (via Edge Function)
 */
export async function getPageContent(pageKey: string, lang: string = "bs") {
  const url = `${API_URL}/functions/v1/get-page-content?page_key=${encodeURIComponent(pageKey)}&lang=${encodeURIComponent(lang)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "default",
  });

  if (!res.ok) {
    console.error("Failed to fetch page content:", res.status);
    return null;
  }

  return res.json();
}
