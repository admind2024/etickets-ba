import { useState, useEffect, useMemo } from "react";
import { Link2, Loader2, Copy, Check, MapPin, Calendar, Clock, ExternalLink } from "lucide-react";
import AdminPagePlaceholder from "@/components/AdminPagePlaceholder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseCategories, parseDescription, formatEventDate, formatEventTime, getCurrencySymbol } from "@/hooks/useAboutEvents";

interface CategoryItem {
  category: string;
  price: number;
}

interface EventItem {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  currency: string;
  categories: CategoryItem[];
  eventId: string;
  slug?: string;
}

const PaymentLinkCreator = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [seatNumber, setSeatNumber] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [note, setNote] = useState("");

  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    loadAllEvents();
  }, []);

  const loadAllEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("AboutEvents")
        .select("*")
        .gte("date", today)
        .order("date");

      if (error) throw error;

      const mapped: EventItem[] = (data || []).map((e: any) => {
        const descCats = parseDescription(e.description);
        const cats = descCats.length > 0 ? descCats : parseCategories(e.categories);
        return {
          id: e.id,
          name: e.name || "Bez naziva",
          date: e.date || "",
          time: e.event_time || "",
          venue: e.venue || "",
          currency: e.currency || "EUR",
          categories: cats.map((c: any) => ({ category: c.category, price: c.price })),
          eventId: e.eventId || e.id,
          slug: e.slug,
        };
      });

      setEvents(mapped);
    } catch (err: any) {
      console.error("Error loading events:", err);
      toast.error("Greška pri učitavanju događaja");
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const selectedCategoryData = useMemo(
    () => selectedEvent?.categories.find((c) => c.category === selectedCategory),
    [selectedEvent, selectedCategory]
  );

  const totalPrice = useMemo(
    () => (selectedCategoryData?.price || 0) * quantity,
    [selectedCategoryData, quantity]
  );

  const handleGenerateLink = async () => {
    if (!selectedEvent || !selectedCategoryData) {
      toast.error("Izaberite događaj i kategoriju");
      return;
    }

    if (!seatNumber.trim()) {
      toast.error("Unesite broj sjedišta / stola");
      return;
    }

    setIsGenerating(true);
    setGeneratedLink("");

    try {
      const ticketsToSend = Array(quantity)
        .fill(null)
        .map(() => ({
          type: selectedCategoryData.category,
          category: selectedCategoryData.category,
          categoryName: selectedCategoryData.category,
          name: selectedCategoryData.category,
          price: selectedCategoryData.price,
          seatNumber: seatNumber.trim(),
          sectionLabel: selectedCategoryData.category,
        }));

      const checkoutData = {
        eventId: selectedEvent.eventId,
        selectedTickets: ticketsToSend,
        eventDetails: {
          name: selectedEvent.name,
          date: selectedEvent.date,
          time: selectedEvent.time,
          venue: selectedEvent.venue,
        },
        hasInsurance: false,
        currency: selectedEvent.currency,
      };

      const { data, error } = await supabase.functions.invoke("create-checkout-session-simple", {
        body: checkoutData,
      });

      if (error) throw new Error(error.message);
      if (!data?.success || !data?.url) {
        throw new Error(data?.message || "Greška pri kreiranju linka");
      }

      setGeneratedLink(data.url);
      toast.success("Link za plaćanje je kreiran!");
    } catch (err: any) {
      console.error("Error generating payment link:", err);
      toast.error("Greška: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setIsCopied(true);
      toast.success("Link kopiran!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Greška pri kopiranju");
    }
  };

  const handleReset = () => {
    setSelectedEventId("");
    setSelectedCategory("");
    setQuantity(1);
    setSeatNumber("");
    setCustomerEmail("");
    setNote("");
    setGeneratedLink("");
  };

  return (
    <AdminPagePlaceholder
      title="Link za plaćanje"
      icon={<Link2 size={24} />}
      description="Kreirajte link za plaćanje i pošaljite kupcu"
    >
      <div className="space-y-6">
        {/* Event Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#1a1f36]">
            Događaj <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedEventId}
            onValueChange={(val) => {
              setSelectedEventId(val);
              setSelectedCategory("");
              setGeneratedLink("");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingEvents ? "Učitavanje..." : "Izaberite događaj..."} />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name} — {formatEventDate(event.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Event Info */}
        {selectedEvent && (
          <div className="bg-[#f6f9fc] rounded-lg p-4 border border-gray-100">
            <div className="flex flex-wrap gap-4 text-sm text-[#425466]">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-[#697386]" />
                {selectedEvent.venue || "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[#697386]" />
                {formatEventDate(selectedEvent.date)}
              </span>
              {selectedEvent.time && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#697386]" />
                  {formatEventTime(selectedEvent.time)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Category + Quantity + Seat */}
        {selectedEvent && selectedEvent.categories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1a1f36]">
                Kategorija <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setGeneratedLink("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedEvent.categories.map((cat) => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category} — {cat.price.toFixed(2)}{getCurrencySymbol(selectedEvent.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1a1f36]">
                Količina <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1a1f36]">
                Sjedište / Sto <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="npr. A12, Sto 5..."
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
              />
            </div>
          </div>
        )}

        {selectedEvent && selectedEvent.categories.length === 0 && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800">
            Ovaj događaj nema definisane kategorije karata.
          </div>
        )}

        {/* Optional fields */}
        {selectedCategory && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1a1f36]">Email kupca (opciono)</Label>
              <Input
                type="email"
                placeholder="kupac@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#1a1f36]">Napomena (opciono)</Label>
              <Input
                placeholder="Interna napomena..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Price summary + Generate */}
        {selectedCategoryData && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[#f0f7ff] rounded-lg border border-[#013DC4]/10">
            <div>
              <p className="text-sm text-[#697386]">Ukupna cijena karata</p>
              <p className="text-2xl font-bold text-[#1a1f36]">
                {totalPrice.toFixed(2)}{getCurrencySymbol(selectedEvent?.currency)}
              </p>
              <p className="text-xs text-[#697386] mt-1">
                + servisna naknada će biti dodana na checkout
              </p>
            </div>
            <Button
              onClick={handleGenerateLink}
              disabled={isGenerating || !seatNumber.trim()}
              className="bg-[#013DC4] hover:bg-[#012da0] text-white px-6"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generisanje...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Generiši link
                </>
              )}
            </Button>
          </div>
        )}

        {/* Generated link */}
        {generatedLink && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3">
            <p className="text-sm font-semibold text-green-800">Link za plaćanje je spreman:</p>
            <div className="flex gap-2">
              <Input readOnly value={generatedLink} className="bg-white text-xs font-mono" />
              <Button onClick={handleCopyLink} variant="outline" className="shrink-0">
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Kopirano
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Kopiraj
                  </>
                )}
              </Button>
              <Button
                onClick={() => window.open(generatedLink, "_blank")}
                variant="outline"
                className="shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-[#697386]">
              Kreiraj novi link
            </Button>
          </div>
        )}
      </div>
    </AdminPagePlaceholder>
  );
};

export default PaymentLinkCreator;
