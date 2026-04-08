import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AnalyticsProvider } from "@/hooks/useAnalytics";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import Index from "./pages/Index";
import ScrollToTop from "./components/ScrollToTop";
// ChatWidget removed for etickets.ba

// Lazy load pages that are not immediately visible
const EventDetail = lazy(() => import("./pages/EventDetail"));
const EventSelect = lazy(() => import("./pages/EventSelect"));
const SeatSelection = lazy(() => import("./pages/SeatSelection"));
const TicketsPage = lazy(() => import("./pages/TicketsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SimpleEventPage = lazy(() => import("./pages/SimpleEventPage"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminGuard = lazy(() => import("./components/AdminGuard"));
const TicketDisplay = lazy(() => import("./pages/TicketDisplay"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Contact = lazy(() => import("./pages/Contact"));
const HowToBuy = lazy(() => import("./pages/HowToBuy"));
const TicketRefund = lazy(() => import("./pages/TicketRefund"));
const FAQ = lazy(() => import("./pages/FAQ"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Reklamacije = lazy(() => import("./pages/Reklamacije"));
const Events = lazy(() => import("./pages/Events"));
const PromoEmina = lazy(() => import("./pages/PromoEmina"));
const TicketMockup = lazy(() => import("./pages/TicketMockup"));

// SEO Pages
const PerformersList = lazy(() => import("./pages/seo/PerformersList"));
const PerformerDetail = lazy(() => import("./pages/seo/PerformerDetail"));
const VenuesList = lazy(() => import("./pages/seo/VenuesList"));
const VenueDetail = lazy(() => import("./pages/seo/VenueDetail"));
const OrganizerDetail = lazy(() => import("./pages/seo/OrganizerDetail"));

// Admin pages for SEO
const AdminPerformers = lazy(() => import("./pages/admin/AdminPerformers"));
const AdminVenues = lazy(() => import("./pages/admin/AdminVenues"));
const AdminOrganizers = lazy(() => import("./pages/admin/AdminOrganizers"));

// Lazy load admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const PregledProdaje = lazy(() => import("./pages/admin/PregledProdaje"));
const PregledKarata = lazy(() => import("./pages/admin/PregledKarata"));
const Statistika = lazy(() => import("./pages/admin/Statistika"));
const AdEvents = lazy(() => import("./pages/admin/AdEvents"));
const Skeniranje = lazy(() => import("./pages/admin/Skeniranje"));
const Refund = lazy(() => import("./pages/admin/Refund"));
const Isplate = lazy(() => import("./pages/admin/Isplate"));
const Booking = lazy(() => import("./pages/admin/Booking"));
const PaymentLinkCreator = lazy(() => import("./pages/admin/PaymentLinkCreator"));
const Pazar = lazy(() => import("./pages/admin/Pazar"));
const ProvjeraDuplikata = lazy(() => import("./pages/admin/ProvjeraDuplikata"));
const AdminMail = lazy(() => import("./pages/admin/AdminMail"));
const CMS = lazy(() => import("./pages/admin/CMS"));
const CardBackfill = lazy(() => import("./pages/admin/CardBackfill"));
const AnalyticsDashboard = lazy(() => import("./pages/admin/AnalyticsDashboard"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const OrganizatoriIzvjestaj = lazy(() => import("./pages/admin/OrganizatoriIzvjestaj"));
const AdminSponzori = lazy(() => import("./pages/admin/AdminSponzori"));
const UlaziIzvjestaj = lazy(() => import("./pages/admin/UlaziIzvjestaj"));
const AdminTeams = lazy(() => import("./pages/admin/AdminTeams"));
const AdminPlayers = lazy(() => import("./pages/admin/AdminPlayers"));
const AdMatch = lazy(() => import("./pages/admin/AdMatch"));
const MatchPage = lazy(() => import("./pages/MatchPage"));
const AdminStadiumSeats = lazy(() => import("./pages/admin/AdminStadiumSeats"));
const DokumentKupaca = lazy(() => import("./pages/admin/DokumentKupaca"));
const GenerateQR = lazy(() => import("./pages/admin/GenerateQR"));
const AdminBinPopusti = lazy(() => import("./pages/admin/AdminBinPopusti"));
const AdminBanner = lazy(() => import("./pages/admin/AdminBanner"));
const AdminOsiguranje = lazy(() => import("./pages/admin/AdminOsiguranje"));
const CardStatistika = lazy(() => import("./pages/admin/CardStatistika"));
const FscgSeatSelection = lazy(() => import("./pages/FscgSeatSelection"));
const MatchCheckoutPage = lazy(() => import("./pages/MatchCheckoutPage"));
const FscgTicketDisplay = lazy(() => import("./pages/FscgTicketDisplay"));
const FestivalPage = lazy(() => import("./pages/FestivalPage"));
const FestivalCheckoutPage = lazy(() => import("./pages/FestivalCheckoutPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ThemeProvider defaultTheme="auto">
        <TooltipProvider>
          <AnalyticsProvider>
            <Toaster />
            <Sonner />
            <SpeedInsights />
            <Analytics />
            <BrowserRouter>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/en" element={<Index />} />
                  <Route path="/o-nama" element={<AboutUs />} />
                  <Route path="/o-nama/:lang" element={<AboutUs />} />
                  <Route path="/kontakt" element={<Contact />} />
                  <Route path="/kontakt/:lang" element={<Contact />} />
                  <Route path="/kako-kupiti" element={<HowToBuy />} />
                  <Route path="/kako-kupiti/:lang" element={<HowToBuy />} />
                  <Route path="/povrat-ulaznica" element={<TicketRefund />} />
                  <Route path="/povrat-ulaznica/:lang" element={<TicketRefund />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/faq/:lang" element={<FAQ />} />
                  <Route path="/uslovi-koriscenja" element={<TermsOfUse />} />
                  <Route path="/uslovi-koriscenja/:lang" element={<TermsOfUse />} />
                  <Route path="/politika-privatnosti" element={<PrivacyPolicy />} />
                  <Route path="/politika-privatnosti/:lang" element={<PrivacyPolicy />} />
                  <Route path="/nacin-placanja" element={<PaymentMethods />} />
                  <Route path="/nacin-placanja/:lang" element={<PaymentMethods />} />
                  <Route path="/uspjesno-placanje" element={<PaymentSuccess />} />
                  <Route path="/uspjesno-placanje/:lang" element={<PaymentSuccess />} />
                  <Route path="/marketing" element={<Marketing />} />
                  <Route path="/marketing/:lang" element={<Marketing />} />
                  <Route path="/reklamacije" element={<Reklamacije />} />
                  <Route path="/reklamacije/:lang" element={<Reklamacije />} />
                  <Route path="/dogadjaji" element={<Events />} />
                  <Route path="/dogadjaji/:lang" element={<Events />} />
                  {/* Event select - izbor datuma za eventi sa više termina */}
                  <Route path="/event-select/:slug" element={<EventSelect />} />
                  <Route path="/event-select/:slug/:lang" element={<EventSelect />} />
                  {/* Canonical event route with language support */}
                  <Route path="/dogadjaj/:slug" element={<EventDetail />} />
                  <Route path="/dogadjaj/:slug/:lang" element={<EventDetail />} />
                  <Route path="/event/:slug" element={<EventDetail />} />
                  <Route path="/event/:slug/:lang" element={<EventDetail />} />
                  {/* Legacy/duplicate routes - SEOHead handles noindex */}
                  <Route path="/about-events/:slug" element={<EventDetail />} />
                  <Route path="/events/:slug" element={<SeatSelection />} />
                  <Route path="/events/:slug/tickets" element={<TicketsPage />} />
                  <Route path="/simple-event/:slug" element={<SimpleEventPage />} />
                  <Route path="/mec/:slug" element={<MatchPage />} />
                  <Route path="/mec/:slug/:lang" element={<MatchPage />} />
                  <Route path="/sindikat-telekom" element={<PromoEmina />} />
                  <Route path="/ticket-mockup" element={<TicketMockup />} />
                  <Route path="/tickets" element={<TicketDisplay />} />
                  {/* FSCG Match routes */}
                  <Route path="/fscg/:slug" element={<FscgSeatSelection />} />
                  <Route path="/checkout/fscg/:slug" element={<MatchCheckoutPage />} />
                  <Route path="/fscg-karta" element={<FscgTicketDisplay />} />
                  <Route path="/uspjesno-placanje-fscg" element={<PaymentSuccess />} />
                  {/* Festival routes */}
                  <Route path="/festival/:slug" element={<FestivalPage />} />
                  <Route path="/festival/:slug/:lang" element={<FestivalPage />} />
                  <Route path="/checkout/festival/:slug" element={<FestivalCheckoutPage />} />
                  <Route path="/uspjesno-placanje-fscg/:lang" element={<PaymentSuccess />} />
                  {/* SEO Pages - with language support */}
                  <Route path="/izvodjaci" element={<PerformersList />} />
                  <Route path="/izvodjaci/:slug" element={<PerformerDetail />} />
                  <Route path="/izvodjaci/:slug/:lang" element={<PerformerDetail />} />
                  <Route path="/lokacije" element={<VenuesList />} />
                  <Route path="/lokacije/:slug" element={<VenueDetail />} />
                  <Route path="/lokacije/:slug/:lang" element={<VenueDetail />} />
                  <Route path="/organizatori/:slug" element={<OrganizerDetail />} />
                  <Route path="/organizatori/:slug/:lang" element={<OrganizerDetail />} />
                  {/* Admin Login & Password Reset - PUBLIC */}
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  {/* Admin Routes - PROTECTED */}
                  <Route
                    path="/admin"
                    element={
                      <AdminGuard>
                        <AdminLayout />
                      </AdminGuard>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="prodaja" element={<PregledProdaje />} />
                    <Route path="karte" element={<PregledKarata />} />
                    <Route path="statistika" element={<Statistika />} />
                    <Route path="analytics" element={<AnalyticsDashboard />} />
                    <Route path="events" element={<AdEvents />} />
                    <Route path="skeniranje" element={<Skeniranje />} />
                    <Route path="refund" element={<Refund />} />
                    <Route path="isplate" element={<Isplate />} />
                    <Route path="booking" element={<Booking />} />
                    <Route path="link-placanje" element={<PaymentLinkCreator />} />
                    <Route path="pazar" element={<Pazar />} />
                    <Route path="duplikati" element={<ProvjeraDuplikata />} />
                    <Route path="mail" element={<AdminMail />} />
                    <Route path="cms" element={<CMS />} />
                    <Route path="card-backfill" element={<CardBackfill />} />
                    <Route path="performers" element={<AdminPerformers />} />
                    <Route path="venues" element={<AdminVenues />} />
                    <Route path="organizers" element={<AdminOrganizers />} />
                    <Route path="eventi" element={<AdminEvents />} />
                    <Route path="organizatori-izvjestaj" element={<OrganizatoriIzvjestaj />} />
                    <Route path="sponzori" element={<AdminSponzori />} />
                    <Route path="ulazi" element={<UlaziIzvjestaj />} />
                    <Route path="dodaj-mec" element={<AdMatch />} />
                    <Route path="teams" element={<AdminTeams />} />
                    <Route path="igraci" element={<AdminPlayers />} />
                    <Route path="sjedista" element={<AdminStadiumSeats />} />
                    <Route path="dokumenti" element={<DokumentKupaca />} />
                    <Route path="generisi-qr" element={<GenerateQR />} />
                    <Route path="bin-popusti" element={<AdminBinPopusti />} />
                    <Route path="banner" element={<AdminBanner />} />
                    <Route path="osiguranje" element={<AdminOsiguranje />} />
                    <Route path="card-statistika" element={<CardStatistika />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AnalyticsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
