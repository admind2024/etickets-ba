import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { trackSponsorEvent } from "@/hooks/useSponsors";

interface Ticket {
  id: string;
  ticketId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  Lokacija: string;
  seatId: string;
  category: string;
  entrance: string;
  View: string;
  price: string;
  Valuta: string;
  customerName: string;
  "Customer Email": string;
  "QR Code": string;
  qrCodeRaw: string;
  isUsed: boolean | string;
  checkTime: string | null;
  time: string | null;
  status: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HMAC SECRET - ISTI KAO NA BACKENDU
// ═══════════════════════════════════════════════════════════════════════════
const HMAC_SECRET = "ETK-9f38d1a2-cc49-4e3b-b182-7f94c2d9f6aa-2025";

// ═══════════════════════════════════════════════════════════════════════════
// HMAC FUNKCIJE
// ═══════════════════════════════════════════════════════════════════════════

let cachedCryptoKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(HMAC_SECRET);

  cachedCryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  console.log("🔐 HMAC ključ keširan");
  return cachedCryptoKey;
}

async function hmacSha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const messageData = encoder.encode(message);
  const cryptoKey = await getCryptoKey();

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex.substring(0, 12);
}

async function verifyQRSignature(qrString: string): Promise<{
  valid: boolean;
  reason?: string;
  eventId?: string;
  ticketId?: string;
}> {
  console.log("🔐 Verifikujem QR:", qrString);

  if (!qrString) {
    return { valid: false, reason: "PRAZAN_QR" };
  }

  const parts = qrString.split("|");

  // Format: eventId|ticketId|signature
  if (parts.length !== 3) {
    console.log("❌ Neispravan format - dijelova:", parts.length);
    return { valid: false, reason: "NEISPRAVAN_FORMAT" };
  }

  const [eventId, ticketId, providedSignature] = parts;
  const payload = `${eventId}|${ticketId}`;
  const expectedSignature = await hmacSha256(payload);

  console.log("🔐 Potpisi:", { provided: providedSignature, expected: expectedSignature });

  if (providedSignature !== expectedSignature) {
    console.log("❌ FALSIFIKAT - potpisi se ne podudaraju!");
    return { valid: false, reason: "FALSIFIKAT", eventId, ticketId };
  }

  console.log("✅ HMAC verifikacija uspješna");
  return { valid: true, eventId, ticketId };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const formatDate = (dateString: string): string => {
  if (!dateString) return "";

  let day: number, month: number, year: number;

  if (dateString.includes("-") && dateString.indexOf("-") === 4) {
    const parts = dateString.split("-");
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (dateString.includes(".")) {
    const cleaned = dateString.replace(/\.+$/, "");
    const parts = cleaned.split(".");

    if (parts.length >= 3) {
      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);
      const third = parseInt(parts[2], 10);

      if (third > 1000) {
        if (first > 12) {
          day = first;
          month = second;
        } else if (second > 12) {
          day = second;
          month = first;
        } else {
          day = first;
          month = second;
        }
        year = third;
      } else {
        year = first;
        month = second;
        day = third;
      }
    } else {
      return dateString;
    }
  } else {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      day = date.getDate();
      month = date.getMonth() + 1;
      year = date.getFullYear();
    } else {
      return dateString;
    }
  }

  if (isNaN(day!) || isNaN(month!) || isNaN(year!)) {
    return dateString;
  }

  return `${day}.${month}.${year}.`;
};

const formatTime = (timeString: string): string => {
  if (!timeString) return "";
  const match = timeString.match(/(\d{1,2})[:.:](\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return timeString;
};

// ─── Provjeri je li manje od 1 sat do početka događaja ───────────────────
const isWithinOneHourOfEvent = (eventDate: string, eventTime: string): boolean => {
  if (!eventDate) return false;
  try {
    let year: number, month: number, day: number;
    if (eventDate.includes("-") && eventDate.indexOf("-") === 4) {
      const p = eventDate.split("-");
      year = parseInt(p[0]); month = parseInt(p[1]) - 1; day = parseInt(p[2]);
    } else if (eventDate.includes(".")) {
      const p = eventDate.replace(/\.+$/, "").split(".");
      if (p.length < 3) return false;
      day = parseInt(p[0]); month = parseInt(p[1]) - 1; year = parseInt(p[2]);
    } else {
      return false;
    }
    let hours = 0, minutes = 0;
    if (eventTime) {
      const m = eventTime.match(/(\d{1,2})[:.:](\d{2})/);
      if (m) { hours = parseInt(m[1]); minutes = parseInt(m[2]); }
    }
    const eventStart = new Date(year, month, day, hours, minutes, 0);
    const diffMs = eventStart.getTime() - Date.now();
    // Sakrij reklamu ako je manje od 60 min do početka (ili je već počelo)
    return diffMs <= 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const isTicketUsed = (ticket: Ticket): boolean => {
  return ticket.checkTime !== undefined && ticket.checkTime !== null && ticket.checkTime !== "";
};

const normalizeString = (str: string): string => {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\s+/g, " ");
};

// ═══════════════════════════════════════════════════════════════════════════
// LOKALNA PROVJERA KARTE (BEZ SERVERA)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// PIN MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function PinModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (password.trim()) {
      onSubmit(password.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="modal" style={{ display: "flex" }}>
      <div className="modal-content pin-modal-content">
        <div className="pin-icon">🔐</div>
        <div className="modal-title">Sigurnosna verifikacija</div>
        <div className="modal-message">Unesite password za ulaz</div>

        <div className="pin-input-container">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            maxLength={20}
            placeholder="Password"
            autoComplete="off"
            className="pin-text-input"
            autoFocus
          />
        </div>

        {error && (
          <div className="pin-error show">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="modal-buttons">
          <button className="modal-button modal-cancel" onClick={onClose} disabled={isLoading}>
            Otkaži
          </button>
          <button
            className="modal-button modal-confirm"
            onClick={handleSubmit}
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? "Provjeravam..." : "Potvrdi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT MODALS
// ═══════════════════════════════════════════════════════════════════════════

function SuccessModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="modal" style={{ display: "flex" }}>
      <div className="modal-content success-modal-content">
        <div className="success-icon">✅</div>
        <div className="modal-title">Uspješno čekirano!</div>
        <div className="modal-message">Karta je uspješno čekirana.</div>
        <div className="modal-buttons">
          <button className="modal-button modal-ok" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorModal({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) {
  if (!isOpen) return null;
  return (
    <div className="modal" style={{ display: "flex" }}>
      <div className="modal-content error-modal-content">
        <div className="error-modal-icon">❌</div>
        <div className="modal-title">Greška</div>
        <div className="modal-message" dangerouslySetInnerHTML={{ __html: message }} />
        <div className="modal-buttons">
          <button className="modal-button modal-ok" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function FalsifikatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="modal" style={{ display: "flex" }}>
      <div className="modal-content falsifikat-modal-content">
        <div className="falsifikat-icon">🚨</div>
        <div className="modal-title falsifikat-title">NEVAŽEĆA KARTA!</div>
        <div className="modal-message falsifikat-message">
          Digitalni potpis karte nije validan.
          <br />
          <br />
          Ova karta je možda falsifikovana ili oštećena.
        </div>
        <div className="modal-buttons">
          <button className="modal-button modal-falsifikat" onClick={onClose}>
            RAZUMIJEM
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// QR/POSTER ROTATOR COMPONENT - FLIP ANIMACIJA
// ═══════════════════════════════════════════════════════════════════════════

function QRPosterRotator({
  qrCode,
  posterUrl,
  posterLink,
  used,
  hideAd,
  onPosterClick,
}: {
  qrCode: string | null;
  posterUrl: string | null;
  posterLink: string | null;
  used: boolean;
  hideAd?: boolean;
  onPosterClick?: () => void;
}) {
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    // Ako je manje od 1 sat do događaja — samo QR, bez reklame
    if (!posterUrl || !qrCode || hideAd) return;

    let timeout: ReturnType<typeof setTimeout>;

    const cycle = () => {
      // Prvo prikaži poster sponzora 3 sekunde
      setShowQr(false);
      timeout = setTimeout(() => {
        // Pa QR kod 4 sekunde
        setShowQr(true);
        timeout = setTimeout(cycle, 4000);
      }, 3000);
    };

    cycle();

    return () => clearTimeout(timeout);
  }, [posterUrl, qrCode, hideAd]);

  if (!qrCode) {
    return (
      <div className="qr-container">
        <div className="qr-placeholder">
          <span>QR kod nije dostupan</span>
        </div>
      </div>
    );
  }

  const qrElement = <QRCodeSVG value={qrCode} size={200} level="M" className="qr-code" />;

  // Manje od 1 sat do događaja ili nema postera — odmah prikaži QR
  if (hideAd || !posterUrl) {
    return (
      <div className="qr-container">
        <div className="qr-flipper flipped">
          <div className="qr-front">
            {qrElement}
          </div>
          <div className="qr-back">
            {qrElement}
          </div>
        </div>
        {used && <div className="used-stamp">Iskorišteno</div>}
      </div>
    );
  }

  return (
    <div className="qr-container">
      <div className={`qr-flipper ${showQr ? "flipped" : ""}`}>
        {/* Poster sponzora - prednja strana (prikazuje se prvo) */}
        <div className="qr-front">
          {posterLink ? (
            <a href={posterLink} target="_blank" rel="noopener noreferrer" className="poster-link" onClick={onPosterClick}>
              <img src={posterUrl} alt="Sponsor" className="qr-poster" />
            </a>
          ) : (
            <img src={posterUrl} alt="Sponsor" className="qr-poster" />
          )}
        </div>

        {/* QR Code - zadnja strana */}
        <div className="qr-back">
          {qrElement}
        </div>
      </div>

      {used && <div className="used-stamp">Iskorišteno</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TICKET CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function TicketCard({
  ticket,
  formattedDate,
  formattedTime,
  posterUrl,
  posterLink,
  onShare,
  onCheckin,
}: {
  ticket: Ticket;
  formattedDate: string;
  formattedTime: string;
  posterUrl: string | null;
  posterLink: string | null;
  onShare: (ticket: Ticket) => void;
  onCheckin: (ticket: Ticket) => void;
}) {
  const used = isTicketUsed(ticket);
  const hideAd = isWithinOneHourOfEvent(ticket.eventDate, ticket.eventTime);

  let sektor = "nije dostupno";
  let red = "nije dostupno";
  let sjediste = "nije dostupno";
  const isFreeSeating = ticket.seatId
    ? /slobodn/i.test(ticket.seatId) || ticket.seatId.trim() === ""
    : true;

  if (ticket.seatId && !isFreeSeating) {
    const parts = ticket.seatId.split("-");
    if (parts.length === 3) {
      sektor = parts[0];
      red = parts[1];
      sjediste = parts[2];
    } else {
      sektor = ticket.seatId;
    }
  }

  let usedTimeDisplay = "";
  if (used && ticket.checkTime) {
    if (ticket.time) {
      usedTimeDisplay = `${ticket.checkTime} ${ticket.time}`;
    } else {
      usedTimeDisplay = ticket.checkTime;
    }
  }

  const venue = ticket.Lokacija || "";
  const showQr = !!ticket.qrCodeRaw;

  return (
    <div
      className="ticket-container"
      data-ticket-id={ticket.ticketId || ticket.id}
      data-qr-raw={ticket.qrCodeRaw || ""}
    >
      <div className="ticket-content">
        <div className="header">
          <h1>Vaša ulaznica</h1>
          <p>Pokažite pri ulasku</p>
        </div>

        <div className="event-info">
          <div className="event-name-row">
            <div>
              <div className="info-label">Naziv događaja</div>
              <div className="info-value">{ticket.eventName || ""}</div>
            </div>
            {ticket.entrance && (
              <div className="entrance-highlight">
                <div className="entrance-label">ULAZ</div>
                <div className="entrance-value">{ticket.entrance}</div>
              </div>
            )}
          </div>

          <div className="datetime-location">
            <div>
              <div className="info-label">Datum i vrijeme</div>
              <div className="info-value">
                {formattedDate} {formattedTime}
              </div>
            </div>
            <div>
              <div className="info-label">Lokacija</div>
              <div className="info-value">{venue}</div>
            </div>
          </div>
        </div>

        {/* Logo/QR rotator */}
        <QRPosterRotator qrCode={showQr ? ticket.qrCodeRaw : null} posterUrl={posterUrl} posterLink={posterLink} used={used} hideAd={hideAd} onPosterClick={() => trackSponsorEvent("sponsor-karta", "click", "sponsor-karta", posterUrl || "", posterLink || "")} />

        {used && usedTimeDisplay && <div className="used-time-info">Vrijeme korištenja: {usedTimeDisplay}</div>}

        <div className="divider">
          <div className="circle-cutout circle-left"></div>
          <div className="circle-cutout circle-right"></div>
        </div>

        {isFreeSeating ? (
          <div className="seat-info-highlight free-seating">
            <div className="seat-indicator">SLOBODNO SJEĐENJE</div>
            <div className="free-seating-content">
              {ticket.category && (
                <div className="free-seating-zone">{ticket.category}</div>
              )}
              <div className="free-seating-text">
                Sjedite na bilo koje slobodno mjesto
              </div>
            </div>
          </div>
        ) : (
          <div className="seat-info-highlight">
            <div className="seat-indicator">VAŠE MJESTO</div>
            <div className="details-grid seat-details">
              <div className="grid-item">
                <div className="info-label">Sektor</div>
                <div className="info-value seat-value">{sektor}</div>
              </div>
              <div className="grid-item">
                <div className="info-label">Red</div>
                <div className="info-value seat-value">{red}</div>
              </div>
              <div className="grid-item">
                <div className="info-label">Sjedište</div>
                <div className="info-value seat-value">{sjediste}</div>
              </div>
            </div>
          </div>
        )}

        <div className="details-grid">
          <div className="grid-item">
            <div className="info-label">Cijena</div>
            <div className="info-value">
              {parseFloat(ticket.price || "0").toFixed(2)} {(ticket.Valuta || "EUR").toUpperCase()}
            </div>
          </div>
          <div className="grid-item">
            <div className="info-label">Pogled</div>
            <div className="info-value">{ticket.View || "n/a"}</div>
          </div>
          <div className="grid-item">
            {!used ? (
              <div className="ticket-status status-valid">VALIDNA</div>
            ) : (
              <div className="ticket-status status-used">ISKORIŠTENA</div>
            )}
          </div>
        </div>

        <div className="customer-row">
          <div className="customer-info">
            <div className="info-label">Ime i prezime</div>
            <div className="info-value">{ticket.customerName || ""}</div>
          </div>
          <div className="buttons-row">
            {!used && (
              <>
                <button className="share-button" onClick={() => onShare(ticket)}>
                  <svg
                    className="button-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13"></path>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                  </svg>
                  PODIJELI
                </button>
                <button className="checkin-button" onClick={() => onCheckin(ticket)}>
                  <svg
                    className="button-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  CHECK IN
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function TicketDisplay() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const ticketId = searchParams.get("ticketId");

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterLink, setPosterLink] = useState<string | null>(null);

  const allowedEntrancesRef = useRef<Set<string>>(new Set());

  // Check-in state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [falsifikatModalOpen, setFalsifikatModalOpen] = useState(false);

  // Pre-load HMAC key
  useEffect(() => {
    getCryptoKey();
  }, []);

  // Fetch poster2 iz Sponzori tabele — samo ako sponsor.country === event.country
  useEffect(() => {
    const firstEventId = tickets[0]?.eventId;
    if (!firstEventId) return;

    const fetchPoster = async () => {
      try {
        const { data: eventData } = await supabase
          .from("AboutEvents")
          .select("country")
          .eq("id", firstEventId)
          .maybeSingle();

        const eventCountry = eventData?.country;
        if (!eventCountry) {
          console.log("ℹ️ Događaj nema country — poster se ne prikazuje.");
          setPosterUrl(null);
          setPosterLink(null);
          return;
        }

        const { data, error } = await supabase
          .from("Sponzori")
          .select("poster2, linkPosterKarte")
          .eq("country", eventCountry)
          .limit(1)
          .maybeSingle();

        if (!error && data?.poster2) {
          setPosterUrl(data.poster2);
          setPosterLink(data.linkPosterKarte || null);
          console.log(`📸 Poster2 učitan (${eventCountry}):`, data.poster2, "Link:", data.linkPosterKarte);
        } else {
          setPosterUrl(null);
          setPosterLink(null);
          console.log(`ℹ️ Nema postera za country=${eventCountry}.`);
        }
      } catch (err) {
        console.error("Greška pri učitavanju postera:", err);
      }
    };

    fetchPoster();
  }, [tickets]);

  // Tracking impresija sponzora na kartama
  useEffect(() => {
    if (posterUrl) {
      trackSponsorEvent("sponsor-karta", "impression", "sponsor-karta", posterUrl, posterLink || "");
    }
  }, [posterUrl, posterLink]);

  const FULL_SELECT = "id, ticketId, eventId, eventName, eventDate, eventTime, Lokacija, seatId, category, entrance, View, price, Valuta, customerName, \"Customer Email\", \"QR Code\", qrCodeRaw, isUsed, checkTime, time, status";

  // ─── Fetch tickets directly from Supabase ───
  const fetchTickets = async ({ silent = false } = {}) => {
    if (!sessionId && !ticketId) {
      setError("Nedostaje identifikator. Molimo koristite ispravan link.");
      setLoading(false);
      return;
    }

    if (!silent) setIsRefreshing(true);

    try {
      let data: Ticket[] | null = null;
      let fetchError: any = null;

      if (sessionId) {
        const result = await supabase.from("QRKarte").select(FULL_SELECT).eq("sessionId", sessionId);
        data = result.data as Ticket[] | null;
        fetchError = result.error;
      } else if (ticketId) {
        let result = await supabase.from("QRKarte").select(FULL_SELECT).eq("ticketId", ticketId);
        if (!result.data || result.data.length === 0) {
          result = await supabase.from("QRKarte").select(FULL_SELECT).eq("id", ticketId);
        }
        data = result.data as Ticket[] | null;
        fetchError = result.error;
      }

      if (!fetchError && data && data.length > 0) {
        setTickets(data);
        setEventId(data[0]?.eventId);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      setError(fetchError ? "Greška pri učitavanju karata." : "Karte nisu pronađene.");
      setLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Došlo je do greške pri učitavanju.");
      setLoading(false);
      setIsRefreshing(false);
    }
  };


  useEffect(() => {
    fetchTickets({ silent: true });
  }, [sessionId, ticketId]);

  // Handle share
  const handleShare = async (ticket: Ticket) => {
    const shareUrl = `${window.location.origin}/tickets?ticketId=${ticket.ticketId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Moja karta",
          text: `Pogledaj moju kartu za ${ticket.eventName}`,
          url: shareUrl,
        });
        toast.success("Karta podijeljena!");
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link karte je kopiran!");
    }
  };

  // Handle check-in click
  const handleCheckinClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCheckinError(null);
    setPinModalOpen(true);
  };

  // Handle check-in submit
  const handleCheckinSubmit = async (password: string) => {
    if (!selectedTicket) return;

    setCheckinLoading(true);
    setCheckinError(null);

    try {
      const realTicketId = selectedTicket.ticketId || selectedTicket.id;
      const qrRaw = selectedTicket.qrCodeRaw || null;

      console.log("🔵 CHECK IN - START");
      console.log("🔵 ticketId:", realTicketId);
      console.log("🔵 qrRaw:", qrRaw ? qrRaw.substring(0, 30) + "..." : "N/A");

      // ═══════════════════════════════════════════════════════════════
      // 1. DOHVATI DOZVOLJENE ULAZE ZA PASSWORD
      // ═══════════════════════════════════════════════════════════════
      const { data: scanningData } = await supabase.from("Scanning").select("*").eq("eventId", selectedTicket.eventId);

      if (!scanningData || scanningData.length === 0) {
        setCheckinError("Pristupni podaci nisu konfigurisani.");
        setCheckinLoading(false);
        return;
      }

      // Pronađi validan pristup za password
      let validAccess: any = null;
      const newAllowedEntrances = new Set<string>();

      for (const entry of scanningData) {
        if (String(entry.password) === String(password)) {
          validAccess = entry;

          // Parse allowed entrances
          const entrances = (entry.allowedEntrances || "")
            .split(",")
            .map((e: string) => normalizeString(e))
            .filter((e: string) => e.length > 0);

          entrances.forEach((e: string) => newAllowedEntrances.add(e));
          break;
        }
      }

      if (!validAccess) {
        setCheckinError("Pogrešan password.");
        setCheckinLoading(false);
        return;
      }

      allowedEntrancesRef.current = newAllowedEntrances;
      console.log("✅ Dozvoljeni ulazi:", Array.from(newAllowedEntrances));

      // ═══════════════════════════════════════════════════════════════
      // 2. HMAC VERIFIKACIJA
      // ═══════════════════════════════════════════════════════════════
      if (qrRaw) {
        const verification = await verifyQRSignature(qrRaw);
        if (!verification.valid) {
          console.log("🚨 FALSIFIKAT DETEKTOVAN!");
          setPinModalOpen(false);
          setFalsifikatModalOpen(true);
          setCheckinLoading(false);
          if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }
          return;
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // 2b. PROVJERA U BAZI - da li je već iskorištena + ulaz
      // ═══════════════════════════════════════════════════════════════
      const { data: dbTicket } = await supabase
        .from("QRKarte")
        .select("isUsed, checkTime, entrance")
        .eq("ticketId", realTicketId)
        .maybeSingle();

      if (dbTicket) {
        const isUsed = dbTicket.isUsed === true || dbTicket.isUsed === "true" || !!dbTicket.checkTime;
        if (isUsed) {
          setPinModalOpen(false);
          setErrorMessage("Karta je već čekirana.");
          setErrorModalOpen(true);
          setCheckinLoading(false);
          return;
        }

        // Provjera ulaza
        if (newAllowedEntrances.size > 0 && dbTicket.entrance) {
          const ticketEntranceNorm = dbTicket.entrance.trim().toLowerCase().replace(/\s+/g, "-");
          if (!newAllowedEntrances.has(ticketEntranceNorm)) {
            setCheckinError(`Karta nije za ovaj ulaz. Karta je za: ${dbTicket.entrance}`);
            setCheckinLoading(false);
            return;
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // 3. ČEKIRAJ KARTU U BAZI
      // ═══════════════════════════════════════════════════════════════
      const now = new Date();
      const checkDate = now.toISOString().split("T")[0];
      const checkTime = now.toLocaleTimeString("en-GB", {
        timeZone: "Europe/Podgorica",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const { error: updateError } = await supabase
        .from("QRKarte")
        .update({
          checkTime: checkDate,
          time: checkTime,
          isUsed: true,
          status: "Iskorištena",
          scannedAt: "Link",
          scannedBy: validAccess.userName || validAccess.userEmail || "Link User",
        })
        .eq("id", selectedTicket.id);

      if (updateError) {
        setCheckinError("Greška pri čekiranju karte.");
        setCheckinLoading(false);
        return;
      }

      console.log("✅ Karta uspješno čekirana");

      // 5. Uspješno!
      setPinModalOpen(false);
      setSuccessModalOpen(true);

      // Refresh tickets
      await fetchTickets();
    } catch (err) {
      console.error("Checkin error:", err);
      setCheckinError("Došlo je do greške.");
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessModalOpen(false);
    setSelectedTicket(null);
  };

  const handleErrorClose = () => {
    setErrorModalOpen(false);
  };

  const handleFalsifikatClose = () => {
    setFalsifikatModalOpen(false);
    setSelectedTicket(null);
  };

  const firstTicket = tickets[0];
  const formattedDate = formatDate(firstTicket?.eventDate || "");
  const formattedTime = formatTime(firstTicket?.eventTime || "");
  const hasActiveTickets = tickets.some((t) => !isTicketUsed(t));

  const refreshBanner = isRefreshing ? (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9998,
      background: "rgba(0, 71, 204, 0.9)", padding: "6px 0", textAlign: "center",
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: 0.5 }}>
        Osvježavanje...
      </span>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="ticket-page">
        <div className="loading-container">
          <div className="loader"></div>
          <div className="loading-text">Učitavanje vaših karata...</div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ticket-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-message">{error}</div>
          <a href="https://etickets.ba" className="home-button">
            Povratak na početnu
          </a>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="ticket-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-message">Nema karata za prikaz.</div>
          <a href="https://etickets.ba" className="home-button">
            Povratak na početnu
          </a>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="ticket-page">
      {refreshBanner}
      <div className="container">
        {hasActiveTickets && (
          <div className="global-notice-container">
            <div className="notice-box global-notice">
              <h3>VAŽNO UPOZORENJE!</h3>
              <p>
                Screenshot karte NIJE validan. Za ulazak je potreban pristup internetu. Čekiranje obavlja isključivo
                etickets osoblje.
              </p>
            </div>
          </div>
        )}

        <div className="tickets-grid">
          {tickets.map((ticket, index) => (
            <div className="ticket-wrapper" key={ticket.id || ticket.ticketId || index}>
              <TicketCard
                ticket={ticket}
                formattedDate={formattedDate}
                formattedTime={formattedTime}
                posterUrl={posterUrl}
                posterLink={posterLink}
                onShare={handleShare}
                onCheckin={handleCheckinClick}
              />
            </div>
          ))}
        </div>

        <div className="footer">Powered by etickets</div>
      </div>

      {/* MODALI */}
      <PinModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onSubmit={handleCheckinSubmit}
        isLoading={checkinLoading}
        error={checkinError}
      />

      <SuccessModal isOpen={successModalOpen} onClose={handleSuccessClose} />

      <ErrorModal isOpen={errorModalOpen} onClose={handleErrorClose} message={errorMessage} />

      <FalsifikatModal isOpen={falsifikatModalOpen} onClose={handleFalsifikatClose} />

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .ticket-page {
    background: #f5f5f5;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding: 20px 0;
  }
  .ticket-page * { margin: 0; padding: 0; box-sizing: border-box; }
  .container { max-width: 1200px; margin: 0 auto; padding: 5px; display: flex; flex-direction: column; align-items: center; }
  .tickets-grid { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }
  .ticket-wrapper { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .ticket-container { background: white; border-radius: 18px; width: 360px; max-width: calc(100vw - 20px); position: relative; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15); }
  .ticket-content { padding: 20px 16px; text-align: center; }
  .header { margin-bottom: 12px; text-align: center; }
  .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 3px; letter-spacing: -0.5px; text-transform: uppercase; color: #000; }
  .header p { font-size: 11px; color: #666; }
  .event-info { text-align: left; margin-bottom: 12px; }
  .info-label { font-size: 9px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
  .info-value { font-size: 13px; font-weight: 600; word-wrap: break-word; color: #000; }
  .event-name-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }

  .entrance-highlight {
    background: linear-gradient(135deg, #0047CC 0%, #0039a6 100%);
    color: white;
    padding: 10px 16px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 3px 12px rgba(0, 71, 204, 0.35);
    min-width: 90px;
    animation: entrance-pulse 2s ease-in-out 3;
    flex-shrink: 0;
  }
  @keyframes entrance-pulse {
    0%, 100% { box-shadow: 0 3px 12px rgba(0, 71, 204, 0.35); }
    50% { box-shadow: 0 3px 20px rgba(0, 71, 204, 0.65); }
  }
  .entrance-label {
    font-size: 9px;
    color: rgba(255,255,255,0.85) !important;
    text-transform: uppercase;
    margin-bottom: 3px;
    font-weight: 700;
    letter-spacing: 1.5px;
  }
  .entrance-value {
    font-size: 18px;
    font-weight: 900;
    color: white !important;
    letter-spacing: -0.3px;
  }
  .datetime-location { display: flex; justify-content: space-between; gap: 15px; margin-top: 10px; }
  
  /* QR CONTAINER - SA FLIP ANIMACIJOM */
  .qr-container { 
    margin: 12px auto; 
    width: 200px; 
    height: 200px; 
    perspective: 1000px;
    position: relative;
  }
  .qr-flipper {
    width: 100%;
    height: 100%;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  .qr-flipper.flipped {
    transform: rotateY(180deg);
  }
  .qr-front, .qr-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border: 3px solid #e5e7eb;
    overflow: hidden;
  }
  .qr-back {
    transform: rotateY(180deg);
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  }
  .qr-code { 
    width: 170px; 
    height: 170px; 
    object-fit: contain; 
    image-rendering: crisp-edges; 
    background-color: white;
  }
  .qr-poster {
    width: 170px;
    height: 170px;
    object-fit: contain;
    border-radius: 6px;
  }
  .poster-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  
  .qr-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f7ff; border: 2px dashed #cce4ff; border-radius: 6px; text-align: center; padding: 8px; font-size: 11px; color: #666; line-height: 1.4; }
  .used-stamp { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: rgba(220, 38, 38, 0.9); background-color: rgba(255, 255, 255, 0.8); padding: 6px 12px; border: 4px solid rgba(220, 38, 38, 0.8); border-radius: 6px; z-index: 100; white-space: nowrap; }
  .used-time-info { margin-top: 6px; font-size: 12px; color: #b91c1c; font-weight: 500; text-align: center; }
  .divider { position: relative; border-top: 2px dashed #ddd; margin: 12px -12px; }
  .circle-cutout { position: absolute; width: 26px; height: 26px; background: #f5f5f5; border-radius: 50%; top: -13px; box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1); }
  .circle-left { left: -13px; }
  .circle-right { right: -13px; }
  .seat-info-highlight { position: relative; border-radius: 6px; padding: 6px; background: white; margin: 8px 0; border: 2px solid #16a34a; }
  .seat-indicator { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #16a34a; color: white; padding: 3px 10px; border-radius: 10px; font-size: 9px; font-weight: 600; z-index: 5; }
  .free-seating { border-color: #2563eb; }
  .free-seating .seat-indicator { background: #2563eb; }
  .free-seating-content { padding: 10px 8px 6px; text-align: center; }
  .free-seating-zone { font-size: 14px; font-weight: 700; color: #1e40af; margin-bottom: 4px; }
  .free-seating-text { font-size: 12px; color: #6b7280; font-weight: 500; }
  .seat-details { padding-top: 6px; }
  .seat-value { font-size: 14px !important; font-weight: 700 !important; color: #000 !important; }
  .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; margin: 8px 0; }
  .grid-item { display: flex; flex-direction: column; align-items: center; }
  .ticket-status { padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; display: inline-block; white-space: nowrap; }
  .status-valid { background-color: #dcfce7; color: #16a34a; }
  .status-used { background-color: #f3f4f6; color: #4b5563; }
  .customer-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 12px; gap: 10px; }
  .customer-info { text-align: left; flex: 0 0 auto; }
  .buttons-row { display: flex; gap: 8px; margin-left: auto; flex-shrink: 0; }
  .share-button { background: #0047CC; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); min-width: 95px; white-space: nowrap; }
  .share-button:hover { background: #0039a6; transform: translateY(-2px); }
  .checkin-button { background: #16a34a; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); min-width: 95px; white-space: nowrap; }
  .checkin-button:hover { background: #15803d; transform: translateY(-2px); }
  .button-icon { width: 14px; height: 14px; }
  .global-notice-container { margin-bottom: 12px; width: 100%; max-width: 360px; }
  .notice-box { background-color: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 12px; text-align: left; }
  .global-notice h3 { color: #b91c1c; font-size: 12px; margin-bottom: 4px; font-weight: 700; }
  .global-notice p { color: #b91c1c; font-size: 11px; line-height: 1.4; }
  .loading-container { text-align: center; padding: 60px 20px; }
  .loader { border: 4px solid #f3f3f3; border-top: 4px solid #0047CC; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .loading-text { color: #666; font-size: 16px; }
  .error-container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 500px; text-align: center; margin: 40px auto; }
  .error-icon { font-size: 48px; margin-bottom: 20px; }
  .error-message { color: #1a1a1a; font-size: 18px; line-height: 1.5; margin-bottom: 20px; }
  .home-button { display: inline-block; padding: 12px 24px; background: #0047CC; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; transition: background 0.2s; }
  .home-button:hover { background: #0039a6; }
  .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }
  
  /* MODAL STYLES */
  .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); z-index: 9999; align-items: center; justify-content: center; }
  .modal-content { background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); max-width: 90%; width: 400px; text-align: center; animation: modalSlideIn 0.3s ease-out; }
  @keyframes modalSlideIn { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
  .modal-title { font-size: 22px; font-weight: 700; margin-bottom: 15px; color: #1a1a1a; }
  .modal-message { font-size: 16px; line-height: 1.5; margin-bottom: 20px; color: #4b5563; }
  .modal-buttons { display: flex; justify-content: center; gap: 12px; }
  .modal-button { padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 15px; cursor: pointer; border: none; transition: all 0.2s; }
  .modal-button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
  .modal-button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .modal-confirm { background-color: #16a34a; color: white; }
  .modal-cancel { background-color: #ef4444; color: white; }
  .modal-ok { background-color: #0047CC; color: white; }
  .modal-falsifikat { background-color: #dc2626; color: white; }
  
  /* PIN MODAL */
  .pin-modal-content { max-width: 380px; }
  .pin-icon { font-size: 42px; margin-bottom: 10px; }
  .pin-input-container { margin: 20px 0; display: flex; justify-content: center; }
  .pin-text-input { width: 250px; height: 50px; font-size: 16px; text-align: center; border: 3px solid #e5e7eb; border-radius: 12px; font-weight: 600; color: #16a34a; background: #f9fafb; transition: all 0.3s ease; outline: none; }
  .pin-text-input:focus { border-color: #16a34a; background: white; box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.1); }
  .pin-error { display: none; color: #ef4444; font-size: 13px; font-weight: 600; margin: 12px 0; padding: 10px 12px; background: #fef2f2; border-radius: 8px; align-items: center; justify-content: center; gap: 6px; }
  .pin-error.show { display: flex; }
  
  /* SUCCESS MODAL */
  .success-modal-content { border: 3px solid #22c55e; background: linear-gradient(to bottom, #ffffff, #f0fdf4); }
  .success-icon { font-size: 64px; margin-bottom: 10px; }
  .success-modal-content .modal-title { color: #16a34a; }
  
  /* ERROR MODAL */
  .error-modal-content { border: 3px solid #ef4444; background: linear-gradient(to bottom, #ffffff, #fef2f2); }
  .error-modal-icon { font-size: 64px; margin-bottom: 10px; }
  .error-modal-content .modal-title { color: #dc2626; }
  
  /* FALSIFIKAT MODAL */
  .falsifikat-modal-content { border: 3px solid #dc2626; background: linear-gradient(to bottom, #ffffff, #fef2f2); }
  .falsifikat-icon { font-size: 80px; margin-bottom: 10px; }
  .falsifikat-title { color: #dc2626 !important; }
  .falsifikat-message { color: #991b1b !important; }
  
  @media (max-width: 768px) {
    .ticket-container { width: calc(100vw - 20px); max-width: 360px; }
    .share-button, .checkin-button { padding: 7px 10px; font-size: 10px; min-width: 80px; gap: 4px; }
    .button-icon { width: 12px; height: 12px; }
  }
`;
