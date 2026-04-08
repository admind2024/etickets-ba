import { CheckCircle, Mail, MessageCircle, AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";

const PaymentSuccess = () => {
  const { lang: urlLang } = useParams<{ lang?: string }>();
  const { lang: contextLang, setLang } = useLanguage();
  const activeLang = urlLang || contextLang || "bs";
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLanguageChange = (newLang: "bs" | "en") => {
    setLang(newLang);
    const basePath = window.location.pathname.includes("uspjesno-placanje-fscg")
      ? "/uspjesno-placanje-fscg"
      : "/uspjesno-placanje";
    navigate(`${basePath}/${newLang}`);
  };

  const languages = [
    { code: "bs", flag: "🇧🇦", label: "BOS" },
    { code: "en", flag: "🇬🇧", label: "ENG" },
  ];

  const translations = {
    bs: {
      title: "Kupovina uspješna!",
      subtitle: "Hvala vam na povjerenju",
      deliveryTitle: "Karte su poslate na:",
      emailTitle: "E-mail",
      emailText: "QR kod na vašu email adresu",
      whatsappTitle: "WhatsApp",
      whatsappText: "Karte na vaš WhatsApp broj",
      smsTitle: "SMS",
      smsText: "Link do karata na vaš telefon",
      warningTitle: "Niste dobili karte?",
      warningItems: ["Provjerite Spam folder", "Provjerite broj telefona", "Sačekajte par minuta"],
      supportText: "Kontaktirajte podršku:",
      backButton: "Nazad na početnu",
      slogan: "Vaša karta za svaki događaj",
    },
    en: {
      title: "Purchase successful!",
      subtitle: "Thank you for your trust",
      deliveryTitle: "Tickets sent to:",
      emailTitle: "E-mail",
      emailText: "QR code to your email",
      whatsappTitle: "WhatsApp",
      whatsappText: "Tickets to your WhatsApp",
      smsTitle: "SMS",
      smsText: "Link to tickets on your phone",
      warningTitle: "Didn't receive tickets?",
      warningItems: ["Check Spam folder", "Verify phone number", "Wait a few minutes"],
      supportText: "Contact support:",
      backButton: "Back to home",
      slogan: "Your ticket to every event",
    },
  };

  const t = translations[activeLang as keyof typeof translations] || translations.bs;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-20 flex flex-col sm:flex-row gap-1.5">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code as "bs" | "en")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeLang === lang.code
                ? "bg-white/20 text-white border border-white/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="text-base">{lang.flag}</span>
            <span className="hidden sm:inline">{lang.label}</span>
          </button>
        ))}
      </div>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              animation: `float ${3 + i}s linear infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div
        className={`w-full max-w-md relative z-10 transition-all duration-700 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        {/* Success Icon */}
        <div className="text-center mb-5">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-green-500/30 rounded-full animate-ping" />
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse scale-125" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
              <CheckCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400 animate-bounce" />
          </div>

          <h1 className="text-xl font-bold text-white mt-4 mb-1">{t.title}</h1>
          <p className="text-slate-400 text-xs">{t.subtitle}</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
          {/* Delivery Section */}
          <div className="p-4">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-3">{t.deliveryTitle}</p>

            <div className="grid grid-cols-3 gap-2">
              {/* Email */}
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all hover:scale-105 hover:border-green-500/50 group cursor-default">
                <div className="w-8 h-8 mx-auto mb-1.5 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-[11px] font-semibold text-white mb-0.5">{t.emailTitle}</p>
                <p className="text-[9px] text-slate-500 leading-tight">{t.emailText}</p>
              </div>

              {/* WhatsApp */}
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all hover:scale-105 hover:border-green-500/50 group cursor-default">
                <div className="w-8 h-8 mx-auto mb-1.5 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-white mb-0.5">{t.whatsappTitle}</p>
                <p className="text-[9px] text-slate-500 leading-tight">{t.whatsappText}</p>
              </div>

              {/* SMS */}
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all hover:scale-105 hover:border-green-500/50 group cursor-default">
                <div className="w-8 h-8 mx-auto mb-1.5 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-[11px] font-semibold text-white mb-0.5">{t.smsTitle}</p>
                <p className="text-[9px] text-slate-500 leading-tight">{t.smsText}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Warning Section */}
          <div className="p-4">
            <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-300 mb-1.5">{t.warningTitle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {t.warningItems.map((item, index) => (
                    <span
                      key={index}
                      className="text-[10px] text-amber-200/70 bg-amber-500/10 px-2 py-0.5 rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Support & Back */}
          <div className="p-4 space-y-3">
            <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-[10px] text-green-300/70 mb-2">{t.supportText}</p>
              <a
                href="mailto:support@etickets.me"
                className="inline-flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 font-semibold transition-colors"
              >
                <Mail className="w-4 h-4" />
                support@etickets.me
              </a>
            </div>

            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.backButton}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-base font-bold text-primary">etickets</p>
          <p className="text-[10px] text-slate-500">{t.slogan}</p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(100vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default PaymentSuccess;
