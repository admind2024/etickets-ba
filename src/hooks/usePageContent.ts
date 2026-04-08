import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPageContent } from "@/lib/eventApi";
import { useLanguage } from "@/contexts/LanguageContext";

interface PageContent {
  title: string;
  body: string;
  seo_title: string | null;
  seo_description: string | null;
}

export const usePageContent = (pageKey: string) => {
  const [content, setContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang: urlLang } = useParams<{ lang?: string }>();
  const { lang: contextLang } = useLanguage();
  
  const activeLang = urlLang || contextLang || "me";

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const data = await getPageContent(pageKey, activeLang);
        setContent(data);
      } catch (error) {
        console.error("Error fetching page content:", error);
      }
      setLoading(false);
    };
    fetchContent();
  }, [pageKey, activeLang]);

  return { content, loading, lang: activeLang };
};

export default usePageContent;
