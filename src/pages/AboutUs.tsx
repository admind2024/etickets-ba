import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import SEO from "@/components/SEO";

const AboutUs = () => {
  const { lang } = useParams<{ lang?: string }>();

  // Determine language from URL param, default to "bs"
  const currentLang = lang === "en" ? lang : "bs";

  // All translations
  const content: Record<
    string,
    {
      seoTitle: string;
      seoDescription: string;
      whoWeAre: string;
      whoWeAreText1: string;
      whoWeAreText2: string;
      ourVision: string;
      ourVisionText: string;
      whatWeOffer: string;
      whatWeOfferIntro: string;
      offer1: string;
      offer2: string;
      offer3: string;
      offer4: string;
      offer5: string;
      partnerships: string;
      partnershipsText1: string;
      partnershipsText2: string;
      whyUs: string;
      simple: string;
      simpleText: string;
      secure: string;
      secureText: string;
      exclusive: string;
      exclusiveText: string;
      support: string;
      supportText: string;
      slogan: string;
    }
  > = {
    bs: {
      seoTitle: "O nama | etickets",
      seoDescription:
        "etickets je vodeća regionalna platforma za online kupovinu i prodaju ulaznica u Bosni i Hercegovini, Crnoj Gori i Srbiji. Brzo, sigurno i jednostavno.",
      whoWeAre: "Ko smo mi?",
      whoWeAreText1:
        "etickets je vodeća regionalna platforma za online kupovinu i prodaju ulaznica u Bosni i Hercegovini, Crnoj Gori i Srbiji. Putem savremenog sistema etickets, korisnicima i organizatorima omogućavamo potpuno digitalizovano iskustvo – brzo, sigurno i jednostavno, bez čekanja u redovima i bez štampanja karata.",
      whoWeAreText2:
        "Na jednom mjestu povezujemo publiku sa najznačajnijim događajima širom regiona, dok organizatorima pružamo moćan alat za profesionalnu prodaju i upravljanje ulaznicama.",
      ourVision: "Naša vizija",
      ourVisionText:
        "Vizija platforme etickets je da postane centralno regionalno mjesto za prodaju ulaznica u Bosni i Hercegovini, Crnoj Gori, Srbiji i šire, spajajući modernu tehnologiju sa industrijom događaja i stvarajući novu dimenziju live-entertainment iskustva.",
      whatWeOffer: "Šta nudimo?",
      whatWeOfferIntro:
        "Kroz etickets regionalni sistem obezbjeđujemo kompletnu infrastrukturu za digitalnu prodaju ulaznica:",
      offer1: "Brzu i sigurnu kupovinu ulaznica putem više metoda plaćanja",
      offer2: "Automatsku isporuku e-ulaznica na e-mail ili mobilni telefon",
      offer3: "Validaciju karata putem QR koda, bez gužvi na ulazu",
      offer4: "Podršku organizatorima u prodaji i promociji događaja",
      offer5: "Praćenje prodaje u realnom vremenu kroz napredni administrativni panel",
      partnerships: "Partnerstva i podrška događajima",
      partnershipsText1:
        "Na platformi etickets svakodnevno se nalaze deseci aktuelnih događaja iz Bosne i Hercegovine, Crne Gore, Srbije i regiona. Sarađujemo sa muzičkim festivalima, velikim koncertima, sportskim manifestacijama, pozorištima i brojnim produkcijama.",
      partnershipsText2:
        "Kao prepoznat regionalni distributer ulaznica, etickets je postao ključni partner za najznačajnije događaje na Balkanu.",
      whyUs: "Zašto baš etickets?",
      simple: "Jednostavno",
      simpleText: "Kupovina ulaznica za događaje širom regiona u par klikova",
      secure: "Sigurno",
      secureText: "Maksimalna zaštita podataka i plaćanja",
      exclusive: "Ekskluzivno",
      exclusiveText: "Pristup najatraktivnijim događajima prije svih",
      support: "Podrška 24/7",
      supportText: "Regionalni tim koji je uvijek na raspolaganju",
      slogan: "etickets – Tvoja ulaznica za svaki događaj",
    },
    en: {
      seoTitle: "About Us | etickets",
      seoDescription: "etickets is the leading regional platform for online ticket sales in Bosnia and Herzegovina, Montenegro and Serbia. Fast, secure, and simple.",
      whoWeAre: "Who are we?",
      whoWeAreText1:
        "etickets is the leading regional platform for online ticket purchase and sales in Bosnia and Herzegovina, Montenegro and Serbia. Through our modern etickets system, we provide users and organizers with a fully digitalized experience – fast, secure, and simple, without waiting in lines or printing tickets.",
      whoWeAreText2:
        "We connect audiences with the most significant events across the region in one place, while providing organizers with a powerful tool for professional ticket sales and management.",
      ourVision: "Our Vision",
      ourVisionText:
        "The vision of the etickets platform is to become the central regional hub for ticket sales in Bosnia and Herzegovina, Montenegro, Serbia, and beyond, combining modern technology with the events industry and creating a new dimension of live entertainment experience.",
      whatWeOffer: "What do we offer?",
      whatWeOfferIntro:
        "Through the etickets regional system, we provide complete infrastructure for digital ticket sales:",
      offer1: "Fast and secure ticket purchases through multiple payment methods",
      offer2: "Automatic e-ticket delivery to email or mobile phone",
      offer3: "QR code ticket validation, without crowds at the entrance",
      offer4: "Support for organizers in event sales and promotion",
      offer5: "Real-time sales tracking through an advanced admin panel",
      partnerships: "Partnerships and Event Support",
      partnershipsText1:
        "The etickets platform daily features dozens of current events from Bosnia and Herzegovina, Montenegro, Serbia, and the region. We collaborate with music festivals, major concerts, sports events, theaters, and numerous productions.",
      partnershipsText2:
        "As a recognized regional ticket distributor, etickets has become a key partner for the most significant events in the Balkans.",
      whyUs: "Why choose etickets?",
      simple: "Simple",
      simpleText: "Buy tickets for events across the region in just a few clicks",
      secure: "Secure",
      secureText: "Maximum protection of data and payments",
      exclusive: "Exclusive",
      exclusiveText: "Access to the most attractive events before anyone else",
      support: "24/7 Support",
      supportText: "A regional team always at your service",
      slogan: "etickets – Your ticket to every event",
    },
  };

  const t = content[currentLang] || content.bs;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={t.seoTitle} description={t.seoDescription} type="website" basePath="/o-nama" />
      <Header />

      <main className="flex-1 container py-16">
        {/* Ko smo mi */}
        <section className="mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-6">{t.whoWeAre}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            <span className="font-semibold text-primary">etickets</span> {t.whoWeAreText1.replace("etickets ", "")}
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mt-4">{t.whoWeAreText2}</p>
        </section>

        {/* Naša vizija */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-6">{t.ourVision}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t.ourVisionText.split("etickets").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="font-semibold text-primary">etickets</span>}
              </span>
            ))}
          </p>
        </section>

        {/* Šta nudimo */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-6">{t.whatWeOffer}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            {t.whatWeOfferIntro.split("etickets").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="font-semibold text-primary">etickets</span>}
              </span>
            ))}
          </p>
          <ul className="space-y-3 text-lg text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold">✔</span>
              <span>{t.offer1}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold">✔</span>
              <span>{t.offer2}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold">✔</span>
              <span>{t.offer3}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold">✔</span>
              <span>{t.offer4}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold">✔</span>
              <span>{t.offer5}</span>
            </li>
          </ul>
        </section>

        {/* Partnerstva */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-6">{t.partnerships}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t.partnershipsText1.split("etickets").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="font-semibold text-primary">etickets</span>}
              </span>
            ))}
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed mt-4">
            {t.partnershipsText2.split("etickets").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="font-semibold text-primary">etickets</span>}
              </span>
            ))}
          </p>
        </section>

        {/* Zašto baš etickets */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-6">{t.whyUs}</h2>
          <ul className="space-y-4 text-lg text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold">✅</span>
              <span>
                <span className="font-semibold text-foreground">{t.simple}</span> – {t.simpleText}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold">✅</span>
              <span>
                <span className="font-semibold text-foreground">{t.secure}</span> – {t.secureText}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold">✅</span>
              <span>
                <span className="font-semibold text-foreground">{t.exclusive}</span> – {t.exclusiveText}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary font-bold">✅</span>
              <span>
                <span className="font-semibold text-foreground">{t.support}</span> – {t.supportText}
              </span>
            </li>
          </ul>
        </section>

        {/* Slogan */}
        <section className="text-center py-12 bg-primary/5 rounded-2xl">
          <p className="text-2xl font-bold text-primary">{t.slogan}</p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
