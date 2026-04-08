import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Shield } from "lucide-react";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import SEO from "@/components/SEO";

const PrivacyPolicy = () => {
  const { lang: urlLang } = useParams<{ lang?: string }>();
  const { lang: contextLang } = useLanguage();
  const activeLang = urlLang || contextLang || "bs";

  const seoContent = {
    bs: {
      title: "Politika privatnosti | e-tickets",
      description: "Politika privatnosti e-tickets. Saznajte kako prikupljamo, koristimo i štitimo vaše lične podatke.",
    },
    en: {
      title: "Privacy Policy | e-tickets",
      description: "Privacy policy of e-tickets. Learn how we collect, use and protect your personal data.",
    },
  };

  const seo = seoContent[activeLang as keyof typeof seoContent] || seoContent.bs;

  const translations = {
    bs: {
      title: "Politika privatnosti",
      subtitle:
        "Vaša privatnost nam je važna. Ovdje možete saznati kako prikupljamo, koristimo i štitimo Vaše lične podatke.",
      copyright: "Copyright © by RAKUNAT D.O.O., Sva prava zadržana.",
      content: `<p>
        RAKUNAT D.O.O. zadržava pravo da prikuplja određene lične podatke prilikom pretrage nekih internet stranica ovog Sajta da bi ispunio vaše zahtjeve ili potrebe. Svako prikupljanje takvih informacija na ovim stranicama biće sprovedeno u skladu sa pravilima o privatnosti sadržanom na ovim internet stranicama, kao i važećim propisima o zaštiti podataka o ličnosti.
      </p>
      <p>
        Neke stranice ovog Sajta bi mogle čuvati određene pakete informacija poznate kao "cookies" (kolačići) na vašem računaru. Kolačići nam daju odgovor na pitanje kako i kada je stranica ovog Sajta posjećena i koliko ljudi je posjetilo. Ova tehnologija ne skuplja informacije o vašem ličnom identitetu, umjesto toga, informacije se nalaze u zbirnoj formi. Svrha ove tehnologije i informacija koje ona prikuplja je da nam pomogne da unaprijedimo svoj Sajt.
      </p>
      <p>
        RAKUNAT D.O.O. nije odgovoran za sadržaj informacija objavljenih od strane korisnika putem chat-a. RAKUNAT D.O.O. se ne smatra odgovornim niti je u obavezi da prati razgovore na chatu i samim tim ne snosi nikakve posledice za sadržaj bilo kog saopštenja, bez obzira da li proizilazi ili ne iz zakona o autorskim pravima, kleveti, privatnosti ili drugog.
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Opšta politika zaštite privatnosti i podataka</h2>
      <p>
        RAKUNAT D.O.O. poštuje Vašu privatnost. Bez obzira na to da li ste sa RAKUNAT D.O.O.-om u kontaktu oko proizvoda i/ili usluga kao kupac, korisnik, predstavnik javnosti itd. Imate pravo na zaštitu ličnih podataka: imena, adrese, telefonskog broja, adrese e-pošte i drugih podataka kao što su, IP adresa, geolokacijski podaci, itd.
      </p>
      <p>
        U Opštoj politici zaštite privatnosti i ličnih podataka RAKUNAT D.O.O. („ova politika"), opisuje se postupak prikupljanja Vaših ličnih podataka i svrha u koju se oni prikupljaju, način korišćenja Vaših ličnih podataka, sa kim se Vaši lični podaci dijele, kako se štite i koje su Vaše mogućnosti u opsegu zaštite ličnih podataka.
      </p>
      <p>
        Ova politika se odnosi na obradu Vaših ličnih podataka u okviru različitih usluga, alata, aplikacija, webmjesta, portala, (internet) promocija, marketinških akcija, sponzorisanih platformi na društvenim medijima itd., koje pružamo ili kojima upravljamo mi ili treća strana u naše ime.
      </p>
      <p>
        Ova politika sadrži opšta pravila i objašnjenja. Za određene usluge, alate, aplikacije, web-mjesta, portale, (internet) promocije, marketinške akcije, sponzorisane platforme na društvenim medijima, itd., koje nudi RAKUNAT D.O.O. ili njima upravlja treća strana u ime RAKUNAT D.O.O.-a, ova politika može da se dopunjava posebnim, odvojenim obavještenjima o zaštiti privatnosti. O tim posebnim obavještenjima o zaštiti privatnosti obavijestićemo Vas na primjeren način svaki put kada prikupljamo Vaše lične podatke u gore navedenim aktivnostima.
      </p>
      <p>
        Ova politika se primjenjuje na sve Vaše lične podatke, koje prikuplja RAKUNAT D.O.O., Nikšić, Bosna i Hercegovina, ovlašćeni prodavci, rešavaoci reklamacija i sl., zajedno navedeni u ovoj politici kao „Rakunat d.o.o.", „mi", „nas" i „naš".
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Ko je odgovoran za obradu Vaših ličnih podataka?</h2>
      <p>Organizacije odgovorne za obradu Vaših ličnih podataka su:</p>
      <p class="font-semibold">RAKUNAT D.O.O., Nikšić, Bosna i Hercegovina</p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Osnovna načela</h2>
      <p>
        Cijenimo povjerenje koje nam ukazujete tako što nam povjeravate Vaše lične podatke i obavezujemo se da ćemo ih uvijek obrađivati na pošten, transparentan i siguran način. Ključna načela koja RAKUNAT D.O.O. poštuje pri obradi ličnih podataka su sledeća:
      </p>
      <ul class="list-disc pl-6 space-y-2">
        <li><strong>Zakonitost:</strong> Lične podatke prikupljaćemo na pošten, zakonit i transparentan način.</li>
        <li><strong>Najmanji opseg ličnih podataka (minimizacija):</strong> Prikupljanje ličnih podataka ograničićemo na one koji su prikladni i potrebni za svrhu u koju su prikupljeni.</li>
        <li><strong>Ograničenje svrhe:</strong> Lične podatke prikupljaćemo samo u određene, eksplicitne i legitimne svrhe i nećemo ih obrađivati na način koji nije u skladu sa tom svrhom.</li>
        <li><strong>Tačnost:</strong> Osiguraćemo tačnost i ažurnost ličnih podataka.</li>
        <li><strong>Sigurnost i zaštita ličnih podataka:</strong> Sprovodićemo tehničke i organizacione mjere za osiguranje odgovarajućih nivoa zaštite podataka uzimajući u obzir, između ostalog, prirodu Vaših ličnih podataka koje treba zaštiti.</li>
        <li><strong>Ograničenje čuvanja:</strong> Vaši lični podaci čuvaće se u skladu sa važećim zakonskim propisima o zaštiti ličnih podataka i samo onoliko dugo koliko je potrebno za postizanje svrhe u koju su prikupljeni.</li>
        <li><strong>Zakonitost neposrednog marketinga i kolačića:</strong> Slanje promotivnih materijala i postavljanje kolačića odvijaće se u skladu sa važećim zakonodavstvom.</li>
      </ul>

      <h2 class="text-2xl font-bold mt-10 mb-4">Obrada Vaših ličnih podataka</h2>
      <h3 class="text-xl font-semibold mt-6 mb-3">Koje podatke prikupljamo i po kojoj pravnoj osnovi</h3>
      <p>
        Uvijek ćete biti jasno obavješteni koje lične podatke prikupljamo. Te informacije ćemo vam predočiti uz odvojeno obavještenje o zaštiti privatnosti koje će biti uključeno u određene usluge.
      </p>
      <p>U skladu sa važećim propisima o zaštiti ličnih podataka možemo da obrađujemo Vaše lične podatke ako:</p>
      <ul class="list-disc pl-6 space-y-2">
        <li>ste dali saglasnost za određene svrhe obrade;</li>
        <li>je obrada Vaših ličnih podataka potrebna za ispunjenje uslova ugovora čija ste ugovorna stranka;</li>
        <li>takvom obradom slijedimo legitimne interese;</li>
        <li>je to potrebno za ispunjavanje naših zakonskih obaveza.</li>
      </ul>

      <h3 class="text-xl font-semibold mt-6 mb-3">Briga o tačnosti i ažurnosti Vaših ličnih podataka</h3>
      <p>
        Važno nam je da su Vaši podaci uvek tačni i ažurirani. Obavijestite nas o svim promjenama ili greškama u našim zapisima Vaših ličnih podataka tako što ćete nas kontaktirati.
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Pristup svojim ličnim podacima</h2>
      <p>
        Imate pravo pristupa svojim ličnim podacima koje obrađujemo i ako su Vaši lični podaci netačni ili nepotpuni možete da zahtijevate ispravku ili brisanje ličnih podataka.
      </p>

      <h3 class="text-xl font-semibold mt-6 mb-3">Koliko dugo čuvamo Vaše lične podatke</h3>
      <p>
        Vaše lične podatke čuvamo u skladu sa važećim propisima o zaštiti ličnih podataka. Vaše lične podatke čuvamo samo onoliko koliko je potrebno za postizanje svrhe u koju obrađujemo Vaše lične podatke.
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Zaštita Vaših ličnih podataka</h2>
      <p>
        Sprovodimo tehničke i organizacione sigurnosne mjere kako bi zaštitili Vaše lične podatke od ilegalnog ili neovlašćenog pristupa ili upotrebe, kao i od slučajnog gubitka ili uništavanja.
      </p>
      <ul class="list-disc pl-6 space-y-2">
        <li><strong>Povjerljivost:</strong> Vaše lične podatke zaštitićemo od nedopuštenog otkrivanja trećim stranama.</li>
        <li><strong>Cjelovitost:</strong> Vaše lične podatke zaštitićemo od promjena neovlašćenih trećih strana.</li>
        <li><strong>Dostupnost:</strong> Pobrinućemo se da Vašim ličnim podacima mogu pristupiti samo ovlašćene osobe kada je to potrebno.</li>
      </ul>

      <h2 class="text-2xl font-bold mt-10 mb-4">Politika o kolačićima</h2>

      <h3 class="text-xl font-semibold mt-6 mb-3">Šta su „kolačići"?</h3>
      <p>
        Kolačići su mali tekstualni fajlovi koji se čuvaju na vašem računaru ili mobilnom uređaju. Kolačići obezbjeđuju efikasnije funkcionisanje web sajtova i stranica.
      </p>

      <h3 class="text-xl font-semibold mt-6 mb-3">Koje „kolačiće" koristimo?</h3>
      <p>Kompanija RAKUNAT D.O.O. na svom web sajtu koristi tri tipa kolačića:</p>

      <h4 class="text-lg font-semibold mt-4 mb-2">1. Kolačići funkcionalnosti</h4>
      <p>
        Kolačići funkcionalnosti nam pomažu da unaprijedimo vaše korisničko iskustvo prilikom posjete našem sajtu.
      </p>

      <h4 class="text-lg font-semibold mt-4 mb-2">2. Kolačići analitike</h4>
      <p>
        Kolačići analitike nam omogućavaju da unaprijedimo sveukupno korisničko iskustvo na RAKUNAT D.O.O. sajtu prikupljanjem relevantnih analitičkih podataka.
      </p>

      <h4 class="text-lg font-semibold mt-4 mb-2">3. Kolačići marketinga i oglašavanja</h4>
      <p>
        Kolačići marketinga i oglašavanja pomažu kompaniji RAKUNAT D.O.O. i njenim partnerima da vam prikažu relevantne oglase.
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Pravne informacije</h2>
      <p>
        Odredbe ovih pravila dopunjavaju i ne poništavaju zakonodavne odredbe iz područja zaštite ličnih podataka. RAKUNAT D.O.O. može ova pravila promijeniti u bilo kojem trenutku.
      </p>`,
    },
    en: {
      title: "Privacy Policy",
      subtitle:
        "Your privacy is important to us. Here you can learn how we collect, use and protect your personal data.",
      copyright: "Copyright © by RAKUNAT D.O.O., All rights reserved.",
      content: `<p>
        RAKUNAT D.O.O. reserves the right to collect certain personal data when browsing some pages of this Site in order to fulfill your requests or needs. Any collection of such information on these pages will be carried out in accordance with the privacy rules contained on these web pages, as well as applicable personal data protection regulations.
      </p>
      <p>
        Some pages of this Site may store certain information packets known as "cookies" on your computer. Cookies give us the answer to how and when the page of this Site was visited and how many people visited. This technology does not collect information about your personal identity, instead the information is in aggregate form. The purpose of this technology and the information it collects is to help us improve our Site.
      </p>
      <p>
        RAKUNAT D.O.O. is not responsible for the content of information published by users via chat. RAKUNAT D.O.O. is not considered responsible nor obligated to monitor conversations on the chat and therefore bears no consequences for the content of any communication, regardless of whether it arises or not from copyright laws, defamation, privacy or other.
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">General Privacy and Data Protection Policy</h2>
      <p>
        RAKUNAT D.O.O. respects your privacy. Regardless of whether you are in contact with RAKUNAT D.O.O. about products and/or services as a customer, user, member of the public, etc. You have the right to protection of personal data: name, address, telephone number, e-mail address and other data such as IP address, geolocation data, etc.
      </p>
      <p>
        The General Privacy and Personal Data Protection Policy of RAKUNAT D.O.O. ("this policy") describes the procedure for collecting your personal data and the purpose for which they are collected, how your personal data is used, with whom your personal data is shared, how it is protected and what your options are in terms of personal data protection.
      </p>
      <p>
        This policy applies to the processing of your personal data within various services, tools, applications, websites, portals, (internet) promotions, marketing campaigns, sponsored platforms on social media, etc., which we provide or manage ourselves or a third party on our behalf.
      </p>
      <p>
        This policy applies to all your personal data collected by RAKUNAT D.O.O., Nikšić, Bosnia and Herzegovina, authorized sellers, complaint handlers, etc., collectively referred to in this policy as "Rakunat d.o.o.", "we", "us" and "our".
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Who is responsible for processing your personal data?</h2>
      <p>Organizations responsible for processing your personal data are:</p>
      <p class="font-semibold">RAKUNAT D.O.O., Nikšić, Bosnia and Herzegovina</p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Basic Principles</h2>
      <p>
        We value the trust you place in us by entrusting us with your personal data and we commit to always processing it in a fair, transparent and secure manner. The key principles that RAKUNAT D.O.O. respects when processing personal data are as follows:
      </p>
      <ul class="list-disc pl-6 space-y-2">
        <li><strong>Legality:</strong> We will collect personal data in a fair, lawful and transparent manner.</li>
        <li><strong>Data minimization:</strong> We will limit the collection of personal data to what is appropriate and necessary for the purpose for which they are collected.</li>
        <li><strong>Purpose limitation:</strong> We will collect personal data only for specific, explicit and legitimate purposes and will not process them in a way that is inconsistent with that purpose.</li>
        <li><strong>Accuracy:</strong> We will ensure the accuracy and currency of personal data.</li>
        <li><strong>Security and protection of personal data:</strong> We will implement technical and organizational measures to ensure appropriate levels of data protection.</li>
        <li><strong>Storage limitation:</strong> Your personal data will be stored in accordance with applicable personal data protection laws and only for as long as necessary to achieve the purpose for which they were collected.</li>
        <li><strong>Legality of direct marketing and cookies:</strong> Sending promotional materials and placing cookies will be done in accordance with applicable legislation.</li>
      </ul>

      <h2 class="text-2xl font-bold mt-10 mb-4">Processing of Your Personal Data</h2>
      <h3 class="text-xl font-semibold mt-6 mb-3">What data we collect and on what legal basis</h3>
      <p>
        You will always be clearly informed which personal data we collect. We will present this information to you with a separate privacy notice that will be included in certain services.
      </p>
      <p>In accordance with applicable personal data protection regulations, we may process your personal data if:</p>
      <ul class="list-disc pl-6 space-y-2">
        <li>you have given consent for specific processing purposes;</li>
        <li>processing of your personal data is necessary for the performance of a contract to which you are a party;</li>
        <li>such processing follows legitimate interests;</li>
        <li>it is necessary to fulfill our legal obligations.</li>
      </ul>

      <h3 class="text-xl font-semibold mt-6 mb-3">Ensuring the accuracy and currency of your personal data</h3>
      <p>
        It is important to us that your data is always accurate and up-to-date. Please notify us of any changes or errors in our records of your personal data by contacting us.
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Access to Your Personal Data</h2>
      <p>
        You have the right to access your personal data that we process and if your personal data is inaccurate or incomplete, you may request correction or deletion of personal data.
      </p>

      <h3 class="text-xl font-semibold mt-6 mb-3">How long we keep your personal data</h3>
      <p>
        We keep your personal data in accordance with applicable personal data protection regulations. We keep your personal data only for as long as necessary to achieve the purpose for which we process your personal data.
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Protection of Your Personal Data</h2>
      <p>
        We implement technical and organizational security measures to protect your personal data from illegal or unauthorized access or use, as well as from accidental loss or destruction.
      </p>
      <ul class="list-disc pl-6 space-y-2">
        <li><strong>Confidentiality:</strong> We will protect your personal data from unauthorized disclosure to third parties.</li>
        <li><strong>Integrity:</strong> We will protect your personal data from changes by unauthorized third parties.</li>
        <li><strong>Availability:</strong> We will ensure that your personal data can only be accessed by authorized persons when necessary.</li>
      </ul>

      <h2 class="text-2xl font-bold mt-10 mb-4">Cookie Policy</h2>

      <h3 class="text-xl font-semibold mt-6 mb-3">What are "cookies"?</h3>
      <p>
        Cookies are small text files that are stored on your computer or mobile device. Cookies ensure more efficient functioning of websites and pages.
      </p>

      <h3 class="text-xl font-semibold mt-6 mb-3">Which "cookies" do we use?</h3>
      <p>RAKUNAT D.O.O. uses three types of cookies on its website:</p>

      <h4 class="text-lg font-semibold mt-4 mb-2">1. Functionality cookies</h4>
      <p>
        Functionality cookies help us improve your user experience when visiting our site.
      </p>

      <h4 class="text-lg font-semibold mt-4 mb-2">2. Analytics cookies</h4>
      <p>
        Analytics cookies allow us to improve the overall user experience on the RAKUNAT D.O.O. site by collecting relevant analytical data.
      </p>

      <h4 class="text-lg font-semibold mt-4 mb-2">3. Marketing and advertising cookies</h4>
      <p>
        Marketing and advertising cookies help RAKUNAT D.O.O. and its partners show you relevant ads.
      </p>

      <h2 class="text-2xl font-bold mt-10 mb-4">Legal Information</h2>
      <p>
        The provisions of these rules supplement and do not supersede the legislative provisions in the field of personal data protection. RAKUNAT D.O.O. may change these rules at any time.
      </p>`,
    },
  };

  const t = translations[activeLang as keyof typeof translations] || translations.bs;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={seo.title} description={seo.description} basePath="/politika-privatnosti" />
      <Header />

      <main className="flex-1 container py-16">
        {/* Hero sekcija - naslov centralno, podnaslov lijevo */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t.title}</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl text-left">{t.subtitle}</p>
        </div>

        {/* Sadržaj */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-sm">
            <div
              className="prose prose-neutral dark:prose-invert max-w-none text-justify"
              dangerouslySetInnerHTML={{ __html: t.content }}
            />

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-center text-muted-foreground">{t.copyright}</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
