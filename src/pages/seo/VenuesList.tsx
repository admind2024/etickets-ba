import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Building2, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";
import { useVenues } from "@/hooks/useVenues";

const VenuesList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: venues = [], isLoading } = useVenues();

  const filteredVenues = useMemo(() => {
    if (!searchQuery.trim()) return venues;
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [venues, searchQuery]);

  // Group by city
  const groupedVenues = useMemo(() => {
    const groups: Record<string, typeof venues> = {};
    filteredVenues.forEach((venue) => {
      if (!groups[venue.city]) groups[venue.city] = [];
      groups[venue.city].push(venue);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredVenues]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Lokacije - Koncertne dvorane i objekti | etickets"
        description="Pregledajte sve lokacije, dvorane i objekte na kojima se održavaju koncerti i događaji. Ulaznice za sve gradove u Crnoj Gori i regionu."
        type="website"
        basePath="/lokacije"
      />

      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-12 md:py-16">
          <div className="container">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Lokacije</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
              Pronađite dvorane i objekte u vašem gradu i kupite ulaznice za događaje.
            </p>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pretraži lokacije ili gradove..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 text-base"
              />
            </div>
          </div>
        </section>

        {/* List */}
        <section className="container py-10">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : groupedVenues.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              {searchQuery ? "Nema rezultata za vašu pretragu" : "Nema lokacija za prikaz"}
            </div>
          ) : (
            <div className="space-y-10">
              {groupedVenues.map(([city, cityVenues]) => (
                <div key={city}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="text-xl font-bold text-foreground">{city}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ({cityVenues.length} {cityVenues.length === 1 ? "lokacija" : "lokacije"})
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cityVenues.map((venue) => (
                      <Link
                        key={venue.id}
                        to={`/lokacije/${venue.slug}`}
                        className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all"
                      >
                        <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {venue.image ? (
                            <img
                              src={venue.image}
                              alt={venue.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {venue.name}
                          </h3>
                          {venue.address && (
                            <p className="text-sm text-muted-foreground truncate">
                              {venue.address}
                            </p>
                          )}
                          {venue.capacity && (
                            <p className="text-xs text-muted-foreground">
                              {venue.capacity} mjesta
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default VenuesList;
