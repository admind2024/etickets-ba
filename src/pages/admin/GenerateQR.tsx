import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Printer, QrCode, Plus, Trash2, Loader2, PenLine } from "lucide-react";

interface EventOption {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
}

interface GeneratedTicket {
  id: string;
  ticketId: string;
  qrCodeRaw: string;
  "QR Code": string;
  seatId: string;
  category: string;
  entrance: string;
  customerName: string;
}

const GenerateQR = () => {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [manualMode, setManualMode] = useState(false);

  // Form - event iz baze
  const [selectedEventId, setSelectedEventId] = useState("");

  // Form - ručni unos eventa
  const [manualEventName, setManualEventName] = useState("");
  const [manualEventId, setManualEventId] = useState("");
  const [manualEventDate, setManualEventDate] = useState("");
  const [manualEventTime, setManualEventTime] = useState("");
  const [manualEventVenue, setManualEventVenue] = useState("");
  const [manualEventCurrency, setManualEventCurrency] = useState("EUR");

  // Form - zajednicka polja
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState("");
  const [entrance, setEntrance] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [price, setPrice] = useState("");
  const [salesChannel, setSalesChannel] = useState("Admin");
  const [seatIds, setSeatIds] = useState<string[]>([""]);

  // Results
  const [generating, setGenerating] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState<GeneratedTicket[]>([]);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("AboutEvents")
      .select("id, name, date, venue")
      .order("date", { ascending: false });

    if (!error && data) {
      setEvents(data);
    }
    setLoadingEvents(false);
  };

  const handleSeatIdChange = (index: number, value: string) => {
    const updated = [...seatIds];
    updated[index] = value;
    setSeatIds(updated);
  };

  const addSeatId = () => setSeatIds([...seatIds, ""]);
  const removeSeatId = (index: number) => setSeatIds(seatIds.filter((_, i) => i !== index));

  const handleGenerate = async () => {
    if (!manualMode && !selectedEventId) {
      toast.error("Izaberi event ili prebaci na ručni unos");
      return;
    }
    if (manualMode && !manualEventName.trim()) {
      toast.error("Unesi ime eventa");
      return;
    }
    if (quantity < 1) {
      toast.error("Količina mora biti najmanje 1");
      return;
    }

    setGenerating(true);
    setGeneratedTickets([]);
    setProgress("");

    try {
      const filteredSeatIds = seatIds.filter((s) => s.trim() !== "");
      const BATCH_SIZE = 100;
      const totalBatches = Math.ceil(quantity / BATCH_SIZE);
      const allTickets: GeneratedTicket[] = [];

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = batch * BATCH_SIZE;
        const batchQty = Math.min(BATCH_SIZE, quantity - batchStart);
        // Ako je 1 seatId, šalji ga svakom batchu (backend ga primjeni na sve)
        // Ako ih je više, slice-uj po batchu
        const batchSeatIds = filteredSeatIds.length === 1
          ? filteredSeatIds
          : filteredSeatIds.length > 1
            ? filteredSeatIds.slice(batchStart, batchStart + batchQty)
            : undefined;

        setProgress(`Batch ${batch + 1}/${totalBatches} (${allTickets.length}/${quantity})`);

        const body: Record<string, any> = {
          quantity: batchQty,
          category,
          entrance,
          seatIds: batchSeatIds,
          customerName,
          customerEmail,
          price: price || undefined,
          salesChannel,
        };

        if (manualMode) {
          body.manualEvent = {
            name: manualEventName.trim(),
            eventId: manualEventId.trim() || undefined,
            date: manualEventDate || undefined,
            time: manualEventTime || undefined,
            venue: manualEventVenue || undefined,
            currency: manualEventCurrency,
          };
        } else {
          body.eventId = selectedEventId;
        }

        const { data, error } = await supabase.functions.invoke("generate-qr-tickets", { body });

        if (error) {
          toast.error(`Greška u batch ${batch + 1}: ${error.message}`);
          break;
        }

        if (data?.success && data.tickets) {
          allTickets.push(...data.tickets);
          setGeneratedTickets([...allTickets]);
        } else {
          toast.error(data?.message || "Nepoznata greška");
          break;
        }
      }

      if (allTickets.length > 0) {
        toast.success(`Generisano ${allTickets.length} karata`);
      }
    } catch (err: any) {
      toast.error("Greška: " + err.message);
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Karte - Štampa</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .ticket { display: inline-block; width: 280px; border: 1px solid #ccc; border-radius: 8px; padding: 16px; margin: 8px; text-align: center; page-break-inside: avoid; }
          .ticket img { width: 180px; height: 180px; margin: 8px auto; }
          .ticket-id { font-size: 12px; color: #666; margin-top: 8px; }
          .seat { font-weight: bold; font-size: 14px; margin-top: 4px; }
          .category { font-size: 12px; color: #444; }
          @media print { body { margin: 0; } .ticket { border: 1px solid #999; } }
        </style>
      </head>
      <body>
        ${generatedTickets
          .map(
            (t) => `
          <div class="ticket">
            <img src="${t["QR Code"]}" alt="QR" />
            <div class="seat">${t.seatId}</div>
            ${t.category ? `<div class="category">${t.category}</div>` : ""}
            <div class="ticket-id">${t.ticketId}</div>
          </div>
        `
          )
          .join("")}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  const handleDownloadCSV = () => {
    const headers = ["ticketId", "seatId", "category", "entrance", "qrCodeRaw", "QR Code URL", "customerName"];
    const rows = generatedTickets.map((t) => [
      t.ticketId,
      t.seatId,
      t.category,
      t.entrance,
      t.qrCodeRaw,
      t["QR Code"],
      t.customerName,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-karte-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const eventLabel = manualMode ? manualEventName : selectedEvent?.name;

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-violet-500 w-10 h-10 rounded-lg flex items-center justify-center">
            <QrCode size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1a1f36]">Generiši QR Karte</h2>
            <p className="text-sm text-[#697386]">Za štampu, ulaznice, i eksterne potrebe</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Event Selection Mode */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Event *</label>
              <button
                type="button"
                onClick={() => {
                  setManualMode(!manualMode);
                  setSelectedEventId("");
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
              >
                <PenLine size={12} />
                {manualMode ? "Izaberi iz baze" : "Ručni unos"}
              </button>
            </div>

            {!manualMode ? (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className={inputClass}
              >
                <option value="">-- Izaberi event --</option>
                {loadingEvents ? (
                  <option disabled>Učitavanje...</option>
                ) : (
                  events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} {ev.date ? `(${ev.date})` : ""} {ev.venue ? `- ${ev.venue}` : ""}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <div className="border border-violet-200 bg-violet-50/50 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ime eventa *</label>
                  <input
                    type="text"
                    value={manualEventName}
                    onChange={(e) => setManualEventName(e.target.value)}
                    placeholder="npr. Koncert XYZ"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Event ID</label>
                    <input
                      type="text"
                      value={manualEventId}
                      onChange={(e) => setManualEventId(e.target.value)}
                      placeholder="opciono - auto ako prazno"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Lokacija</label>
                    <input
                      type="text"
                      value={manualEventVenue}
                      onChange={(e) => setManualEventVenue(e.target.value)}
                      placeholder="npr. Arena Podgorica"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Datum</label>
                    <input
                      type="date"
                      value={manualEventDate}
                      onChange={(e) => setManualEventDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vrijeme</label>
                    <input
                      type="time"
                      value={manualEventTime}
                      onChange={(e) => setManualEventTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valuta</label>
                  <select
                    value={manualEventCurrency}
                    onChange={(e) => setManualEventCurrency(e.target.value)}
                    className={inputClass}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="BAM">BAM</option>
                    <option value="RSD">RSD</option>
                    <option value="HRK">HRK</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Količina *</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={inputClass}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategorija</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="npr. VIP, Tribina A..."
              className={inputClass}
            />
          </div>

          {/* Entrance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ulaz</label>
            <input
              type="text"
              value={entrance}
              onChange={(e) => setEntrance(e.target.value)}
              placeholder="npr. Ulaz 1, Sjever..."
              className={inputClass}
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cijena</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ime kupca</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Admin - Štampa"
              className={inputClass}
            />
          </div>

          {/* Customer Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email kupca</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="opciono"
              className={inputClass}
            />
          </div>

          {/* Sales Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prodajni kanal</label>
            <select
              value={salesChannel}
              onChange={(e) => setSalesChannel(e.target.value)}
              className={inputClass}
            >
              <option value="Admin">Admin</option>
              <option value="Štampa">Štampa</option>
              <option value="Pozivnica">Pozivnica</option>
              <option value="Gotovina">Gotovina</option>
              <option value="Promo">Promo</option>
            </select>
          </div>

          {/* Seat IDs */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Seat ID-evi <span className="text-gray-400 font-normal">(opciono - ako ne uneseš, biće automatski)</span>
            </label>
            <div className="space-y-2">
              {seatIds.map((seatId, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={seatId}
                    onChange={(e) => handleSeatIdChange(index, e.target.value)}
                    placeholder={`Seat ${index + 1}`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {seatIds.length > 1 && (
                    <button
                      onClick={() => removeSeatId(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addSeatId}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={14} /> Dodaj seat
              </button>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <button
            onClick={handleGenerate}
            disabled={generating || (!manualMode && !selectedEventId) || (manualMode && !manualEventName.trim())}
            className="px-6 py-2.5 bg-[#013DC4] text-white rounded-lg font-medium text-sm hover:bg-[#012da0] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {progress || "Generisanje..."}
              </>
            ) : (
              <>
                <QrCode size={16} /> Generiši {quantity} {quantity === 1 ? "kartu" : "karata"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {generatedTickets.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1a1f36]">
              Generisano {generatedTickets.length} karata
              {eventLabel && <span className="text-gray-400 font-normal"> — {eventLabel}</span>}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#013DC4] hover:bg-[#012da0] rounded-lg transition-colors"
              >
                <Printer size={14} /> Štampaj
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {generatedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border border-gray-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow"
              >
                <img
                  src={ticket["QR Code"]}
                  alt="QR"
                  className="w-full aspect-square object-contain mb-2"
                  loading="lazy"
                />
                <p className="text-xs font-mono text-gray-500 truncate">{ticket.ticketId}</p>
                {ticket.seatId && !ticket.seatId.startsWith("ADMIN-") && (
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">{ticket.seatId}</p>
                )}
                {ticket.category && <p className="text-xs text-gray-400">{ticket.category}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateQR;
