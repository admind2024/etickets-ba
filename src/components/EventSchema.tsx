import { Helmet } from "react-helmet-async";

interface EventSchemaProps {
  event: {
    name: string;
    date: string;
    venue?: string;
    city?: string;
    image?: string;
    description?: string;
    price?: number;
    currency?: string;
    slug?: string;
  };
  performer?: {
    name: string;
  };
}

const EventSchema = ({ event, performer }: EventSchemaProps) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.date,
    description: event.description,
    image: event.image,
    location: {
      "@type": "Place",
      name: event.venue || "TBA",
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city || "Bosnia and Herzegovina",
        addressCountry: "BA",
      },
    },
    ...(performer && {
      performer: {
        "@type": "MusicGroup",
        name: performer.name,
      },
    }),
    offers: {
      "@type": "Offer",
      price: event.price || 0,
      priceCurrency: event.currency || "EUR",
      availability: "https://schema.org/InStock",
      url: `https://etickets.ba/event/${event.slug || event.name.toLowerCase().replace(/\s+/g, "-")}`,
    },
    organizer: {
      "@type": "Organization",
      name: "etickets",
      url: "https://etickets.ba",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default EventSchema;
