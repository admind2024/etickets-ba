import { Link, LinkProps } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

// Rute koje podržavaju i18n
const i18nPrefixes = [
  "/dogadjaj/",
  "/event-select/",
  "/event/",
  "/izvodjaci/",
  "/lokacije/",
  "/o-nama",
  "/kontakt",
  "/kako-kupiti",
  "/povrat-ulaznica",
  "/faq",
  "/uslovi-koriscenja",
  "/politika-privatnosti",
  "/nacin-placanja",
];

export const LocalizedLink: React.FC<LinkProps> = ({ to, children, ...props }) => {
  const { lang } = useLanguage();
  
  let finalTo = to;
  
  if (typeof to === "string" && lang !== "me") {
    const isI18nRoute = i18nPrefixes.some(prefix => to.startsWith(prefix));
    const hasLang = to.endsWith("/en") || to.endsWith("/ru");
    
    if (isI18nRoute && !hasLang) {
      finalTo = `${to}/${lang}`;
    }
  }
  
  return <Link to={finalTo} {...props}>{children}</Link>;
};

export default LocalizedLink;
