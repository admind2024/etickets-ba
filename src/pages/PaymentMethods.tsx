import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CreditCard, ShieldCheck, Globe, Info } from "lucide-react";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import SEO from "@/components/SEO";

const PaymentMethods = () => {
  const { lang: urlLang } = useParams<{ lang?: string }>();
  const { lang: contextLang } = useLanguage();
  const activeLang = urlLang || contextLang || "bs";

  const seoContent = {
    bs: {
      title: "Načini plaćanja | e-tickets",
      description:
        "Sigurno i jednostavno plaćanje ulaznica putem platnih kartica, Apple Pay i Google Pay na e-tickets platformi.",
    },
    en: {
      title: "Payment Methods | e-tickets",
      description: "Safe and simple ticket payment via credit cards, Apple Pay and Google Pay on the e-tickets platform.",
    },
  };

  const seo = seoContent[activeLang as keyof typeof seoContent] || seoContent.bs;

  const translations = {
    bs: {
      title: "Načini plaćanja",
      subtitle: "Sigurno i jednostavno plaćanje putem platnih kartica, Apple Pay i Google Pay.",
      intro: "Na webshop-u e-tickets možete plaćati na jedan od sljedećih načina:",
      section1Title: "1. Online plaćanje platnim karticama",
      section1Text1: "Plaćanje porudžbina se vrši online putem platnih kartica. Web shop e-tickets prihvata",
      section1Cards: "MasterCard, Maestro i Visa",
      section1Text2: "kartice koje su od banke izdavaoca odobrene za plaćanje preko Interneta.",
      section1Text3: "Plaćanje karticama je realizovano u saradnji sa",
      section1Stripe: "Stripe-om",
      section1Text4: ", vodećom globalnom platformom za online plaćanja, kao i sa",
      section1Banks: "domaćim bankama",
      section1Text5: "po potrebi. Sve transakcije se obavljaju na bezbjedan i sertifikovan način.",
      section2Title: "2. Digitalni novčanici",
      section2Text: "Pored klasičnih platnih kartica, e-tickets kao jedini u regionu nudi mogućnost plaćanja putem",
      section2Wallets: "Apple Pay i Google Pay",
      section2Text2:
        "digitalnih novčanika. Ovo omogućava brzo i sigurno plaćanje bez potrebe za ručnim unosom podataka kartice.",
      walletBenefitsTitle: "Prednosti digitalnih novčanika:",
      walletBenefits: [
        "Plaćanje jednim dodirom ili pogledom (Face ID / Touch ID / fingerprint)",
        "Nema potrebe za unosom broja kartice",
        "Dodatni sloj sigurnosti – podaci kartice se ne dijele sa prodavcem",
        "Brža kupovina – završite transakciju za nekoliko sekundi",
      ],
      section3Title: "3. Odgovornost za transakciju",
      section3Text:
        "Uplatilac je odgovoran za plaćanje proizvoda, tj. transakciju i prenos novčanih sredstava prema e-tickets.",
      section4Title: "4. Korištenje web shop-a",
      section4Text:
        "Korištenje web shop-a je trenutno besplatno za sve posjetioce. e-tickets zadržava pravo naplatiti uslugu u budućnosti za određene usluge koje su prethodno bile besplatne. Uvijek ćete biti blagovremeno obaviješteni o svim promjenama prije nego budete izloženi nekom trošku.",
      securityTitle: "Bezbjednost plaćanja",
      securityText: "Stripe i domaće partnerske banke koriste najsavremenije sigurnosne tehnologije:",
      securityItems: [
        { label: "PCI DSS Level 1", text: "Najviši nivo sertifikacije u industriji plaćanja" },
        { label: "TLS/SSL enkripcija", text: "Svi podaci se prenose putem zaštićene HTTPS veze" },
        { label: "Tokenizacija", text: "Osjetljivi podaci nikada ne dodiruju naše servere" },
        { label: "3D Secure 2", text: "Dodatna autentifikacija u skladu sa PSD2 regulativom" },
        { label: "Stripe Radar", text: "ML detekcija prevara u realnom vremenu" },
      ],
      conversionTitle: "Izjava o konverziji",
      conversionText:
        "Sva plaćanja će biti obavljena u eurima (€). Ukoliko se plaćanje obavlja platnim karticama inostranih banaka izdavalaca, iznos transakcije će biti konvertovan u lokalnu valutu korisnika kartice, prema kursu kartičnih kuća Visa/Mastercard.",
      conversionTextEn:
        "Please note that all payments will be effected in Euro (EUR). If the payment is done using foreign issuers payment cards, total amount of transaction will be converted into bank settlement currency, according to the current exchange rate of Visa/Mastercard.",
      feesTitle: "Troškovi obrade",
      feesText: "Troškovi obrade za kupovinu ulaznica obračunavaju se na nivou porudžbine i iznose",
      feesAmount: "5% od cijene ulaznice + 20 centi",
      feesText2: "za trošak softvera za mapiranje sjedišta. PDV je uračunat u cijenu i nema skrivenih troškova.",
    },
    en: {
      title: "Payment Methods",
      subtitle: "Safe and simple payment via credit cards, Apple Pay and Google Pay.",
      intro: "On the e-tickets webshop you can pay in one of the following ways:",
      section1Title: "1. Online payment by credit cards",
      section1Text1: "Payment for orders is made online via credit cards. The e-tickets web shop accepts",
      section1Cards: "MasterCard, Maestro and Visa",
      section1Text2: "cards that have been approved by the issuing bank for payment via the Internet.",
      section1Text3: "Card payments are made in cooperation with",
      section1Stripe: "Stripe",
      section1Text4: ", the world's leading online payment platform, as well as with",
      section1Banks: "local banks",
      section1Text5: "as needed. All transactions are carried out in a secure and certified manner.",
      section2Title: "2. Digital wallets",
      section2Text:
        "In addition to classic credit cards, e-tickets is the only platform in the region that offers the option of paying via",
      section2Wallets: "Apple Pay and Google Pay",
      section2Text2:
        "digital wallets. This enables fast and secure payment without the need to manually enter card details.",
      walletBenefitsTitle: "Benefits of digital wallets:",
      walletBenefits: [
        "Payment with one touch or look (Face ID / Touch ID / fingerprint)",
        "No need to enter card number",
        "Additional layer of security – card details are not shared with the seller",
        "Faster purchase – complete the transaction in seconds",
      ],
      section3Title: "3. Transaction responsibility",
      section3Text:
        "The payer is responsible for paying for the product, i.e. the transaction and transfer of funds to e-tickets.",
      section4Title: "4. Using the web shop",
      section4Text:
        "Using the web shop is currently free for all visitors. e-tickets reserves the right to charge for certain services that were previously free in the future. You will always be notified in advance of any changes before you are exposed to any cost.",
      securityTitle: "Payment Security",
      securityText: "Stripe and local partner banks use the most advanced security technologies:",
      securityItems: [
        { label: "PCI DSS Level 1", text: "Highest level of certification in the payment industry" },
        { label: "TLS/SSL encryption", text: "All data is transmitted via a secure HTTPS connection" },
        { label: "Tokenization", text: "Sensitive data never touches our servers" },
        { label: "3D Secure 2", text: "Additional authentication in accordance with PSD2 regulations" },
        { label: "Stripe Radar", text: "Real-time ML fraud detection" },
      ],
      conversionTitle: "Currency Conversion Statement",
      conversionText:
        "All payments will be made in euros (€). If payment is made with credit cards from foreign issuing banks, the transaction amount will be converted to the local currency of the cardholder, according to the exchange rate of Visa/Mastercard.",
      conversionTextEn:
        "Please note that all payments will be effected in Euro (EUR). If the payment is done using foreign issuers payment cards, total amount of transaction will be converted into bank settlement currency, according to the current exchange rate of Visa/Mastercard.",
      feesTitle: "Processing Fees",
      feesText: "Processing fees for ticket purchases are calculated at the order level and amount to",
      feesAmount: "5% of the ticket price + 20 cents",
      feesText2: "for the seat mapping software cost. VAT is included in the price and there are no hidden costs.",
    },
  };

  const t = translations[activeLang as keyof typeof translations] || translations.bs;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={seo.title} description={seo.description} basePath="/nacini-placanja" />
      <Header />

      <main className="flex-1 container py-16">
        {/* Hero sekcija */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t.title}</h1>
          </div>
          <p className="text-lg text-muted-foreground text-left">{t.subtitle}</p>
        </div>

        {/* Sadržaj */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-sm">
            <div className="prose prose-neutral dark:prose-invert max-w-none text-justify">
              <p>{t.intro}</p>

              <h2 className="text-2xl font-bold mt-10 mb-4">{t.section1Title}</h2>
              <p>
                {t.section1Text1} <strong>{t.section1Cards}</strong> {t.section1Text2}
              </p>
              <p>
                {t.section1Text3} <strong>{t.section1Stripe}</strong>
                {t.section1Text4} <strong>{t.section1Banks}</strong> {t.section1Text5}
              </p>

              {/* Kartice icons */}
              <div className="flex flex-wrap items-center gap-3 my-6 not-prose">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                  <span className="font-semibold text-foreground">Visa</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                  <span className="font-semibold text-foreground">MasterCard</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                  <span className="font-semibold text-foreground">Maestro</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold mt-10 mb-4">{t.section2Title}</h2>
              <p>
                {t.section2Text} <strong>{t.section2Wallets}</strong> {t.section2Text2}
              </p>

              {/* Digital wallets */}
              <div className="flex flex-wrap items-center gap-3 my-6 not-prose">
                <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span className="font-semibold">Apple Pay</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-semibold text-black">Google Pay</span>
                </div>
              </div>

              <p>
                <strong>{t.walletBenefitsTitle}</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                {t.walletBenefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>

              <h2 className="text-2xl font-bold mt-10 mb-4">{t.section3Title}</h2>
              <p>{t.section3Text}</p>

              <h2 className="text-2xl font-bold mt-10 mb-4">{t.section4Title}</h2>
              <p>{t.section4Text}</p>
            </div>

            {/* Bezbjednost sekcija */}
            <div className="mt-12 p-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">{t.securityTitle}</h3>
                  <p className="text-green-700 dark:text-green-300 text-sm mb-3">{t.securityText}</p>
                  <ul className="text-green-700 dark:text-green-300 space-y-2 text-sm">
                    {t.securityItems.map((item, index) => (
                      <li key={index}>
                        <strong>{item.label}</strong> – {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Konverzija sekcija */}
            <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">{t.conversionTitle}</h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mb-2">{t.conversionText}</p>
                  <p className="text-blue-600 dark:text-blue-400 text-sm italic">{t.conversionTextEn}</p>
                </div>
              </div>
            </div>

            {/* Info sekcija */}
            <div className="mt-6 p-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Info className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">{t.feesTitle}</h3>
                  <p className="text-amber-700 dark:text-amber-300 text-sm">
                    {t.feesText} <strong>{t.feesAmount}</strong> {t.feesText2}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentMethods;
