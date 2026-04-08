import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";
import { usePerformers } from "@/hooks/usePerformers";

const PerformersList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: performers = [], isLoading } = usePerformers();

  const filteredPerformers = useMemo(() => {
    if (!searchQuery.trim()) return performers;
    return performers.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [performers, searchQuery]);

  // Group alphabetically
  const groupedPerformers = useMemo(() => {
    const groups: Record<string, typeof performers> = {};
    filteredPerformers.forEach((performer) => {
      const firstLetter = performer.name.charAt(0).toUpperCase();
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(performer);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPerformers]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Izvođači - Svi koncerti i ulaznice | etickets"
        description="Pregledajte sve izvođače i grupe čije karte možete kupiti na etickets. Koncerti, festivali i događaji u Crnoj Gori i regionu."
        type="website"
        basePath="/izvodjaci"
      />

      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-12 md:py-16">
          <div className="container">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Izvođači</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
              Pronađite svoje omiljene izvođače i kupite ulaznice za njihove koncerte i nastupe.
            </p>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pretraži izvođače..."
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
          ) : groupedPerformers.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              {searchQuery ? "Nema rezultata za vašu pretragu" : "Nema izvođača za prikaz"}
            </div>
          ) : (
            <div className="space-y-10">
              {groupedPerformers.map(([letter, letterPerformers]) => (
                <div key={letter}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center">
                      {letter}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {letterPerformers.map((performer) => (
                      <Link
                        key={performer.id}
                        to={`/izvodjaci/${performer.slug}`}
                        className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all"
                      >
                        <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {performer.image ? (
                            <img
                              src={performer.image}
                              alt={performer.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {performer.name}
                        </span>
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

export default PerformersList;
