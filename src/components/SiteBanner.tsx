import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export function SiteBanner() {
  const [banner, setBanner] = useState<{ enabled: boolean; text: string; textEn: string } | null>(null);
  const { lang } = useLanguage();

  useEffect(() => {
    supabase
      .from("site_banner")
      .select("enabled, text, text_en")
      .eq("id", "main")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBanner({ enabled: data.enabled, text: data.text || "", textEn: data.text_en || "" });
      });
  }, []);

  if (!banner?.enabled || !banner.text) return null;

  return (
    <div className="w-full bg-amber-500 text-white text-center py-2 px-4 text-xs sm:text-sm font-medium z-[60] relative">
      <span className="mr-1.5">⚠️</span>
      {lang === "en" && banner.textEn ? banner.textEn : banner.text}
    </div>
  );
}
