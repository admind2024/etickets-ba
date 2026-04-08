export interface Event {
  id: string;
  slug: string;
  title: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  priceFrom: number;
  currency: string;
  image: string;
  description: string;
  organizer: string;
  category: string;
  featured?: boolean;
  ticketCategories: {
    name: string;
    price: number;
    available: boolean;
  }[];
}

export const events: Event[] = [
  {
    id: "1",
    slug: "zdravko-colic-arena-tour-2025",
    title: "Zdravko Čolić - Arena Tour 2025",
    artist: "Zdravko Čolić",
    date: "15. mart 2025",
    time: "20:00",
    venue: "Morača Sports Center",
    city: "Podgorica",
    priceFrom: 35,
    currency: "€",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
    description: "Legendarni Zdravko Čolić dolazi u Podgoricu u sklopu velike Arena turneje 2025. Očekuje nas nezaboravna noć ispunjena najvećim hitovima jednog od najvoljenijih pjevača na Balkanu. Ne propustite priliku da uživate u najvećim hitovima poput 'Ti si mi u krvi', 'Zvao sam je Emili', 'Kao moja mati' i mnogim drugim.",
    organizer: "Arena Entertainment",
    category: "Koncert",
    featured: true,
    ticketCategories: [
      { name: "VIP Zona", price: 85, available: true },
      { name: "Parter", price: 55, available: true },
      { name: "Tribina", price: 35, available: true },
    ],
  },
  {
    id: "2",
    slug: "bijelo-dugme-reunion",
    title: "Bijelo Dugme - Reunion",
    artist: "Bijelo Dugme",
    date: "20. jul 2025",
    time: "21:00",
    venue: "Jaz Amphitheater",
    city: "Budva",
    priceFrom: 45,
    currency: "€",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    description: "Povijesni reunion koncert legendarnog Bijelog dugmeta na obali Jadranskog mora. Goran Bregović i društvo vraćaju se na scenu sa svim najvećim hitovima koji su obilježili generacije. Očekujte spektakularnu produkciju i nezaboravnu atmosferu pod zvjezdama.",
    organizer: "Montenegro Events",
    category: "Koncert",
    ticketCategories: [
      { name: "Golden Circle", price: 120, available: true },
      { name: "VIP", price: 75, available: true },
      { name: "Regular", price: 45, available: true },
    ],
  },
  {
    id: "3",
    slug: "sea-dance-festival-2025",
    title: "Sea Dance Festival 2025",
    artist: "Various Artists",
    date: "15-17. jul 2025",
    time: "18:00",
    venue: "Jaz Beach",
    city: "Budva",
    priceFrom: 55,
    currency: "€",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
    description: "Najbolji muzički festival na Jadranu vraća se sa još jačim lineup-om! Tri dana i noći nevjerovatne muzike, plesa i zabave na prekrasnoj plaži Jaz. World-class DJ-evi, live nastupi i nezaboravna atmosfera čekaju vas na Sea Dance festivalu 2025.",
    organizer: "Exit Foundation",
    category: "Festival",
    ticketCategories: [
      { name: "3-Day VIP Pass", price: 180, available: true },
      { name: "3-Day Regular Pass", price: 85, available: true },
      { name: "1-Day Ticket", price: 55, available: true },
    ],
  },
  {
    id: "4",
    slug: "lepa-brena-koncert",
    title: "Lepa Brena - Koncert",
    artist: "Lepa Brena",
    date: "10. avg 2025",
    time: "21:00",
    venue: "Dvorana Sportova",
    city: "Bar",
    priceFrom: 30,
    currency: "€",
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80",
    description: "Kraljica folk muzike Lepa Brena nastupa u Baru! Spektakularni koncert pune produkcije sa svim najvećim hitovima. Pjevajte zajedno 'Bato, Bato', 'Mile voli disko', 'Jugoslovenka' i druge pjesme koje su postale dio naše muzičke baštine.",
    organizer: "Grand Production",
    category: "Koncert",
    ticketCategories: [
      { name: "VIP", price: 65, available: true },
      { name: "Premium", price: 45, available: true },
      { name: "Regular", price: 30, available: true },
    ],
  },
  {
    id: "5",
    slug: "oliver-dragojevic-tribute",
    title: "Oliver Dragojević Tribute",
    artist: "Various Artists",
    date: "5. avg 2025",
    time: "20:30",
    venue: "Trg od Oružja",
    city: "Kotor",
    priceFrom: 25,
    currency: "€",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
    description: "Emotivni tribute koncert posvećen legendarnom Oliveru Dragojeviću u srcu starog Kotora. Poznati izvođači iz regiona izvode najveće hitove nezaboravnog Olivera. Večer mediteranskih nota, nostalgije i predivne muzike.",
    organizer: "Kotor Art",
    category: "Koncert",
    ticketCategories: [
      { name: "VIP sedeća mjesta", price: 55, available: true },
      { name: "Stajanje zona A", price: 35, available: true },
      { name: "Stajanje zona B", price: 25, available: true },
    ],
  },
  {
    id: "6",
    slug: "stand-up-vece",
    title: "Stand-up Veče",
    artist: "Regionalne Stand-up Zvijezde",
    date: "28. feb 2025",
    time: "20:00",
    venue: "KIC Budo Tomović",
    city: "Podgorica",
    priceFrom: 12,
    currency: "€",
    image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80",
    description: "Veče smijeha sa najboljim stand-up komičarima iz regiona! Pripremite se za dva sata vrhunske komedije, oštroumnog humora i nezaboravne zabave. Idealna prilika za opuštanje i smijeh do suza.",
    organizer: "Comedy Montenegro",
    category: "Komedija",
    ticketCategories: [
      { name: "Premium", price: 20, available: true },
      { name: "Regular", price: 12, available: true },
    ],
  },
];

export const getEventBySlug = (slug: string): Event | undefined => {
  return events.find((event) => event.slug === slug);
};

export const getFeaturedEvent = (): Event => {
  return events.find((event) => event.featured) || events[0];
};
