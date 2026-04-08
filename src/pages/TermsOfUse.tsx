import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileText } from "lucide-react";
import SEO from "@/components/SEO";

const TermsOfService = () => {
  const { lang } = useParams<{ lang?: string }>();
  const currentLang = lang === "en" ? lang : "bs";

  const seoContent = {
    bs: {
      title: "Uslovi korišćenja | e-tickets.me",
      description: "Uslovi korišćenja e-tickets.me platforme za online kupovinu ulaznica. Pročitajte prava i obaveze korisnika.",
    },
    en: {
      title: "Terms of Use | e-tickets.me",
      description: "Terms of use for e-tickets.me online ticket purchasing platform. Read user rights and obligations.",
    },
  };

  const seo = seoContent[currentLang] || seoContent.bs;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title={seo.title} description={seo.description} basePath="/uslovi-koriscenja" />
      <Header />

      <main className="flex-1 container py-16">
        {/* Hero sekcija */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Uslovi korišćenja</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Molimo Vas da pažljivo pročitate ove uslove prije korišćenja naših usluga.
          </p>
        </div>

        {/* Sadržaj */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-sm">
            <div className="prose prose-neutral dark:prose-invert max-w-none text-justify">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8">
                <p className="text-amber-800 dark:text-amber-200 m-0">
                  <strong>Pažnja:</strong> Upotrebom ovog web sajta potvrđujete da ste pročitali, razumjeli i prihvatili
                  ove uslove korišćenja (u daljem tekstu "uslovi") i slažete se da ste obavezni da ih poštujete, kao i
                  sve druge primjenljive zakone i propise. Ukoliko ne prihvatate ove uslove, nemojte koristiti ovaj web
                  sajt.
                </p>
              </div>

              <p className="text-muted-foreground">
                RAKUNAT D.O.O. može izmijeniti ove Uslove u bilo kom trenutku izmjenama u ovom tekstu. Trebalo bi da
                posjetite ovu stranicu s vremena na vrijeme i provjerite ažurne Uslove, jer ste njima zakonski vezani.
                Pojedine odredbe ovih Uslova mogu biti nadjačane eksplicitnim zakonskim aktima ili saopštenjima
                istaknutim na drugim stranicama ovog sajta.
              </p>

              <h2 className="text-2xl font-bold mt-10 mb-4">1. Važna informacija</h2>
              <p>Rakunat d.o.o. Nikšić (u daljem tekstu: „Rakunat") nije organizator ponuđenih događaja.</p>
              <p>
                Događaj organizuje organizator događaja, koji takođe izdaje ulaznice (u daljem tekstu: "Organizator").
              </p>
              <p>
                Rakunat deluje isključivo kao distributer za prodaju ulaznica u ime organizatora, zbog čega ne snosi
                nikakvu odgovornost u vezi sa organizacijom i/ili održavanjem događaja, te nije odgovoran za povraćaj
                novca.
              </p>

              <h2 className="text-2xl font-bold mt-10 mb-4">2. Kupovina ulaznica</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3">2.1. Kupovina ulaznica na prodajnim mestima Rakunat-a</h3>
              <p>Pod prodajnim mestom Rakunat-a se podrazumevaju:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>internet prodavnica na veb-sajtu etickets.me (u daljem tekstu: "Internet prodavnica"); i</li>
                <li>prodajna mesta partnera.</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                2.2. Kupovina ulaznica na prodajnim mestima Rakunat-a i prodajnim mestima partnera
              </h3>
              <p>
                Ulaznice je moguće kupiti na prodajnim mestima Rakunat-a i njegovih partnera. Ulaznice za događaje se
                štampaju i po isplati cijene se izdaju kupcu.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                2.3. Kupovina ulaznica na Internet prodavnici etickets.me
              </h3>
              <p>
                Kupovina ulaznica na Internet prodavnici je obavezujuća i kupac ne može jednostrano raskinuti ugovor,
                tj. odustati od izvršene kupovine u smislu člana 74a Zakona o zaštiti potrošača ("Sl. list CG", br.
                2/2014, 6/2014 – ispr., 43/2015, 70/2017 i 67/2019).
              </p>
              <p>
                U skladu sa članom 61, stav 1 i članom 74j stav 1, ("Sl. list CG", br. 2/2014, 6/2014 – ispr., 43/2015,
                70/2017 i 67/2019), kupac prihvatanjem ovih Uslova korišćenja izričito izjavljuje da je obavješten od
                strane Rakunat-a da nema pravo na jednostrani raskid ugovora u skladu sa članom 74a pomenutog zakona, na
                šta kupac pristaje.
              </p>
              <p>
                Kupac prihvatanjem Uslova korišćenja daje saglasnost da mu se dostavljanje obavještanja, ugovora i
                pisane potvrde o zaključenom ugovoru na daljinu u skladu sa članom 66, 67 i 74 Zakona o zaštiti
                potrošača, dostavi na drugom trajnom mediju, odnosno elektronskoj pošti na email adresu koju je kupac
                ostavio prilikom plaćanja.
              </p>
              <p>
                Kada izvršite porudžbinu na internet prodavnici etickets.me, izjavljujete da imate više od 18
                godina i da imate poslovnu sposobnost za zaključenje ovog pravnog posla.
              </p>
              <p>Za kupovinu ulaznica preko internet prodavnice etickets.me pratite sledeće korake:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>korak 1 – biranje događaja i ulaznica prema cjenovnoj kategoriji;</li>
                <li>korak 2 – biranje načina isporuke i načina plaćanja;</li>
                <li>korak 3 – upisivanje ličnih podataka i prihvatanje opštih uslova;</li>
                <li>korak 4 – plaćanje;</li>
                <li>korak 5 – potvrda porudžbine.</li>
              </ul>

              <h2 className="text-2xl font-bold mt-10 mb-4">3. Načini isporuke</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3">3.1. E-TICKETS (Print@home)</h3>
              <p>
                Vaše PDF ulaznice će biti poslate na email koji ste naznačili prilikom kupovine. Takođe, PDF ulaznicu
                potrebno je odštampati na papiru A4 formata. Pažljivo čuvajte ulaznice nakon štampanja i odštampane
                ulaznice donesite na događaj.
              </p>
              <p>
                Svaka ulaznica sadrži jedinstveni bar kod sa šifrom koja se provjerava na ulazu, bilo da se skenira ili
                da se ručno pregledava. Ukoliko niste ponijeli šifru sa sobom, ulaz Vam neće biti dozvoljen. Ne
                kopirajte vašu ulaznicu jer će se na ulazu omogućiti prolaz onome koji je prvi došao. Čuvajte svoju
                šifru kao što biste čuvali i običnu kartu.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">3.2. M-TICKET (Mobilna ulaznica)</h3>
              <p>
                Vaše PDF ulaznice prilagođene za mobilni telefon će biti poslate na email koji ste naznačili prilikom
                kupovine. Pažljivo čuvajte ulaznice u svom telefonu i provjerite bateriju na svom telefonu prije dolaska
                na događaj.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">3.3. Dostava kurirskom službom (Bosna i Hercegovina)</h3>
              <p>
                Rok za isporuku ulaznica je do tri radna dana od momenta kada se Vaša uplata pojavi na računu Rakunat-a.
                Vaše ulaznice će biti poslate kurirskom službom po prijemu Vaše uplate.
              </p>
              <p>Trošak isporuke kurirskom službom nije uračunat u cijenu karte, već se posebno naplaćuje.</p>

              <h2 className="text-2xl font-bold mt-10 mb-4">4. Plaćanje ulaznica</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                4.1. Omogućeni načini plaćanja i opis procesa plaćanja
              </h3>
              <p>Ulaznice kupljene na Internet prodavnici plaćaju se isključivo platnom karticom.</p>
              <p>
                Plaćanje proizvoda na našoj internet prodavnici je moguće izvršiti platnim karticama – VISA, Maestro ili
                MasterCard koje podržavaju plaćanje preko Interneta. Plaćanje karticama je realizovano u saradnji sa
                Stripe-om, vodećom globalnom platformom za online plaćanja, i obavlja se na bezbjedan i sertifikovan
                način jednostavnim unosom podataka sa platne kartice.
              </p>
              <p>
                Nakon što se unesu podaci o kartici i potvrdi plaćanje, Stripe autorizuje transakciju i time je
                porudžbina odobrena. Iznos će biti rezervisan na vašoj kartici (računu) i neće Vam biti raspoloživ za
                drugu namjenu.
              </p>
              <p>Provjerite kod banke koja je karticu izdala da li Vaša kartica podržava plaćanje preko Interneta.</p>

              <h4 className="text-lg font-semibold mt-6 mb-3">Bezbjednost plaćanja – Stripe standardi</h4>
              <p>Stripe koristi najsavremenije sigurnosne tehnologije za zaštitu Vaših podataka:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>PCI DSS Level 1</strong> – Stripe je sertifikovan kao PCI Service Provider Level 1, što
                  predstavlja najviši nivo sertifikacije u industriji plaćanja.
                </li>
                <li>
                  <strong>TLS/SSL enkripcija</strong> – Svi podaci se prenose putem zaštićene HTTPS veze sa TLS 1.2+
                  enkripcijom.
                </li>
                <li>
                  <strong>Tokenizacija</strong> – Podaci o karticama se zamjenjuju jedinstvenim tokenima, tako da
                  osjetljivi podaci nikada ne dodiruju naše servere.
                </li>
                <li>
                  <strong>3D Secure 2</strong> – Dodatna autentifikacija za sigurnije online transakcije, u skladu sa
                  PSD2 regulativom.
                </li>
                <li>
                  <strong>Machine Learning detekcija prevara</strong> – Stripe Radar koristi vještačku inteligenciju za
                  prepoznavanje i sprečavanje sumnjivih transakcija u realnom vremenu.
                </li>
              </ul>
              <p>
                Niti jednog trenutka podaci o Vašoj platnoj kartici nisu dostupni našem sistemu – sva obrada se vrši
                direktno na Stripe infrastrukturi.
              </p>
              <p>
                Svaka ulaznica postaje važeća nakon cjelokupne uplate cijene ulaznica i troškova obrade prikazanih
                prilikom kupovine. PDV je uračunat u cijenu i nema skrivenih troškova.
              </p>
              <p>
                Troškovi obrade za kupovinu ulaznica na Internet prodavnici obračunavaju se na nivou porudžbine i iznose
                5% od cijene ulaznice + 20 centi za trošak za svako pojedinačno mjesto, koje naplaćuje softver za
                mapiranje sjedišta. Troškovi obrade se odnose na pokriće administrativnih, materijalnih i ostalih
                operativnih troškova Rakunat-a.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">4.2. Izjava o konverziji</h3>
              <p>
                Sva plaćanja će biti obavljena u eurima (€). Ukoliko se plaćanje obavlja platnim karticama inostranih
                Banaka izdavalaca, iznos transakcije će biti konvertovan u lokalnu valutu korisnika kartice, prema kursu
                kartičnih kuća Visa/Mastercard.
              </p>
              <p className="italic text-muted-foreground">
                Please note that all payments will be effected in Euro (EUR). If the payment is done using foreign
                issuers payment cards, total amount of transaction will be converted into bank settlement currency,
                according to the current exchange rate of Visa/Mastercard.
              </p>
              <p>
                Svaka ulaznica postaje važeća nakon cjelokupne uplate cijene ulaznica i troškova obrade prikazanih
                prilikom kupovine. PDV je uračunat u cijenu i nema skrivenih troškova.
              </p>
              <p>
                Troškovi obrade za kupovinu ulaznica na Internet prodavnici obračunavaju se na nivou porudžbine i iznose
                5% od cijene ulaznice + 20 centi za trošak koji naplaćuje softver za mapiranje sjedišta. Troškovi obrade
                se odnose na pokriće nužnih troškova obrade platnih transakcija putem platnih kartica, te
                administrativnih, materijalnih i ostalih operativnih troškova Rakunat-a.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">4.3. Pravna lica – plaćanje na osnovu predračuna</h3>
              <p>
              Za poručivanje i plaćanje ulaznica putem predračuna za pravno lice, potrebno je na e-mail adresu
                support@e-tickets.me poslati sledeće podatke: naziv firme, adresu, PIB i e-mail adresu na koju naša služba
                treba da pošalje predračun. Takođe je potrebno da se naglasi za koji događaj se poručuju ulaznice,
                količinu ulaznica kao i cjenovnu kategoriju ulaznica za koje je potreban predračun.
              </p>

              <h2 className="text-2xl font-bold mt-10 mb-4">5. Vraćanje i zamjena ulaznica – Reklamacije</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3">5.1. Pravo na vraćanje ulaznica</h3>
              <p>Pravo na vraćanje ulaznica i povrat novca kupac ulaznice ima samo u sledećim slučajevima:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>otkazivanje događaja;</li>
                <li>odlaganje događaja na rok duži od 120 dana od dana planiranog održavanja događaja;</li>
                <li>
                  odlaganje događaja zbog nastupanja više sile koja traje duže od 180 dana od dana planiranog održavanja
                  događaja.
                </li>
              </ul>
              <p>
                <strong>Viša sila</strong>, tokom koje miruju obaveze Organizatora, nastupa kada Organizator događaja
                nije u stanju da ispuni svoju obavezu održavanja događaja zbog rata, pobune, terorističkih akata,
                štrajkova, nesreća, požara, blokade, poplave, odluke ili akcije epidemiološke vlasti, prirodne
                katastrofe, teškog poremećaja u snabdevanju energijom ili bilo čega drugog, iz razloga koji je van
                njegove moći i kontrole.
              </p>
              <p>
                Ako je događaj otkazan ili odložen zbog navedenih okolnosti, Rakunat će o tome obavijestiti kupce što je
                prije moguće putem veb-sajta etickets.me ili drugih kanala komunikacije.
              </p>
              <p>
                U slučaju povraćaja sredstava kupcu koji je prethodno platio nekom od platnih kartica, djelimično ili u
                cjelosti, a bez obzira na razlog vraćanja, taj povraćaj se vrši isključivo preko iste VISA, Maestro ili
                MasterCard kartice koja je korištena za plaćanje. Ovo znači da će naša banka na naš zahtjev obaviti
                povraćaj sredstava na račun korisnika kartice.
              </p>
              <p>
                U slučaju povraćaja novca za kupovinu obavljenu na Internet prodavnici, kupcu će biti vraćen iznos
                cijene ulaznice za predmetni događaj. Kupcu neće biti izvršen povraćaj troškova obrade od 5% od cijene
                ulaznice + 20 centi za trošak koji naplaćuje softver za mapiranje sjedišta, budući da se usluga
                Rakunat-a smatra u cjelosti pruženom u trenutku kupovine ulaznice, o čemu je kupac obavješten i na šta
                pristaje.
              </p>
              <p>
                U slučaju otkazivanja ili odlaganja događaja ili drugih promjena programa u vezi sa događajem, ni u kom
                slučaju neće biti izvršen povraćaj novca za povezane troškove (npr. prevoz, hotelski smještaj, troškovi
                isporuke itd.).
              </p>
              <p>
                <strong>Reklamacija:</strong> Uvođenjem Zakona o fiskalizaciji u prometu proizvoda i usluga, ulaznica
                više nema vrijednost računa već se izdaje račun uz kupljenu ulaznicu i kojeg je potrebno sačuvati do
                dana održavanja događaja. Ukoliko se događaj odloži ili otkaže, nije moguće vratiti ulaznicu i ostvariti
                reklamaciju odnosno povrat sredstava bez predaje računa koji dokazuju kupovinu ulaznice. Email adresa za
                prijavu reklamacija je support@e-tickets.me.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                5.2. Obaveza vraćanja novca i isključenje odgovornosti Rakunat-a
              </h3>
              <p>
                <strong>5.2.1.</strong> Rakunat nije organizator ponuđenih događanja. Događaj organizuje, vodi i
                realizuje organizator, koji takođe izdaje ulaznice. Organizator je isključivo odgovoran za povraćaj
                novca kupcima u slučaju otkazivanja ili odlaganja događaja opisanih pod tačkom 5.1.
              </p>
              <p>
                <strong>5.2.2.</strong> RAKUNAT D.O.O. deluje isključivo kao distributer za prodaju ulaznica u ime
                organizatora, zbog čega ne snosi nikakvu odgovornost u vezi sa organizacijom i/ili održavanjem događaja,
                te nije odgovoran za povraćaj novca kupcima u slučajevima otkazivanja ili odlaganja događaja opisanih
                pod tačkom 5.1.
              </p>
              <p>
                <strong>5.2.3.</strong> Rakunat ima obavezu povraćaja novca kupcima ulaznica u ime Organizatora jedino u
                sledećim slučajevima:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  novac koji je naplatio u ime Organizatora nije prenio tom Organizatoru i uz jasan nalog u pisanoj
                  formi od strane Organizatora da u njegovo ime izvrši povraćaj novca kupcima; ili
                </li>
                <li>
                  Organizator je prenio sredstva Rakunat-u u svrhu vraćanja novca kupcima ulaznica sa jasnim nalogom da
                  izvrši povraćaj novca kupcima u ime Organizatora.
                </li>
              </ul>
              <p>
                U slučaju povraćaja novca za kupovinu obavljenu na Internet prodavnici, kupcu će biti vraćen iznos
                cijene ulaznice za predmetni događaj. Kupcu neće biti izvršen povraćaj troškova obrade od 5% od cijene
                ulaznice + 20 centi za trošak koji naplaćuje softver za mapiranje sjedišta, budući da se usluga
                Rakunat-a smatra u cjelosti pruženom u trenutku kupovine ulaznice, o čemu je kupac obavešten i na šta
                pristaje.
              </p>
              <p>
                <strong>5.2.4.</strong> U slučajevima kada Rakunat ima obavezu povraćaja novca kupcima ulaznica u ime
                Organizatora (treći stav ovog člana 5.2), Rakunat će izvršiti povraćaj novca na tekući račun kupca ili
                na prodajnom mestu gde su ulaznice kupljene, i to u roku od:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>90 dana od dana otkazivanja događaja,</li>
                <li>60 dana od dana planiranog održavanja događaja koji je odložen na rok duži od 120 dana, i</li>
                <li>
                  240 dana od dana planiranog održavanja događaja u slučaju nastupanja više sile u trajanju preko 180
                  dana usled koje Organizator nije u mogućnosti da održi događaj,
                </li>
              </ul>
              <p>
                a sve pod uslovom da je kupac podnio zahtjev za vraćanje novca. Pogledati:
                etickets.me/faq
              </p>

              <h2 className="text-2xl font-bold mt-10 mb-4">6. Prava korišćenja softvera i upotreba web sajta</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3">6.1. Softver</h3>
              <p>
                Sistemsko rješenje web sajta etickets.me je vlasništvo kompanije Rakunat koja je isključivi nosilac
                prava korišćenja softverskog rješenja (mape, ulaznice, sistem komunikacije…). Zabranjeno je svako
                korišćenje softverskog rješenja bez izričite prethodne saglasnosti vlasnika softvera i u skladu sa
                zakonom Bosne i Hercegovine, kao i važećim međunarodnim ugovorima. U slučaju kršenja ove odredbe, Rakunat može da
                traži sudsku zaštitu.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">6.2. Upotreba web sajta</h3>
              <p>
                Sav materijal na ovom web sajtu (u daljem tekstu "Sajt") je zaštićen autorskim pravima i svaka
                neovlašćena upotreba može predstavljati kršenje Zakona o autorskom i srodnim pravima, Zakona o žigovima
                ili drugih zakona iz oblasti intelektualne svojine. Osim ukoliko je drugačije naznačeno na drugom mestu
                na ovom sajtu, sav sadržaj možete pregledati, kopirati, štampati ili preuzimati isključivo za ličnu,
                nekomercijalnu upotrebu i u informativne svrhe, pod uslovom da sve naznake o autorskim pravima ili
                drugim vlasničkim informacijama koji su sadržani u originalnom dokumentu zadržite u svim kopijama. Ne
                možete mjenjati sadržaj ovog sajta ni na koji način, niti ga reprodukovati ili javno prikazivati,
                izvoditi, distribuirati ili na drugi način koristiti u javne ili komercijalne svrhe. Ne uzimajući u
                obzir prethodno navedeno, bilo koji softver ili drugi materijal dostupan za preuzimanje ili korišćenje
                preko ovog sajta koji posjeduje sopstvene uslove korišćenja ili licenciranja nalazi se pod zaštitom tih
                uslova. Ukoliko prekršite bilo koji od ovih Uslova, vaša dozvola za upotrebu sajta će biti povučena i
                bićete obavezni da odmah uništite sve sadržaje koje ste preuzeli ili odštampali.
              </p>

              <h2 className="text-2xl font-bold mt-10 mb-4">7. Fiskalni račun</h2>
              <p>
                Kupac je saglasan da elektronski fiskalni račun dobije u zasebnom e-mailu na adresu koja je unijeta
                prilikom kupovine ulaznica. Na fiskalnom računu iskazan je QR za verifikaciju, kojem se može pristupiti
                preko svih uređaja koji imaju pristup internetu.
              </p>

              <h2 className="text-2xl font-bold mt-10 mb-4">8. Privatnost</h2>
              <p>
                RAKUNAT D.O.O. zadržava pravo da prikuplja određene lične podatke prilikom pretrage nekih internet
                stranica ovog Sajta da bi ispunio vaše zahtjeve ili potrebe. Svako prikupljanje takvih informacija na
                ovim stranicama biće sprovedeno u skladu sa pravilima o privatnosti sadržanom na ovim internet
                stranicama, kao i važećim propisima o zaštiti podataka o ličnosti.
              </p>
              <p>
                Neke stranice ovog Sajta bi mogle čuvati određene pakete informacija poznate kao "cookies" (kolačići) na
                vašem računaru. Kolačići nam daju odgovor na pitanje kako i kada je stranica ovog Sajta posjećena i
                koliko ljudi je posjetilo. Ova tehnologija ne skuplja informacije o vašem ličnom identitetu, umjesto
                toga, informacije se nalaze u zbirnoj formi. Svrha ove tehnologije i informacija koje ona prikuplja je
                da nam pomogne da unaprijedimo svoj Sajt.
              </p>
              <p>
                RAKUNAT D.O.O. nije odgovoran za sadržaj informacija objavljenih od strane korisnika putem chat-a.
                RAKUNAT D.O.O. se ne smatra odgovornim niti je u obavezi da prati razgovore na chatu i samim tim ne
                snosi nikakve posledice za sadržaj bilo kog saopštenja, bez obzira da li proizilazi ili ne iz zakona o
                autorskim pravima, kleveti, privatnosti ili drugog.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.1. Linkovi na druge sajtove</h3>
              <p>
                Linkovi sadržani na Sajtu koji vode na nezavisne sajtove su prikazani isključivo zbog pogodnosti za vas.
                RAKUNAT D.O.O. nije pregledao sadržaj ovih sajtova, ne kontroliše ih i nije odgovoran za bilo koji od
                ovih sajtova ili njihove sadržaje. Stoga, RAKUNAT D.O.O. nije njihov predstavnik, ne pruža nikakve
                garancije i ne prihvata obaveze u vezi sa ovim sajtovima ili bilo kojim informacijama, softverom ili
                drugim proizvodima koji se tamo mogu naći, ili sa rezultatima koji su posledica njihove upotrebe.
                Ukoliko odlučite da pristupite nekom od sajtova na koje vode linkovi sa našeg Sajta, činite to na
                sopstvenu odgovornost.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.2. Ograničenje garancija</h3>
              <p>
                Informacije, proizvodi, materijali i/ili usluge ("sadržaj") prikazan na ovom sajtu je prikazan "kao
                takav" bez ikakvih garancija bilo koje vrste. RAKUNAT D.O.O. se eksplicitno ograničava do maksimalnog
                stepena određenog zakonom, od bilo kakve direktne, indirektne statutarne ili bilo koje druge garancije
                ili zastupništva, uključujući garancije tržišne isplativosti, pogodnosti za određenu svrhu ili
                poštovanja intelektualnih ili svojinskih prava. Sadržaj čine isključivo informacije opšte prirode, koje
                nisu namjenjene za rješavanje specifičnih situacija ili za neku konkretnu osobu ili entitet, i koje ne
                predstavljaju profesionalni savjet.
              </p>
              <p>
                U maksimalnom stepenu koji zakon dozvoljava, RAKUNAT D.O.O. ne daje garancije za tačnost, primenjivost,
                pouzdanost i kompletnost sadržaja na ovom sajtu, kao ni garanciju neprekidnog rada, pravovremenosti,
                bezbjednosti ili odsustva grešaka. RAKUNAT D.O.O. može promijeniti sadržaj ovog sajta ili proizvode i
                cijene navedene na sajtu u bilo koje vrijeme i bez prethodnog upozorenja. Sadržaj na ovom sajtu može
                biti zastareo, a RAKUNAT D.O.O. se ne obavezuje da ga ažurira. Sadržaj objavljen na ovom sajtu može se
                odnositi na proizvode, programe ili usluge koji nisu dostupni u vašoj zemlji. Konsultujte se sa RAKUNAT
                D.O.O. lokalnom kancelarijom u vezi proizvoda, programa ili usluga koje su vam na raspolaganju.
              </p>

              <h4 className="text-lg font-semibold mt-6 mb-3">Ograničenje odgovornosti</h4>
              <p>
                U maksimalnom stepenu dozvoljenom zakonom, RAKUNAT D.O.O., njegovi dobavljači ili treća lica pomenuta na
                ovom sajtu ni u kom slučaju neće biti odgovorni za bilo kakvu štetu (uključujući, ali ne i isključivo,
                direktnu, indirektnu, slučajnu, posledičnu, posebnu štetu, ili takvu koja nastaje usled gubitka profita,
                gubitka podataka ili prekida poslovnog procesa) koja nastaje kao posledica upotrebe, odlaganja ili
                nemogućnosti upotrebe, ili rezultata upotrebe ovog sajta, sajtova na koje vode linkovi sa ovog sajta ili
                sadržaja objavljenog ovdje ili na drugim pomenutim sajtovima, bez obzira da li je zasnovana na
                garanciji, ugovoru ili drugom pravnom sredstvu ili da li je klijent bio obaviješten o mogućnosti takve
                štete. Ukoliko vaša upotreba materijala, informacija ili usluga sa ovog sajta rezultira potrebom za
                servisiranjem ili popravkom opreme ili podataka, Vi ste odgovorni za nastale troškove.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.3. Registrovani zaštitni znaci</h3>
              <p>
                Svi nazivi, logotipi, žigovi, zaštitni znaci ili oznake usluga koji se pojavljuju na ovom Sajtu su
                registrovani zaštitni znaci odgovarajućih kompanija u okviru RAKUNAT D.O.O. ili drugih vlasnika. Ne
                možete koristiti nazive, logotipe, žigove, zaštitne znakove ili oznake usluga bez prethodne pismene
                saglasnosti njihovog punopravnog vlasnika.
              </p>
              <p>
                Sve cijene na ovom sajtu iskazane su u eurima. PDV je uračunat u cijenu. RAKUNAT D.O.O. maksimalno
                koristi sve svoje resurse da Vam sve ulaznice na ovom sajtu budu prikazani sa ispravnim nazivima
                specifikacija, numeracijama sjedišta, fotografijama i cijenama. Ipak, ne možemo garantovati da su sve
                navedene informacije i fotografije artikala na ovom sajtu u potpunosti ispravne. Podatke o broju
                sjedišta, sektorima, numeracijama dobijamo od Organizatora Manifestacija i preduzeća u čijem su
                vlasništvu objekti u kojima se održava Manifestacija.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                8.4. Opšta politika zaštite privatnosti i podataka RAKUNAT D.O.O.
              </h3>
              <p>
                RAKUNAT D.O.O. poštuje Vašu privatnost. Bez obzira na to da li ste sa RAKUNAT D.O.O.-om u kontaktu oko
                proizvoda i/ili usluga kao kupac, korisnik, predstavnik javnosti itd. Imate pravo na zaštitu ličnih
                podataka: imena, adrese, telefonskog broja, adrese e-pošte i drugih podataka kao što su, IP adresa,
                geolokacijski podaci, itd.
              </p>
              <p>
                U Opštoj politici zaštite privatnosti i ličnih podataka RAKUNAT D.O.O. („ova politika"), opisuje se
                postupak prikupljanja Vaših ličnih podataka i svrha u koju se oni prikupljaju, način korišćenja Vaših
                ličnih podataka, sa kim se Vaši lični podaci dijele, kako se štite i koje su Vaše mogućnosti u opsegu
                zaštite ličnih podataka.
              </p>
              <p>
                Ova politika se odnosi na obradu Vaših ličnih podataka u okviru različitih usluga, alata, aplikacija,
                webmjesta, portala, (internet) promocija, marketinških akcija, sponzorisanih platformi na društvenim
                medijima itd., koje pružamo ili kojima upravljamo mi ili treća strana u naše ime.
              </p>
              <p>
                Ova politika sadrži opšta pravila i objašnjenja. Za određene usluge, alate, aplikacije, web-mjesta,
                portale, (internet) promocije, marketinške akcije, sponzorisane platforme na društvenim medijima, itd.,
                koje nudi RAKUNAT D.O.O. ili njima upravlja treća strana u ime RAKUNAT D.O.O.-a, ova politika može da se
                dopunjava posebnim, odvojenim obavještenjima o zaštiti privatnosti. O tim posebnim obavještenjima o
                zaštiti privatnosti obavijestićemo Vas na primjeren način svaki put kada prikupljamo Vaše lične podatke
                u gore navedenim aktivnostima.
              </p>
              <p>
                Ova politika se primjenjuje na sve Vaše lične podatke, koje prikuplja RAKUNAT D.O.O., Nikšić, Bosna i Hercegovina,
                ovlašćeni prodavci, rešavaoci reklamacija i sl., zajedno navedeni u ovoj politici kao „Rakunat d.o.o.",
                „mi", „nas" i „naš".
              </p>

              <h4 className="text-lg font-semibold mt-6 mb-3">Ko je odgovoran za obradu Vaših ličnih podataka?</h4>
              <p>Organizacije odgovorne za obradu Vaših ličnih podataka su:</p>
              <p className="font-semibold">RAKUNAT D.O.O., Nikšić, Bosna i Hercegovina</p>

              <h4 className="text-lg font-semibold mt-6 mb-3">Osnovna načela</h4>
              <p>
                Cijenimo povjerenje koje nam ukazujete tako što nam povjeravate Vaše lične podatke i obavezujemo se da
                ćemo ih uvijek obrađivati na pošten, transparentan i siguran način. Ključna načela koja RAKUNAT D.O.O.
                poštuje pri obradi ličnih podataka su sledeća:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Zakonitost:</strong> Lične podatke prikupljaćemo na pošten, zakonit i transparentan način.
                </li>
                <li>
                  <strong>Najmanji opseg ličnih podataka (minimizacija):</strong> Prikupljanje ličnih podataka
                  ograničićemo na one koji su prikladni i potrebni za svrhu u koju su prikupljeni.
                </li>
                <li>
                  <strong>Ograničenje svrhe:</strong> Lične podatke prikupljaćemo samo u određene, eksplicitne i
                  legitimne svrhe i nećemo ih obrađivati na način koji nije u skladu sa tom svrhom.
                </li>
                <li>
                  <strong>Tačnost:</strong> Osiguraćemo tačnost i ažurnost ličnih podataka.
                </li>
                <li>
                  <strong>Sigurnost i zaštita ličnih podataka:</strong> Sprovodićemo tehničke i organizacione mjere za
                  osiguranje odgovarajućih nivoa zaštite podataka uzimajući u obzir, između ostalog, prirodu Vaših
                  ličnih podataka koje treba zaštiti. Te mjere predviđaju sprečavanje bilo koje vrste neovlašćenog
                  otkrivanja ili pristupa, slučajnog ili namjernog uništavanja ili slučajnog gubitka ili izmjene i
                  drugih nezakonitih oblika obrade.
                </li>
                <li>
                  <strong>Ograničenje čuvanja:</strong> Vaši lični podaci čuvaće se u skladu sa važećim zakonskim
                  propisima o zaštiti ličnih podataka i samo onoliko dugo koliko je potrebno za postizanje svrhe u koju
                  su prikupljeni, osim ukoliko ranije ne podnesete zahtjev za brisanje ili opozovete saglasnost za
                  obradu. Davanje podataka o ličnosti u ovom slučaju nije zakonska niti ugovorna obaveza niti je
                  neophodan uslov za zaključenje ugovora.
                </li>
                <li>
                  <strong>Zakonitost neposrednog marketinga i kolačića:</strong> Slanje promotivnih materijala i
                  postavljanje kolačića odvijaće se u skladu sa važećim zakonodavstvom.
                </li>
              </ul>

              <h4 className="text-lg font-semibold mt-6 mb-3">
                Obrada Vaših ličnih podataka: koje podatke prikupljamo i po kojoj pravnoj osnovi
              </h4>
              <p>
                Uvijek ćete biti jasno obavješteni koje lične podatke prikupljamo. Te informacije ćemo vam predočiti uz
                odvojeno obavještenje o zaštiti privatnosti koje će biti uključeno u određene usluge.
              </p>
              <p>
                U skladu sa važećim propisima o zaštiti ličnih podataka možemo da obrađujemo Vaše lične podatke ako:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  ste dali saglasnost za određene svrhe obrade (kao što su navedene u obavještenju o zaštiti privatnosti
                  koje se odnosi na određenu obradu). U svakom trenutku imate pravo da povučete svoju saglasnost bez
                  navođenja razloga; ili
                </li>
                <li>
                  je obrada Vaših ličnih podataka potrebna za ispunjenje uslova ugovora čija ste ugovorna stranka; ili
                </li>
                <li>
                  takvom obradom slijedimo legitimne interese, npr. RAKUNAT D.O.O. može određene lične podatke da
                  obrađuje u svrhu sprečavanja zloupotrebe, odnosno prevare, pri utvrđivanju prava na temelju garancije,
                  kako bi u određenim primjerima provjerila Vaše zadovoljstvo njenim proizvodima i uslugama. O
                  legitimnim interesima obavijestićemo Vas u obavještenju o zaštiti privatnosti povezanoj sa tom
                  posebnom obradom; ili
                </li>
                <li>
                  je to potrebno za ispunjavanje naših zakonskih obaveza, npr. prilikom kupovine (plaćanje, mjesto i
                  datum preuzimanja, itd.), reklamacije, vraćanje proizvoda kupljenih na daljinu, servisiranja,
                  ostvarivanja drugih prava potrošača po osnovu nesaobraznosti ili garancije.
                </li>
              </ul>

              <h4 className="text-lg font-semibold mt-6 mb-3">
                U koje svrhe obrađujemo Vaše lične podatke i oblikovanje profila
              </h4>
              <p>
                Lične podatke obrađujemo samo u određene, izričito potvrđene i legitimne svrhe i nećemo ih obrađivati na
                način koji nije u skladu sa tim svrhama.
              </p>

              <h4 className="text-lg font-semibold mt-6 mb-3">Briga o tačnosti i ažurnosti Vaših ličnih podataka</h4>
              <p>
                Važno nam je da su Vaši podaci uvek tačni i ažurirani. Obavijestite nas o svim promjenama ili greškama u
                našim zapisima Vaših ličnih podataka tako što ćete nas kontaktirati. Odredićemo razumne mjere da se svi
                netačni ili neažurirani lični podaci izbrišu ili isprave.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.5. Pristup svojim ličnim podacima</h3>
              <p>
                Imate pravo pristupa svojim ličnim podacima koje obrađujemo i ako su Vaši lični podaci netačni ili
                nepotpuni možete da zahtijevate ispravku ili brisanje ličnih podataka.
              </p>

              <h4 className="text-lg font-semibold mt-6 mb-3">Koliko dugo čuvamo Vaše lične podatke</h4>
              <p>Vaše lične podatke čuvamo u skladu sa važećim propisima o zaštiti ličnih podataka.</p>
              <p>
                Vaše lične podatke čuvamo samo onoliko koliko je potrebno za postizanje svrhe u koju obrađujemo Vaše
                lične podatke, razdoblju koje je određeno zakonom ili u razdoblju koje je potrebno za ispunjavanje
                uslova ugovora, uključujući zahtjeve za garancijom i moguće zahtjeve.
              </p>
              <p>
                Lične podatke koje obrađujemo na osnovu Vašeg ličnog dopuštenja čuvamo trajno, do Vašeg opoziva, osim
                ako je ranije već postignuta svrha u koju su lični podaci prikupljeni.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.6. Zaštita Vaših ličnih podataka</h3>
              <p>
                Sprovodimo tehničke i organizacione sigurnosne mjere kako bi zaštitili Vaše lične podatke od ilegalnog
                ili neovlašćenog pristupa ili upotrebe, kao i od slučajnog gubitka ili uništavanja. Navedene mjere se
                sprovode uzimajući u obzir našu IT infrastrukturu, potencijalni uticaj na Vašu privatnost i troškove
                izvođenja i u skladu sa trenutnim standardima i praksom u području zaštite podataka.
              </p>
              <p>
                Obradu Vaših ličnih podataka povjerićemo samo onim ovlašćenim osobama (trećoj strani) koje poštuju
                navedene tehničke i organizacione mjere za zaštitu ličnih podataka.
              </p>
              <p>
                Osiguranje zaštite podataka znači brigu o povjerljivosti, cjelovitosti i dostupnosti Vaših ličnih
                podataka.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Povjerljivost:</strong> Vaše lične podatke zaštitićemo od nedopuštenog otkrivanja trećim
                  stranama.
                </li>
                <li>
                  <strong>Cjelovitost:</strong> Vaše lične podatke zaštitićemo od promjena neovlašćenih trećih strana.
                </li>
                <li>
                  <strong>Dostupnost:</strong> Pobrinućemo se da Vašim ličnim podacima mogu pristupiti samo ovlašćene
                  osobe kada je to potrebno.
                </li>
              </ul>
              <p>
                Naši sigurnosni postupci uključuju: zaštitu pristupa, sisteme za sigurnosno kopiranje, nadzor, revizije
                i održavanje, upravljanje sigurnosnim incidentima i kontinuirano poslovanje, itd.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.7. Prosleđivanje ličnih podataka</h3>
              <p>
                U pogledu svrhe prikupljanja Vaših ličnih podataka možemo ih proslijediti, otkriti ili omogućiti pristup
                kategorijama korisnika navedenima u nastavku, a koji te podatke obrađuju u skladu sa navedenom svrhom.
                Od njih zahtjevamo da uvijek budu u skladu sa važećim pravnim propisima, pravilima zaštite ličnih
                podataka i da posvećuju izuzetnu pažnju povjerljivosti Vaših ličnih podataka.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.8. Upotreba društvenih medija</h3>
              <p>
                Ako se u RAKUNAT D.O.O. alatima (internet stranica, portal …) prijavite iz društvenih medija (na primer
                pomoću Vašeg Facebook naloga), RAKUNAT D.O.O. će zabilježiti Vaše lične podatke dostupne na tim
                društvenim medijima, i Vaša upotreba tih medija znači da ste izričito saglasni sa proslijeđivanjem
                svojih ličnih podataka koje je RAKUNAT D.O.O. zabilježio pomoću svog alata. Ti društveni mediji imaju
                sopstvene uslove korišćenja kojih se morate pridržavati tokom njihove upotrebe.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">8.9. Pravne informacije</h3>
              <p>
                Odredbe ovih pravila dopunjavaju i ne poništavaju zakonodavne odredbe iz područja zaštite ličnih
                podataka. U slučaju neusklađenosti odredbi ovih pravila i zakonodavnih odredbi iz područja zaštite
                ličnih podataka vrijede zakonodavne odredbe.
              </p>
              <p>
                RAKUNAT D.O.O. može ova pravila promijeniti u bilo kojem trenutku. Ova pravila možete provjeravati na
                našoj internet stranici i na taj način saznati više o promjenama.
              </p>

              <h2 className="text-2xl font-bold mt-10 mb-4">9. Politika o kolačićima</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3">Šta su „kolačići"?</h3>
              <p>
                Kolačići su mali tekstualni fajlovi koji se čuvaju na vašem računaru ili mobilnom uređaju. Kolačići
                obezbjeđuju efikasnije funkcionisanje web sajtova i stranica. Kolačići omogućavaju našem sajtu da vas
                prepozna i zapamti važne informacije kako bi vam korišćenje sajta bilo udobnije.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">
                Kako treća lica koriste „kolačiće" na RAKUNAT D.O.O. sajtu?
              </h3>
              <p>
                Kako bi obezbijedili određene usluge na svom web sajtu, kompanija RAKUNAT D.O.O. može sarađivati sa
                trećim licima. Drugi oglašivači i ostale organizacije mogu koristiti svoje „kolačiće" da bi prikupili
                informacije o vašim aktivnostima na našem web sajtu. Ove informacije mogu koristiti trećem licu da
                prikaže oglase za koje vjeruje da će vama biti od značaja na osnovu sadržaja koji ste gledali. Predmetni
                oglašivači mogu, takođe, koristiti ove informacije u cilju utvrđivanja stepena efektivnosti svojih
                oglasa. „Kolačiće" trećeg lica mi ne kontrolišemo i da biste ih onemogućili ili izbrisali, molimo vas da
                više informacija i instrukcije za onemogućavanje potražite na web stranici relevantnog trećeg lica.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">Koje „kolačiće" koristimo?</h3>
              <p>Kompanija RAKUNAT D.O.O. na svom web sajtu koristi tri tipa kolačića:</p>

              <h4 className="text-lg font-semibold mt-4 mb-2">1. Kolačići funkcionalnosti</h4>
              <p>
                Kolačići funkcionalnosti nam pomažu da unaprijedimo vaše korisničko iskustvo prilikom posjete našem
                sajtu. Primera radi, kolačići funkcionalnosti omogućavaju uporedni prikaz tehničkih karakteristika dva
                ili više proizvoda i omogućavaju sajtu da upamti korisnikove preferencije.
              </p>

              <h4 className="text-lg font-semibold mt-4 mb-2">2. Kolačići analitike</h4>
              <p>
                Kolačići analitike nam omogućavaju da unaprijedimo sveukupno korisničko iskustvo na RAKUNAT D.O.O. sajtu
                prikupljanjem relevantnih analitičkih podataka. Takođe, kolačići analitike nam pomažu da evidentiramo i
                zabilježimo poteškoće koje ste imali pri posjeti RAKUNAT D.O.O. sajtu i pokazuju nam performanse i
                efektnost našeg digitalnog oglašavanja.
              </p>

              <h4 className="text-lg font-semibold mt-4 mb-2">3. Kolačići marketinga i oglašavanja</h4>
              <p>
                Kolačići marketinga i oglašavanja pomažu kompaniji RAKUNAT D.O.O. i njenim partnerima da vam prikažu
                relevantne oglase, koji su u skladu sa vašim interesima i koji vam mogu biti značajniji od drugih,
                nepersonalizovanih digitalnih oglasa. Takođe, možemo koristiti kolačiće iz grupe marketinga i
                oglašavanja da bismo ograničili broj prikazivanja istog oglasa na RAKUNAT D.O.O. sajtu, kao i da
                ocijenimo stepen efektivnosti naših digitalnih marketinških kampanja. Ovaj tip kolačića nam omogućava
                prikazivanje personalizovanih reklama na sajtovima naših partnera, na društvenim mrežama, kao i na
                sajtovima za pretraživanje sadržaja interneta, kao što je www.google.com.
              </p>

              <h2 className="text-2xl font-bold mt-10 mb-4">10. Pravne informacije</h2>
              <p>
                Odredbe ovih pravila dopunjavaju i ne poništavaju zakonodavne odredbe iz područja zaštite ličnih
                podataka. U slučaju neusklađenosti odredbi ovih pravila i zakonodavnih odredbi iz područja zaštite
                ličnih podataka vrijede zakonodavne odredbe.
              </p>
              <p>
                RAKUNAT D.O.O. može ova pravila promijeniti u bilo kojem trenutku. Ova pravila možete provjeravati na
                našem web sajtu i na taj način saznati više o promjenama.
              </p>

              <div className="mt-12 pt-8 border-t border-border">
                <p className="text-center text-muted-foreground">Copyright © by RAKUNAT D.O.O., Sva prava zadržana.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
