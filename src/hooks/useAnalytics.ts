/**
 * eTickets Analytics - React Hook za eticketing.me
 * AUTOMATSKI PREPOZNAJE IZVORE + FILTRIRA DEVELOPMENT POSJETE
 */

import { useEffect, useCallback, useRef, createElement, ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// KONFIGURACIJA
// ═══════════════════════════════════════════════════════════════════════════

const ANALYTICS_CONFIG = {
  apiEndpoint: "https://analytics-gateway.rade-milosevic87.workers.dev/track",
  siteId: "eticketing",
  debug: true, // Postavi na true za debugovanje

  // Domeni koje treba IGNORISATI (development/preview)
  ignoreDomains: ["lovable.dev", "localhost", "127.0.0.1", "preview--", "webcontainer", "stackblitz", "codesandbox"],
};

// ═══════════════════════════════════════════════════════════════════════════
// TIPOVI
// ═══════════════════════════════════════════════════════════════════════════

interface UtmParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  gclid: string;
  fbclid: string;
}

interface AnalyticsContext {
  url: string;
  path: string;
  referrer: string;
  user_agent: string;
  screen: string;
  language: string;
  timezone: string;
}

interface CheckoutMetadata {
  visitor_id: string;
  analytics_session_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  gclid: string;
  fbclid: string;
  landing_page: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVJERA DA LI TREBA PRATITI
// ═══════════════════════════════════════════════════════════════════════════

function shouldTrack(): boolean {
  const hostname = window.location.hostname.toLowerCase();

  // Provjeri da li je development/preview domen
  for (const ignoreDomain of ANALYTICS_CONFIG.ignoreDomains) {
    if (hostname.includes(ignoreDomain)) {
      if (ANALYTICS_CONFIG.debug) {
        console.log("📊 Analytics DISABLED - development domain:", hostname);
      }
      return false;
    }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATSKA DETEKCIJA IZVORA
// ═══════════════════════════════════════════════════════════════════════════

function detectSourceFromUserAgent(): { source: string; medium: string } | null {
  const ua = navigator.userAgent;

  // Instagram in-app browser (razni formati)
  // Primjeri: "Instagram 123.0.0" ili "Instagram/123.0.0"
  if (/instagram/i.test(ua)) {
    return { source: "instagram", medium: "social" };
  }

  // Facebook in-app browser
  // FBAN = Facebook App Name, FBAV = Facebook App Version, FB_IAB = Facebook In-App Browser
  if (/FBAN|FBAV|FB_IAB|\[FB/i.test(ua)) {
    return { source: "facebook", medium: "social" };
  }

  // TikTok in-app browser
  if (/tiktok|bytedance|musical_ly/i.test(ua)) {
    return { source: "tiktok", medium: "social" };
  }

  // Snapchat
  if (/snapchat/i.test(ua)) {
    return { source: "snapchat", medium: "social" };
  }

  // LinkedIn
  if (/linkedin/i.test(ua)) {
    return { source: "linkedin", medium: "social" };
  }

  // Twitter
  if (/twitter/i.test(ua)) {
    return { source: "twitter", medium: "social" };
  }

  // Pinterest
  if (/pinterest/i.test(ua)) {
    return { source: "pinterest", medium: "social" };
  }

  // Viber
  if (/viber/i.test(ua)) {
    return { source: "viber", medium: "chat" };
  }

  // Telegram
  if (/telegram/i.test(ua)) {
    return { source: "telegram", medium: "chat" };
  }

  // WhatsApp (ponekad ima u UA)
  if (/whatsapp/i.test(ua)) {
    return { source: "whatsapp", medium: "chat" };
  }

  return null;
}

function detectSourceFromReferrer(): { source: string; medium: string } {
  // 1. PRVO provjeri User Agent (Instagram/Facebook NE šalju referrer!)
  const uaSource = detectSourceFromUserAgent();
  if (uaSource) {
    if (ANALYTICS_CONFIG.debug) {
      console.log("📊 Detected from User Agent:", uaSource);
    }
    return uaSource;
  }

  // 2. Provjeri referrer
  const referrer = document.referrer;
  if (!referrer) {
    return { source: "direct", medium: "none" };
  }

  try {
    const ref = new URL(referrer);
    const hostname = ref.hostname.toLowerCase();

    // Ignoriši svoj domen
    if (hostname.includes("etickets.ba")) {
      return { source: "direct", medium: "none" };
    }

    // Instagram (razni linkovi)
    if (/instagram\.com|l\.instagram\.com|lm\.instagram\.com|ig\.me/i.test(hostname)) {
      return { source: "instagram", medium: "social" };
    }

    // Facebook (razni linkovi)
    if (/facebook\.com|fb\.com|fb\.me|l\.facebook\.com|lm\.facebook\.com|m\.facebook\.com/i.test(hostname)) {
      return { source: "facebook", medium: "social" };
    }

    // TikTok
    if (/tiktok\.com|vm\.tiktok\.com/i.test(hostname)) {
      return { source: "tiktok", medium: "social" };
    }

    // Twitter/X
    if (/twitter\.com|t\.co|x\.com/i.test(hostname)) {
      return { source: "twitter", medium: "social" };
    }

    // LinkedIn
    if (/linkedin\.com|lnkd\.in/i.test(hostname)) {
      return { source: "linkedin", medium: "social" };
    }

    // YouTube
    if (/youtube\.com|youtu\.be/i.test(hostname)) {
      return { source: "youtube", medium: "social" };
    }

    // Reddit
    if (/reddit\.com/i.test(hostname)) {
      return { source: "reddit", medium: "social" };
    }

    // Pinterest
    if (/pinterest\.com|pin\.it/i.test(hostname)) {
      return { source: "pinterest", medium: "social" };
    }

    // WhatsApp
    if (/whatsapp\.com|wa\.me|web\.whatsapp\.com/i.test(hostname)) {
      return { source: "whatsapp", medium: "chat" };
    }

    // Viber
    if (/viber\.com/i.test(hostname)) {
      return { source: "viber", medium: "chat" };
    }

    // Telegram
    if (/telegram\.org|t\.me/i.test(hostname)) {
      return { source: "telegram", medium: "chat" };
    }

    // Google
    if (/google\./i.test(hostname)) {
      return { source: "google", medium: "organic" };
    }

    // Bing
    if (/bing\.com/i.test(hostname)) {
      return { source: "bing", medium: "organic" };
    }

    // Yahoo
    if (/yahoo\.com|search\.yahoo/i.test(hostname)) {
      return { source: "yahoo", medium: "organic" };
    }

    // DuckDuckGo
    if (/duckduckgo\.com/i.test(hostname)) {
      return { source: "duckduckgo", medium: "organic" };
    }

    // Email clients
    if (/mail\.google\.com|mail\.yahoo\.com|outlook\.live\.com|outlook\.office/i.test(hostname)) {
      return { source: "email", medium: "email" };
    }

    // Development/Preview - ignoriši
    if (/lovable\.dev|localhost|preview--|webcontainer/i.test(hostname)) {
      return { source: "direct", medium: "none" };
    }

    // Nepoznati referrer - koristi domen
    const domain = hostname.replace("www.", "");
    return { source: domain, medium: "referral" };
  } catch {
    return { source: "unknown", medium: "unknown" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNKCIJE
// ═══════════════════════════════════════════════════════════════════════════

function generateVisitorId(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("fingerprint", 2, 2);
    }
    const canvasData = canvas.toDataURL();

    const navigatorData = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}`,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || "unknown",
      navigator.platform,
    ].join("|");

    const combined = canvasData + navigatorData;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return "v_" + Math.abs(hash).toString(36);
  } catch {
    return "v_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}

function getUtmFromUrl(): UtmParams {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
    gclid: params.get("gclid") || "",
    fbclid: params.get("fbclid") || "",
  };
}

function getOrCreateVisitorId(): string {
  const storageKey = "etk_visitor_id";
  let visitorId = localStorage.getItem(storageKey);

  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(storageKey, visitorId);
  }

  return visitorId;
}

function getOrCreateSessionId(): string {
  const storageKey = "etk_session_id";
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = "s_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}

function getAndStoreUtm(): UtmParams {
  const storageKey = "etk_utm";
  const timeKey = "etk_utm_time";

  const currentUtm = getUtmFromUrl();
  const storedUtmStr = localStorage.getItem(storageKey);
  const storedTime = localStorage.getItem(timeKey);

  const hasNewUtm = currentUtm.utm_source || currentUtm.gclid || currentUtm.fbclid;
  const isExpired = !storedTime || Date.now() - parseInt(storedTime) > 30 * 60 * 1000;

  // Ako ima UTM parametri u URL-u, koristi ih
  if (hasNewUtm) {
    const finalUtm = { ...currentUtm };

    if (currentUtm.gclid && !currentUtm.utm_source) {
      finalUtm.utm_source = "google";
      finalUtm.utm_medium = "cpc";
    }
    if (currentUtm.fbclid && !currentUtm.utm_source) {
      finalUtm.utm_source = "facebook";
      finalUtm.utm_medium = "paid_social";
    }

    localStorage.setItem(storageKey, JSON.stringify(finalUtm));
    localStorage.setItem(timeKey, Date.now().toString());

    if (ANALYTICS_CONFIG.debug) {
      console.log("📊 UTM from URL:", finalUtm);
    }
    return finalUtm;
  }

  // Ako ima sačuvani UTM koji nije istekao, koristi ga
  if (storedUtmStr && !isExpired) {
    try {
      const parsed = JSON.parse(storedUtmStr);
      if (ANALYTICS_CONFIG.debug) {
        console.log("📊 UTM from storage:", parsed);
      }
      return parsed;
    } catch {
      // Ignore
    }
  }

  // AUTOMATSKA DETEKCIJA - User Agent + Referrer
  const detected = detectSourceFromReferrer();
  const finalUtm: UtmParams = {
    utm_source: detected.source,
    utm_medium: detected.medium,
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    gclid: "",
    fbclid: "",
  };

  localStorage.setItem(storageKey, JSON.stringify(finalUtm));
  localStorage.setItem(timeKey, Date.now().toString());

  if (ANALYTICS_CONFIG.debug) {
    console.log("📊 UTM auto-detected:", finalUtm);
  }

  return finalUtm;
}

function saveLandingPage(): void {
  const key = "etk_landing_page";
  if (!sessionStorage.getItem(key)) {
    const landingPage = window.location.pathname + window.location.search;
    sessionStorage.setItem(key, landingPage);
    localStorage.setItem(key, landingPage);
  }
}

function getContext(): AnalyticsContext {
  return {
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer,
    user_agent: navigator.userAgent,
    screen: `${screen.width}x${screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS KLASA
// ═══════════════════════════════════════════════════════════════════════════

class AnalyticsTracker {
  private visitorId: string;
  private sessionId: string;
  private utmParams: UtmParams;
  private pageLoadTime: number;
  private maxScrollDepth: number = 0;
  private initialized: boolean = false;
  private trackingEnabled: boolean;

  constructor() {
    this.trackingEnabled = shouldTrack();
    this.visitorId = getOrCreateVisitorId();
    this.sessionId = getOrCreateSessionId();
    this.utmParams = getAndStoreUtm();
    this.pageLoadTime = Date.now();
    saveLandingPage();

    if (ANALYTICS_CONFIG.debug) {
      console.log("📊 Analytics tracking enabled:", this.trackingEnabled);
    }
  }

  private async sendEvent(eventName: string, properties: Record<string, unknown> = {}): Promise<void> {
    // NE ŠALJI ako je development
    if (!this.trackingEnabled) {
      if (ANALYTICS_CONFIG.debug) {
        console.log("📊 Event BLOCKED (dev mode):", eventName);
      }
      return;
    }

    const payload = {
      event: eventName,
      visitor_id: this.visitorId,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      utm: this.utmParams,
      properties,
      context: getContext(),
    };

    if (ANALYTICS_CONFIG.debug) {
      console.log("📊 Analytics Event:", eventName, payload);
    }

    try {
      await fetch(ANALYTICS_CONFIG.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (error) {
      if (ANALYTICS_CONFIG.debug) {
        console.error("Analytics error:", error);
      }
    }
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (!this.trackingEnabled) {
      if (ANALYTICS_CONFIG.debug) {
        console.log("📊 Analytics NOT initialized - development mode");
      }
      return;
    }

    this.trackPageView();
    this.setupScrollTracking();
    this.setupExitTracking();

    if (ANALYTICS_CONFIG.debug) {
      console.log("📊 Analytics initialized:", {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        utm: this.utmParams,
      });
    }
  }

  trackPageView(): void {
    this.sendEvent("pageview", {
      title: document.title,
    });
  }

  private setupScrollTracking(): void {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (scrollHeight > 0) {
            const scrolled = window.scrollY;
            const depth = Math.round((scrolled / scrollHeight) * 100);
            if (depth > this.maxScrollDepth) {
              this.maxScrollDepth = depth;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  private setupExitTracking(): void {
    const handleBeforeUnload = () => {
      if (!this.trackingEnabled) return;

      const timeOnPage = Math.round((Date.now() - this.pageLoadTime) / 1000);

      const payload = {
        event: "session_end",
        visitor_id: this.visitorId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        utm: this.utmParams,
        properties: {
          time_on_page: timeOnPage,
          max_scroll_depth: this.maxScrollDepth,
        },
        context: getContext(),
      };

      navigator.sendBeacon(ANALYTICS_CONFIG.apiEndpoint, JSON.stringify(payload));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  track(eventName: string, properties?: Record<string, unknown>): void {
    this.sendEvent(eventName, properties || {});
  }

  trackEventView(eventData: { eventId: string; eventName: string; category?: string }): void {
    this.sendEvent("event_viewed", eventData);
  }

  trackTicketSelection(data: {
    eventId: string;
    eventName: string;
    ticketType: string;
    quantity: number;
    price: number;
  }): void {
    this.sendEvent("ticket_selected", data);
  }

  trackPurchaseIntent(data: {
    eventId: string;
    eventName: string;
    ticketType?: string;
    quantity: number;
    totalAmount: number;
    currency?: string;
  }): void {
    this.sendEvent("purchase_intent", {
      ...data,
      currency: data.currency || "EUR",
    });
  }

  trackCheckoutOpened(data: { eventId: string; eventName: string; totalAmount: number }): void {
    this.sendEvent("checkout_opened", data);
  }

  getCheckoutMetadata(): CheckoutMetadata {
    return {
      visitor_id: this.visitorId,
      analytics_session_id: this.sessionId,
      utm_source: this.utmParams.utm_source || "direct",
      utm_medium: this.utmParams.utm_medium || "none",
      utm_campaign: this.utmParams.utm_campaign || "",
      utm_content: this.utmParams.utm_content || "",
      gclid: this.utmParams.gclid || "",
      fbclid: this.utmParams.fbclid || "",
      landing_page: localStorage.getItem("etk_landing_page") || window.location.pathname,
    };
  }

  getVisitorId(): string {
    return this.visitorId;
  }

  getUtmParams(): UtmParams {
    return this.utmParams;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let analyticsInstance: AnalyticsTracker | null = null;

function getAnalytics(): AnalyticsTracker {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsTracker();
  }
  return analyticsInstance;
}

// ═══════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useAnalytics() {
  const analyticsRef = useRef<AnalyticsTracker | null>(null);

  useEffect(() => {
    if (!analyticsRef.current) {
      analyticsRef.current = getAnalytics();
      analyticsRef.current.init();
    }
  }, []);

  const track = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    getAnalytics().track(eventName, properties);
  }, []);

  const trackEventView = useCallback((data: { eventId: string; eventName: string; category?: string }) => {
    getAnalytics().trackEventView(data);
  }, []);

  const trackTicketSelection = useCallback(
    (data: { eventId: string; eventName: string; ticketType: string; quantity: number; price: number }) => {
      getAnalytics().trackTicketSelection(data);
    },
    [],
  );

  const trackPurchaseIntent = useCallback(
    (data: {
      eventId: string;
      eventName: string;
      ticketType?: string;
      quantity: number;
      totalAmount: number;
      currency?: string;
    }) => {
      getAnalytics().trackPurchaseIntent(data);
    },
    [],
  );

  const trackCheckoutOpened = useCallback((data: { eventId: string; eventName: string; totalAmount: number }) => {
    getAnalytics().trackCheckoutOpened(data);
  }, []);

  const getCheckoutMetadata = useCallback(() => {
    return getAnalytics().getCheckoutMetadata();
  }, []);

  const getVisitorId = useCallback(() => {
    return getAnalytics().getVisitorId();
  }, []);

  return {
    track,
    trackEventView,
    trackTicketSelection,
    trackPurchaseIntent,
    trackCheckoutOpened,
    getCheckoutMetadata,
    getVisitorId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REACT PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    const analytics = getAnalytics();
    analytics.init();
  }, []);

  return createElement("div", null, children);
}

export default useAnalytics;
