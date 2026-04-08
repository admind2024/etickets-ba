import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingCart, Tag } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getEventBySlug } from "@/data/events";
import { toast } from "@/hooks/use-toast";

interface TicketQuantity {
  [key: string]: number;
}

const TicketsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const event = getEventBySlug(slug || "");
  const [quantities, setQuantities] = useState<TicketQuantity>({});

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold">Događaj nije pronađen</h1>
            <Button asChild>
              <Link to="/">Povratak na početnu</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const updateQuantity = (categoryName: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[categoryName] || 0;
      const newValue = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [categoryName]: newValue };
    });
  };

  const getTotalItems = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return event.ticketCategories.reduce((sum, category) => {
      const qty = quantities[category.name] || 0;
      return sum + qty * category.price;
    }, 0);
  };

  const handleCheckout = () => {
    if (getTotalItems() === 0) {
      toast({
        title: "Izaberite ulaznice",
        description: "Molimo izaberite bar jednu ulaznicu prije nego nastavite.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Nastavak na plaćanje",
      description: "Preusmjeravanje na stranicu za plaćanje...",
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <button
              onClick={() => navigate(-1)}
              className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Nazad na događaj
            </button>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">{event.title}</h1>
                <p className="text-muted-foreground">
                  {event.date} · {event.time} · {event.venue}, {event.city}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Korak 1 od 3</p>
                <p className="font-semibold text-primary">Izbor ulaznica</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Ticket Selection */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-6 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Izaberite ulaznice</h2>
                </div>

                <div className="space-y-4">
                  {event.ticketCategories.map((category) => {
                    const qty = quantities[category.name] || 0;
                    return (
                      <div
                        key={category.name}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-5 transition-all hover:border-primary/50 hover:shadow-sm"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{category.name}</h3>
                            {!category.available && (
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                Rasprodato
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-2xl font-bold text-primary">
                            {event.currency}{category.price}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(category.name, -1)}
                            disabled={!category.available || qty === 0}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-lg font-semibold">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQuantity(category.name, 1)}
                            disabled={!category.available || qty >= 10}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-6 text-sm text-muted-foreground">
                  * Maksimalno 10 ulaznica po kategoriji
                </p>
              </div>

              {/* Info Box */}
              <div className="mt-6 rounded-xl border border-primary/20 bg-blue-light p-5">
                <h4 className="mb-2 font-semibold text-primary">Informacije o kupovini</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• E-ulaznice stižu odmah na vašu email adresu</li>
                  <li>• Ulaznice se mogu prenijeti na drugu osobu</li>
                  <li>• Povrat je moguć do 7 dana prije događaja</li>
                  <li>• Plaćanje karticom je sigurno i zaštićeno</li>
                </ul>
              </div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">Vaša narudžba</h3>
                </div>

                {getTotalItems() === 0 ? (
                  <div className="mb-6 rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Korpa je prazna. Dodajte ulaznice.
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 space-y-3">
                    {event.ticketCategories.map((category) => {
                      const qty = quantities[category.name] || 0;
                      if (qty === 0) return null;
                      return (
                        <div
                          key={category.name}
                          className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                        >
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {qty}x {event.currency}{category.price}
                            </p>
                          </div>
                          <span className="font-bold text-primary">
                            {event.currency}{qty * category.price}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mb-6 border-t border-border pt-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Ulaznice ({getTotalItems()})</span>
                    <span>{event.currency}{getTotalPrice()}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Servisna naknada</span>
                    <span>{event.currency}0</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-lg font-semibold">Ukupno</span>
                    <span className="text-2xl font-bold text-primary">
                      {event.currency}{getTotalPrice()}
                    </span>
                  </div>
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={getTotalItems() === 0}
                >
                  Nastavi na plaćanje
                </Button>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Sigurna kupovina · SSL zaštita
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TicketsPage;
