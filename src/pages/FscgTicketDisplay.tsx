import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DocumentScanner, { type OcrResult } from "@/components/DocumentScanner";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";

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
  document_type: string | null;
  document_number: string | null;
  document_image_url: string | null;
  originalCustomerName: string | null;
  nameChangeUsed: boolean;
  nameChangedAt: string | null;
  nameChangeData: any | null;
  forwardCount: number;
  viewerTokens: Record<string, string> | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HMAC VERIFIKACIJA - POZIVA BACKEND (ključ je samo na serveru)
// ═══════════════════════════════════════════════════════════════════════════

async function verifyQRSignature(qrString: string): Promise<{
  valid: boolean;
  reason?: string;
  eventId?: string;
  ticketId?: string;
}> {
  console.log("🔐 Verifikujem QR preko backend-a:", qrString);

  if (!qrString) {
    return { valid: false, reason: "PRAZAN_QR" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("verify-qr", {
      body: { qrCodeRaw: qrString },
    });

    if (error) {
      console.error("❌ Greška pri verifikaciji:", error);
      return { valid: false, reason: "SERVER_ERROR" };
    }

    console.log("🔐 Backend rezultat:", data);
    return data;
  } catch (err) {
    console.error("❌ Network greška:", err);
    return { valid: false, reason: "SERVER_ERROR" };
  }
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

  return `${day}/${month}/${String(year).slice(-2)}`;
};

const formatTime = (timeString: string): string => {
  if (!timeString) return "";
  const match = timeString.match(/(\d{1,2})[:.:](\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return timeString;
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
// NAME CHANGE MODAL — Multi-step wizard with OCR scanning
// ═══════════════════════════════════════════════════════════════════════════

interface NameChangePayload {
  type: "adult" | "minor";
  newName: string;
  document?: OcrResult;
  guardianDocument?: OcrResult;
}

function NameChangeModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  currentName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: NameChangePayload) => void;
  isLoading: boolean;
  currentName: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [personType, setPersonType] = useState<"adult" | "minor" | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [documentType, setDocumentType] = useState<"id_card" | "passport">("id_card");
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  // Minor fields — manual child name + guardian OCR scan (step 2)
  const [childName, setChildName] = useState("");
  const [guardianOcrResult, setGuardianOcrResult] = useState<OcrResult | null>(null);
  const [guardianDocType, setGuardianDocType] = useState<"id_card" | "passport">("id_card");
  const [guardianScannerOpen, setGuardianScannerOpen] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPersonType(null);
      setScannerOpen(false);
      setDocumentType("id_card");
      setOcrResult(null);
      setChildName("");
      setGuardianOcrResult(null);
      setGuardianDocType("id_card");
      setGuardianScannerOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fixOcrName = (s: string | null): string | null => {
    if (!s) return null;
    return s.replace(/1/g, "I").replace(/0/g, "O").replace(/5/g, "S").replace(/8/g, "B");
  };

  const getOcrFullName = (ocr: OcrResult): string => {
    const surname = fixOcrName(ocr.surname) || "";
    const given = fixOcrName(ocr.givenNames) || "";
    return `${surname} ${given}`.trim();
  };

  const handleAdultConfirm = () => {
    if (!ocrResult) return;
    onSubmit({
      type: "adult",
      newName: getOcrFullName(ocrResult),
      document: ocrResult,
    });
  };

  const handleMinorConfirm = () => {
    if (!childName.trim() || !guardianOcrResult) return;
    onSubmit({
      type: "minor",
      newName: childName.trim(),
      guardianDocument: guardianOcrResult,
    });
  };

  const handleBack = () => {
    if (step === 2) { setStep(1); setPersonType(null); setOcrResult(null); setChildName(""); setGuardianOcrResult(null); }
  };

  // Silently upload scanned document to Supabase storage
  const uploadScannedDoc = (file: File, ocr: OcrResult) => {
    try {
      const surname = (ocr.surname || "unknown").trim().replace(/\s+/g, "_");
      const given = (ocr.givenNames || "").trim().replace(/\s+/g, "_");
      const docNum = (ocr.documentNumber || "").trim().replace(/\s+/g, "_");
      const fileName = [surname, given, docNum].filter(Boolean).join("_");
      const renamedFile = new File([file], `${fileName}.jpg`, { type: file.type });
      const fd = new FormData();
      fd.append("file", renamedFile);
      fd.append("sessionId", `doc_${Date.now()}`);
      fd.append("eventId", "licne-karte");
      supabase.functions.invoke("upload-match-document", { body: fd }).catch(() => {});
    } catch {}
  };

  // ── Scanner overlays ──
  if (scannerOpen) {
    return (
      <DocumentScanner
        lang="me"
        documentType={documentType}
        skipMontenegrinCheck={true}
        strict={false}
        onResult={(file, data) => {
          setOcrResult(data);
          setScannerOpen(false);
          uploadScannedDoc(file, data);
        }}
        onClose={() => setScannerOpen(false)}
      />
    );
  }

  if (guardianScannerOpen) {
    return (
      <DocumentScanner
        lang="me"
        documentType={guardianDocType}
        skipMontenegrinCheck={true}
        strict={false}
        onResult={(file, data) => {
          setGuardianOcrResult(data);
          setGuardianScannerOpen(false);
          uploadScannedDoc(file, data);
        }}
        onClose={() => setGuardianScannerOpen(false)}
      />
    );
  }

  return (
    <div className="modal" style={{ display: "flex" }}>
      <div className="modal-content" style={{ maxWidth: 360, position: "relative" }}>

        {/* Back button for steps 2+ */}
        {step > 1 && (
          <button
            onClick={handleBack}
            style={{
              position: "absolute", top: 10, left: 10, background: "none", border: "none",
              cursor: "pointer", padding: 4, display: "flex", alignItems: "center", gap: 4,
              color: "#888", fontSize: 11, fontWeight: 600,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Nazad
          </button>
        )}

        {/* Header icon */}
        <div style={{ textAlign: "center", marginBottom: 10, marginTop: step > 1 ? 20 : 0 }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="modal-title" style={{ fontSize: 15, marginBottom: 6, textAlign: "center" }}>
          Promjena imena / Name Change
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: s === step ? "#c2410c" : s < step ? "#22c55e" : "#ddd",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* ── STEP 1: Age selection ── */}
        {step === 1 && (
          <>
            {/* Warning */}
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
              padding: "10px 14px", marginBottom: 14, textAlign: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b" }}>PAŽNJA / WARNING</span>
              </div>
              <div style={{ fontSize: 10, color: "#b91c1c", lineHeight: 1.5 }}>
                Ime na karti se može promijeniti samo <strong>JEDNOM</strong>!<br />
                Ova akcija je nepovratna!<br />
                <span style={{ color: "#999", fontSize: 9 }}>The name can only be changed ONCE. This is irreversible!</span>
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #fecaca", fontSize: 9, color: "#991b1b", lineHeight: 1.5 }}>
                Sa kartom može ući samo osoba čije ime odgovara ličnom dokumentu.<br />
                <span style={{ color: "#999" }}>Only the person whose name matches a valid ID may enter.</span>
              </div>
            </div>

            {/* Current name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 4 }}>
                Trenutno ime / Current name
              </label>
              <div style={{ padding: "8px 12px", background: "#f5f5f5", borderRadius: 8, fontSize: 14, color: "#666", fontWeight: 500 }}>
                {currentName}
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: "#333", textAlign: "center", marginBottom: 10 }}>
              Za koga mijenjate ime?<br />
              <span style={{ fontSize: 10, color: "#999" }}>Who is the ticket for?</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => { setPersonType("adult"); setStep(2); }}
                style={{
                  padding: "14px 8px", borderRadius: 10, border: "2px solid #e5e7eb",
                  background: "#fff", cursor: "pointer", textAlign: "center",
                  WebkitAppearance: "none" as any,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 6px" }}>
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Punoljetno</div>
                <div style={{ fontSize: 9, color: "#999" }}>Adult (18+)</div>
              </button>
              <button
                onClick={() => { setPersonType("minor"); setStep(2); }}
                style={{
                  padding: "14px 8px", borderRadius: 10, border: "2px solid #e5e7eb",
                  background: "#fff", cursor: "pointer", textAlign: "center",
                  WebkitAppearance: "none" as any,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 6px" }}>
                  <path d="M16 21v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1" />
                  <circle cx="10" cy="8" r="3" />
                  <path d="M20 8v6M23 11h-6" />
                </svg>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Maloljetno</div>
                <div style={{ fontSize: 9, color: "#999" }}>Minor (&lt;18)</div>
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #ddd",
                background: "#f5f5f5", color: "#666", fontSize: 12, fontWeight: 600,
                cursor: "pointer", WebkitAppearance: "none" as any,
              }}
            >
              Otkaži / Cancel
            </button>
          </>
        )}

        {/* ── STEP 2a: Adult — Document scan ── */}
        {step === 2 && personType === "adult" && (
          <>
            {!ocrResult ? (
              <>
                <div style={{ fontSize: 12, color: "#444", textAlign: "center", marginBottom: 14, lineHeight: 1.5 }}>
                  Skenirajte vaš lični dokument<br />
                  <span style={{ fontSize: 10, color: "#999" }}>Scan your ID document</span>
                </div>

                {/* Document type picker */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {(["id_card", "passport"] as const).map((dt) => (
                    <button
                      key={dt}
                      onClick={() => setDocumentType(dt)}
                      style={{
                        padding: "10px 8px", borderRadius: 8,
                        border: `2px solid ${documentType === dt ? "#c2410c" : "#e5e7eb"}`,
                        background: documentType === dt ? "#fff7ed" : "#fff",
                        cursor: "pointer", fontSize: 11, fontWeight: 600,
                        color: documentType === dt ? "#c2410c" : "#666",
                        WebkitAppearance: "none" as any,
                      }}
                    >
                      {dt === "id_card" ? "Lična karta / ID Card" : "Pasoš / Passport"}
                    </button>
                  ))}
                </div>

                {/* Open camera button */}
                <button
                  onClick={() => setScannerOpen(true)}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 10, border: "none",
                    background: "#c2410c", color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    WebkitAppearance: "none" as any,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Otvori kameru / Open Camera
                </button>
              </>
            ) : (
              <>
                {/* OCR result display */}
                <div style={{
                  background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
                  padding: "14px", marginBottom: 14, textAlign: "center",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 8px" }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#16a34a", marginBottom: 4 }}>
                    Dokument skeniran / Document scanned
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#111", letterSpacing: 0.5 }}>
                    {getOcrFullName(ocrResult)}
                  </div>
                  {ocrResult.documentNumber && (
                    <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                      Br. dokumenta: {ocrResult.documentNumber}
                    </div>
                  )}
                </div>

                {/* Rescan option */}
                <button
                  onClick={() => setOcrResult(null)}
                  style={{
                    width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #ddd",
                    background: "#f9f9f9", color: "#888", fontSize: 10, fontWeight: 600,
                    cursor: "pointer", marginBottom: 10, WebkitAppearance: "none" as any,
                  }}
                >
                  Skeniraj ponovo / Rescan
                </button>

                {/* Confirm */}
                <button
                  onClick={handleAdultConfirm}
                  disabled={isLoading}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 10, border: "none",
                    background: isLoading ? "#ddd" : "#c2410c", color: isLoading ? "#999" : "#fff",
                    fontSize: 13, fontWeight: 700, cursor: isLoading ? "default" : "pointer",
                    WebkitAppearance: "none" as any,
                  }}
                >
                  {isLoading ? "Čuvam..." : "Potvrdi promjenu / Confirm"}
                </button>
              </>
            )}
          </>
        )}

        {/* ── STEP 2b: Minor — Enter child name + scan guardian document ── */}
        {step === 2 && personType === "minor" && (
          <>
            {/* Child name input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 4 }}>
                Ime i prezime djeteta / Child's full name
              </label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Unesite ime i prezime djeteta"
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: "2px solid #e5e7eb", fontSize: 13, fontWeight: 500,
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#c2410c")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            {/* Guardian document scan section */}
            {!guardianOcrResult ? (
              <>
                <div style={{
                  background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
                  padding: "10px 14px", marginBottom: 14, textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#1d4ed8", lineHeight: 1.5 }}>
                    Roditelj mora skenirati svoj lični dokument<br />
                    <span style={{ color: "#93c5fd", fontSize: 9 }}>Parent/guardian must scan their ID document</span>
                  </div>
                </div>

                {/* Document type picker */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {(["id_card", "passport"] as const).map((dt) => (
                    <button
                      key={dt}
                      onClick={() => setGuardianDocType(dt)}
                      style={{
                        padding: "10px 8px", borderRadius: 8,
                        border: `2px solid ${guardianDocType === dt ? "#c2410c" : "#e5e7eb"}`,
                        background: guardianDocType === dt ? "#fff7ed" : "#fff",
                        cursor: "pointer", fontSize: 11, fontWeight: 600,
                        color: guardianDocType === dt ? "#c2410c" : "#666",
                        WebkitAppearance: "none" as any,
                      }}
                    >
                      {dt === "id_card" ? "Lična karta / ID Card" : "Pasoš / Passport"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setGuardianScannerOpen(true)}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 10, border: "none",
                    background: "#c2410c", color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    WebkitAppearance: "none" as any,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Skeniraj dokument roditelja
                </button>
              </>
            ) : (
              <>
                {/* Guardian OCR result */}
                <div style={{
                  background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
                  padding: "14px", marginBottom: 10, textAlign: "center",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 8px" }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#16a34a", marginBottom: 4 }}>
                    Roditelj verifikovan / Guardian verified
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>
                    {getOcrFullName(guardianOcrResult)}
                  </div>
                </div>

                {/* Summary */}
                <div style={{ background: "#f9f9f9", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 11 }}>
                  <div style={{ color: "#888", fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Ime na karti / Name on ticket</div>
                  <div style={{ fontWeight: 700, color: "#111", fontSize: 14 }}>{childName}</div>
                  <div style={{ color: "#888", fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginTop: 6, marginBottom: 2 }}>Roditelj / Parent</div>
                  <div style={{ fontWeight: 600, color: "#1d4ed8", fontSize: 12 }}>{getOcrFullName(guardianOcrResult)}</div>
                </div>

                {/* Rescan */}
                <button
                  onClick={() => setGuardianOcrResult(null)}
                  style={{
                    width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #ddd",
                    background: "#f9f9f9", color: "#888", fontSize: 10, fontWeight: 600,
                    cursor: "pointer", marginBottom: 10, WebkitAppearance: "none" as any,
                  }}
                >
                  Skeniraj ponovo / Rescan
                </button>

                <button
                  onClick={handleMinorConfirm}
                  disabled={isLoading || !childName.trim()}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 10, border: "none",
                    background: (isLoading || !childName.trim()) ? "#ddd" : "#c2410c",
                    color: (isLoading || !childName.trim()) ? "#999" : "#fff",
                    fontSize: 13, fontWeight: 700,
                    cursor: (isLoading || !childName.trim()) ? "default" : "pointer",
                    WebkitAppearance: "none" as any,
                  }}
                >
                  {isLoading ? "Čuvam..." : "Potvrdi promjenu / Confirm"}
                </button>
              </>
            )}
          </>
        )}
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
}: {
  qrCode: string | null;
  posterUrl: string | null;
  posterLink: string | null;
  used: boolean;
}) {
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!posterUrl || !qrCode) return;

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
  }, [posterUrl, qrCode]);

  if (!qrCode) {
    return (
      <div className="qr-container">
        <div className="qr-placeholder">
          <span>QR kod nije dostupan</span>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-container">
      <div className={`qr-flipper ${showQr ? "flipped" : ""}`}>
        {/* Poster sponzora - prednja strana (prikazuje se prvo) */}
        <div className="qr-front">
          {posterUrl ? (
            posterLink ? (
              <a href={posterLink} target="_blank" rel="noopener noreferrer" className="poster-link">
                <img src={posterUrl} alt="Sponsor" className="qr-poster" />
              </a>
            ) : (
              <img src={posterUrl} alt="Sponsor" className="qr-poster" />
            )
          ) : (
            <QRCodeSVG value={qrCode} size={200} level="M" className="qr-code" />
          )}
        </div>

        {/* QR Code - zadnja strana */}
        <div className="qr-back">
          <QRCodeSVG value={qrCode} size={200} level="M" className="qr-code" />
        </div>
      </div>

      {used && <div className="used-stamp">Iskorišteno</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TICKET CARD COMPONENT - NEW DESIGN
// ═══════════════════════════════════════════════════════════════════════════

const FSCG_RED = "#e10714";
const FSCG_YELLOW = "#ffca00";
const FONT_OSWALD = "'Inter', sans-serif";

type Lang = "me" | "en";

// Translate data values (tribune, sector, venue names, etc.) to English
const dataTranslations: Record<string, string> = {
  // Tribine / Stands
  "sjever": "North", "jug": "South", "istok": "East", "zapad": "West",
  // Slobodno sjeđenje
  "slobodno sjeđenje": "Free seating", "slobodno sjedenje": "Free seating",
  "slobodno": "Free seating",
  // Lokacije / Venues
  "gradski stadion": "City Stadium", "stadion pod goricom": "Stadion pod Goricom",
  // Kategorije
  "galerija": "Gallery",
  // Ulazi
  "ulaz": "Entrance",
};

function translateData(value: string, lang: Lang): string {
  if (lang === "me" || !value) return value;
  // Try exact match (case-insensitive)
  const lower = value.toLowerCase().trim();
  if (dataTranslations[lower]) return dataTranslations[lower];
  // Try partial replacements for compound values like "Galerija Sektor A"
  let result = value;
  for (const [me, en] of Object.entries(dataTranslations)) {
    const regex = new RegExp(me, "gi");
    result = result.replace(regex, en);
  }
  return result;
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
      <div style={{
        display: "inline-flex", borderRadius: 20, overflow: "hidden",
        border: "1px solid #ddd", background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        {(["me", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: "5px 14px", border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              textTransform: "uppercase",
              background: lang === l ? FSCG_RED : "transparent",
              color: lang === l ? "#fff" : "#888",
              transition: "all 0.2s ease",
              WebkitAppearance: "none" as any,
            }}
          >
            {l === "me" ? "🇲🇪 MNE" : "🇬🇧 ENG"}
          </button>
        ))}
      </div>
    </div>
  );
}

const T: Record<string, Record<Lang, string>> = {
  fscgLeft: { me: "Fudbalski Savez\nCrne Gore", en: "Football Association\nof Montenegro" },
  fscgRight: { me: "Football Association\nof Montenegro", en: "Football Association\nof Montenegro" },
  date: { me: "Datum", en: "Date" },
  kickoff: { me: "Početak", en: "Kick-off" },
  venue: { me: "Lokacija", en: "Venue" },
  zone: { me: "Zona", en: "Zone" },
  stand: { me: "Tribina", en: "Stand" },
  sector: { me: "Sektor", en: "Sector" },
  row: { me: "Red", en: "Row" },
  seat: { me: "Sjedište", en: "Seat" },
  entrance: { me: "Ulaz", en: "Entrance" },
  freeSeating: { me: "Slobodno sjeđenje", en: "Free seating" },
  view: { me: "Pogled", en: "View" },
  holder: { me: "Posjednik", en: "Holder" },
  price: { me: "Cijena", en: "Price" },
  forwarded: { me: "Proslijeđena", en: "Forwarded" },
  parent: { me: "Roditelj", en: "Parent" },
  buyer: { me: "Kupac", en: "Buyer" },
  valid: { me: "Validna", en: "Valid" },
  used: { me: "Iskorištena", en: "Used" },
  usedStamp: { me: "Iskorišteno", en: "Used" },
  usedTime: { me: "Vrijeme korištenja", en: "Time used" },
  important: { me: "Važno", en: "Important" },
  noScreenshot: { me: "Screenshot karte ne važi!", en: "Screenshot of the ticket is not valid!" },
  bringId: { me: "Ponesite identifikacioni dokument!", en: "Bring a valid ID document!" },
  share: { me: "Podijeli", en: "Share" },
  checkIn: { me: "Check In", en: "Check In" },
  changeName: { me: "Promijeni ime", en: "Change Name" },
  clickClose: { me: "Kliknite za zatvaranje", en: "Tap to close" },
  qrNotAvail: { me: "QR kod nije dostupan", en: "QR code not available" },
};

function extractTribune(category: string): string {
  if (!category) return "";
  const directions = ["sjever", "jug", "istok", "zapad", "north", "south", "east", "west", "vip"];
  const lower = category.toLowerCase();
  for (const dir of directions) {
    if (lower.startsWith(dir)) return dir.toUpperCase();
  }
  return category.toUpperCase();
}

function getTribuneColor(tribune: string): string {
  const t = tribune.toUpperCase();
  if (t.includes("SJEVER") || t.includes("NORTH")) return "#1565C0";
  if (t.includes("ISTOK") || t.includes("EAST")) return "#2E7D32";
  if (t.includes("ZAPAD") || t.includes("WEST")) return "#E65100";
  if (t.includes("VIP")) return "#B8860B";
  return FSCG_RED; // JUG / default
}

function HeroBackground() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      viewBox="0 0 360 180"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height="180" fill="url(#glow)" />
      <ellipse cx="180" cy="240" rx="240" ry="115" fill="none" stroke={FSCG_YELLOW} strokeWidth="1.5" strokeOpacity="0.18" />
      <ellipse cx="180" cy="240" rx="190" ry="90" fill="none" stroke={FSCG_YELLOW} strokeWidth="1" strokeOpacity="0.13" />
      <ellipse cx="180" cy="240" rx="140" ry="65" fill="none" stroke={FSCG_YELLOW} strokeWidth="0.8" strokeOpacity="0.1" />
    </svg>
  );
}

function TearLine() {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#ffffff", overflow: "visible", position: "relative", zIndex: 1 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#e8e8e8", flexShrink: 0, marginLeft: -11 }} />
      <div style={{ flex: 1, height: 1, background: "repeating-linear-gradient(90deg, #ccc 0, #ccc 6px, transparent 6px, transparent 12px)" }} />
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#e8e8e8", flexShrink: 0, marginRight: -11 }} />
    </div>
  );
}

function TicketCard({
  ticket,
  formattedDate,
  formattedTime,
  posterUrl,
  posterLink,
  onShare,
  onCheckin,
  onNameChange,
  onSaveTicket,
  isSessionView = false,
  fwdLevel = 0,
  lang = "me",
}: {
  ticket: Ticket;
  formattedDate: string;
  formattedTime: string;
  posterUrl: string | null;
  posterLink: string | null;
  onShare: (ticket: Ticket) => void;
  onCheckin: (ticket: Ticket) => void;
  onNameChange: (ticket: Ticket) => void;
  onSaveTicket?: (ticket: Ticket) => void;
  isSessionView?: boolean;
  fwdLevel?: number;
  lang?: Lang;
}) {
  const t = (key: string) => T[key]?.[lang] || T[key]?.["me"] || key;
  const td = (val: string) => translateData(val, lang);
  const [infoOpen, setInfoOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const used = isTicketUsed(ticket);
  // Forwarded = this viewer already forwarded the ticket to someone else
  // For recipients (fwdLevel > 0): forwarded only if forwardCount surpassed their level
  // For original buyer (fwdLevel === 0 via sessionId): forwarded if forwardCount > 0 or nameChangeData says so
  // For ticketId links without fwd param (fwdLevel === 0 but no sessionId): NOT forwarded — they are the recipient
  const isForwarded = isSessionView
    ? (ticket.forwardCount || 0) > 0 || (ticket.nameChangeData?.type === "forward")
    : (ticket.forwardCount || 0) > fwdLevel;
  // Invalid = token mismatch (another device already claimed this ticket at this fwd level)
  const isInvalidFwd = !!(ticket as any)._tokenMismatch;

  let sektor = "—";
  let red = "—";
  let sjediste = "—";
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
    usedTimeDisplay = ticket.time ? `${ticket.checkTime} ${ticket.time}` : ticket.checkTime;
  }

  const venue = ticket.Lokacija || "TBA";
  const showQr = !!ticket.qrCodeRaw;
  const isSaved = !!(ticket.viewerTokens as any)?.saved;
  const tribune = extractTribune(ticket.category || "");
  const tribuneColor = getTribuneColor(tribune);
  const priceDisplay = `${parseFloat(ticket.price || "0").toFixed(2)} ${(ticket.Valuta || "EUR").toUpperCase()}`;

  // Split event name into home/away if it contains "vs"
  const eventName = ticket.eventName || "";
  const vsMatch = eventName.match(/^(.+?)\s+(?:vs|-)\s+(.+)$/i);
  const homeTeam = vsMatch ? vsMatch[1].trim() : eventName;
  const awayTeam = vsMatch ? vsMatch[2].trim() : "";

  return (
    <div
      data-ticket-id={ticket.ticketId || ticket.id}
      data-qr-raw={ticket.qrCodeRaw || ""}
      style={{
        width: "100%",
        maxWidth: 400,
        borderRadius: 20,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
      }}
    >
      {/* ── HERO ── */}
      <div style={{ background: FSCG_RED, position: "relative", overflow: "hidden", padding: "18px 20px 16px" }}>
        <HeroBackground />
        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 6 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: FONT_OSWALD, fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 0.4, display: "block", lineHeight: 1.2, whiteSpace: "pre-line" }}>
                {t("fscgLeft")}
              </span>
            </div>
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <img
                src="https://hvpytasddzeprgqkwlbu.supabase.co/storage/v1/object/public/razno/savezzz.png"
                alt="FSCG"
                style={{ width: 72, height: 72, objectFit: "contain" }}
              />
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <span style={{ fontFamily: FONT_OSWALD, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.4, display: "block", lineHeight: 1.2, whiteSpace: "pre-line" }}>
                {t("fscgRight")}
              </span>
            </div>
          </div>
          {/* spacer */}
          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.2)", marginBottom: 14 }} />
          {/* VS block */}
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            {awayTeam ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ fontFamily: FONT_OSWALD, fontSize: 17, fontWeight: 700, textTransform: "uppercase", color: "#fff", lineHeight: 1.1, flex: 1, textAlign: "left" }}>
                  {homeTeam}
                </div>
                <div style={{ background: FSCG_YELLOW, color: "#000", fontFamily: FONT_OSWALD, fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 4, flexShrink: 0 }}>
                  VS
                </div>
                <div style={{ fontFamily: FONT_OSWALD, fontSize: 17, fontWeight: 700, textTransform: "uppercase", color: "#fff", lineHeight: 1.1, flex: 1, textAlign: "right" }}>
                  {awayTeam}
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: FONT_OSWALD, fontSize: 17, fontWeight: 700, textTransform: "uppercase", color: "#fff", lineHeight: 1.2 }}>
                {eventName}
              </div>
            )}
          </div>
          {/* Meta strip */}
          <div style={{ display: "flex", paddingTop: 12 }}>
            {[
              { lbl: t("date"), val: formattedDate, align: "left" as const },
              { lbl: t("kickoff"), val: formattedTime, align: "center" as const },
              { lbl: t("venue"), val: td(venue), align: "right" as const },
            ].map(({ lbl, val, align }, i) => (
              <div key={i} style={{
                flex: 1, textAlign: align,
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.2)" : "none",
                paddingLeft: i > 0 ? 10 : 0,
                paddingRight: i < 2 ? 10 : 0,
              }}>
                <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 3, whiteSpace: "nowrap" }}>
                  {lbl}
                </span>
                <span style={{ fontFamily: FONT_OSWALD, fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1, whiteSpace: "nowrap" }}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TEAR LINE ── */}
      <TearLine />

      {/* ── QR + TRIBINA ── */}
      <div style={{ background: "#f7f7f7", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
        <div style={{ background: "#fff", borderRadius: 10, padding: 8, border: "1.5px solid #eee", flexShrink: 0, position: "relative" }}>
          {showQr ? (
              <div
                style={{ width: 118, height: 118, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
                onClick={() => setQrOpen(true)}
              >
                <QRCodeSVG value={ticket.qrCodeRaw} size={118} level="M" />
              </div>
          ) : (
            <div style={{ width: 118, height: 118, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f7ff", borderRadius: 6, fontSize: 11, color: "#666" }}>{t("qrNotAvail")}</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          {isFreeSeating ? (
            <>
              <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 1 }}>
                {t("zone")}
              </span>
              <div style={{ fontFamily: FONT_OSWALD, fontSize: 28, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: tribuneColor, lineHeight: 1, marginBottom: 6 }}>
                {td(tribune || ticket.category || (lang === "en" ? "FREE" : "SLOBODNO"))}
              </div>
              <div style={{ fontSize: 11, color: "#111", fontWeight: 500 }}>{t("freeSeating")}</div>
              {ticket.entrance && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 1 }}>
                    {t("entrance")}
                  </span>
                  <span style={{ fontFamily: FONT_OSWALD, fontSize: 14, fontWeight: 600, color: "#111" }}>{td(ticket.entrance)}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 1 }}>
                {t("stand")}
              </span>
              <div style={{ fontFamily: FONT_OSWALD, fontSize: 28, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: tribuneColor, lineHeight: 1, marginBottom: 10 }}>
                {td(tribune || sektor)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 1 }}>
                      {t("sector")}
                    </span>
                    <span style={{ fontFamily: FONT_OSWALD, fontSize: 14, fontWeight: 600, color: "#111" }}>{td(sektor)}</span>
                  </div>
                  {ticket.View && (
                    <button
                      onClick={() => setViewOpen(!viewOpen)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 28, height: 28, borderRadius: "50%", border: "1px solid #ddd",
                        background: viewOpen ? "#f0f0f0" : "#fff", cursor: "pointer",
                        padding: 0, WebkitAppearance: "none" as any, marginTop: 8,
                      }}
                      title="Pogled / View"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  )}
                </div>
                {viewOpen && ticket.View && (
                  <div style={{
                    background: "#f8f8f8", border: "1px solid #e5e5e5", borderRadius: 8,
                    padding: "6px 10px", marginTop: 2,
                  }}>
                    <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 1 }}>
                      {t("view")}
                    </span>
                    <span style={{ fontFamily: FONT_OSWALD, fontSize: 14, fontWeight: 600, color: "#111" }}>{td(ticket.View)}</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 14 }}>
                  <div>
                    <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 1 }}>
                      {t("row")}
                    </span>
                    <span style={{ fontFamily: FONT_OSWALD, fontSize: 14, fontWeight: 600, color: "#111" }}>{red}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 1 }}>
                      {t("seat")}
                    </span>
                    <span style={{ fontFamily: FONT_OSWALD, fontSize: 14, fontWeight: 600, color: "#111" }}>{sjediste}</span>
                  </div>
                  {ticket.entrance && (
                    <div>
                      <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 1 }}>
                        {t("entrance")}
                      </span>
                      <span style={{ fontFamily: FONT_OSWALD, fontSize: 14, fontWeight: 600, color: "#111" }}>{td(ticket.entrance)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        {used && (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%) rotate(-25deg)",
            fontSize: 22, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase",
            color: "rgba(220, 38, 38, 0.9)", backgroundColor: "rgba(255,255,255,0.85)",
            padding: "6px 14px", border: "4px solid rgba(220, 38, 38, 0.8)", borderRadius: 6, zIndex: 10, whiteSpace: "nowrap",
          }}>
            {t("usedStamp")}
          </div>
        )}
      </div>

      {/* ── BOTTOM ── */}
      <div style={{ background: "#fff", padding: "14px 20px 20px", borderTop: "1px solid #ececec" }}>
        {used && usedTimeDisplay && (
          <div style={{ textAlign: "center", fontSize: 12, color: "#b91c1c", fontWeight: 500, marginBottom: 10 }}>
            {t("usedTime")}: {usedTimeDisplay}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 2 }}>{t("holder")}</span>
            <div style={{ fontFamily: FONT_OSWALD, fontSize: 16, fontWeight: 600, color: "#111", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{ticket.customerName || ""}</div>
            {ticket.nameChangeUsed && (
              <>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#eff6ff", color: "#1d4ed8", fontSize: 8, fontWeight: 600, letterSpacing: 0.5, padding: "2px 8px", borderRadius: 12, border: "1px solid #bfdbfe", textTransform: "uppercase", marginBottom: 2 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
                  </svg>
                  {t("forwarded")}
                </div>
                {ticket.nameChangeData?.type === "minor" && ticket.nameChangeData?.guardian && (
                  <div style={{ fontSize: 9, color: "#7c3aed", fontWeight: 600, marginTop: 3 }}>
                    {t("parent")}: {(ticket.nameChangeData.guardian.surname || "") + " " + (ticket.nameChangeData.guardian.givenNames || "")}
                  </div>
                )}
                {ticket.originalCustomerName && (
                  <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>{t("buyer")}: {ticket.originalCustomerName}</div>
                )}
              </>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 2 }}>{t("price")}</span>
            <div style={{ fontFamily: FONT_OSWALD, fontSize: 20, fontWeight: 700, color: "#111" }}>{priceDisplay}</div>
          </div>
        </div>

        {/* ── STATUS + VAŽNO ROW ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          {!used ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e8f5e9", color: "#2e7d32", fontSize: 9, fontWeight: 600, letterSpacing: 1, padding: "3px 8px", borderRadius: 20, border: "1px solid #a5d6a7", textTransform: "uppercase" }}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              {t("valid")}
            </div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f3f4f6", color: "#4b5563", fontSize: 9, fontWeight: 600, letterSpacing: 1, padding: "3px 8px", borderRadius: 20, border: "1px solid #d1d5db", textTransform: "uppercase" }}>
              {t("used")}
            </div>
          )}
          <button
            onClick={() => setInfoOpen(!infoOpen)}
            className="fscg-info-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20,
              background: infoOpen ? "#fef2f2" : "#fff7ed",
              border: `1px solid ${infoOpen ? "#fca5a5" : "#fed7aa"}`,
              color: infoOpen ? "#b91c1c" : "#c2410c",
              fontSize: 9, fontWeight: 600, letterSpacing: 0.3,
              cursor: "pointer", transition: "all 0.3s ease",
              WebkitAppearance: "none" as any,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {t("important")}
            <svg
              width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: "transform 0.3s ease", transform: infoOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* ── INFO POPUP ── */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: infoOpen ? 200 : 0,
            opacity: infoOpen ? 1 : 0,
            transition: "max-height 0.4s ease, opacity 0.3s ease, margin 0.3s ease",
            marginBottom: infoOpen ? 12 : 0,
          }}
        >
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <line x1="9" y1="15" x2="9" y2="9" />
                <line x1="15" y1="15" x2="15" y2="9" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#991b1b", lineHeight: 1.4 }}>
                {t("noScreenshot")}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M3 10h18" />
                <circle cx="7" cy="15" r="0.5" fill="#dc2626" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#991b1b", lineHeight: 1.4 }}>
                {t("bringId")}
              </span>
            </div>
          </div>
        </div>

        {/* TEMPORARILY DISABLED: isInvalidFwd message */}
        {!used && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => onShare(ticket)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 6px", borderRadius: 8, backgroundColor: "#f0f0f0", color: "#444", border: "1px solid #ddd", fontFamily: FONT_OSWALD, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", WebkitAppearance: "none" as any }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#444" stroke="#444" strokeWidth="1"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              {t("share")}
            </button>
            <button
              onClick={() => onCheckin(ticket)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 6px", borderRadius: 8, backgroundColor: FSCG_RED, color: "#fff", border: `1px solid ${FSCG_RED}`, fontFamily: FONT_OSWALD, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", WebkitAppearance: "none" as any }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              {t("checkIn")}
            </button>
          </div>
        )}
        {/* TEMPORARILY DISABLED: forwarded-only share button (now always shown above) */}
        {!used && (!ticket.nameChangeUsed || ticket.nameChangeData?.type === "forward") && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #e5e7eb" }}>
            <button
              onClick={() => onNameChange(ticket)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 6px", borderRadius: 10, width: "100%",
                background: "#fff", color: "#b91c1c",
                border: "1.5px solid #fca5a5",
                fontFamily: FONT_OSWALD, fontSize: 11, fontWeight: 600,
                letterSpacing: 1, textTransform: "uppercase",
                cursor: "pointer", WebkitAppearance: "none" as any,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <line x1="17" y1="3" x2="21" y2="7" />
              </svg>
              {t("changeName")}
            </button>
          </div>
        )}
        {/* ── SNIMI KARTU ── */}
        {!used && showQr && onSaveTicket && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #e5e7eb" }}>
            <button
              onClick={() => onSaveTicket(ticket)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "12px 6px", borderRadius: 10, width: "100%",
                background: FSCG_RED, color: "#fff",
                border: "none",
                fontFamily: FONT_OSWALD, fontSize: 12, fontWeight: 600,
                letterSpacing: 1, textTransform: "uppercase",
                cursor: "pointer", WebkitAppearance: "none" as any,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isSaved
                ? (lang === "en" ? "DOWNLOAD AGAIN" : "PREUZMI PONOVO")
                : (lang === "en" ? "SAVE TICKET" : "SNIMI KARTU")}
            </button>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: "#f7f7f7", borderTop: "1px solid #eee", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 8, color: "#aaa" }}>www.fscg.me</span>
        <span style={{ fontSize: 8, fontWeight: 600, color: "#888" }}>e-tickets</span>
        <span style={{ fontSize: 8, color: "#aaa" }}>fscg_official</span>
      </div>

      {/* ── QR POPUP ── */}
      {qrOpen && showQr && (
        <div
          onClick={() => setQrOpen(false)}
          style={{
            position: "absolute", inset: 0, zIndex: 50,
            background: "rgba(255,255,255,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 20, cursor: "pointer",
          }}
        >
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.15)", border: "1px solid #eee", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <QRCodeSVG value={ticket.qrCodeRaw} size={250} level="M" />
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: "#888" }}>{t("clickClose")}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function FscgTicketDisplay() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const ticketId = searchParams.get("ticketId");
  const fwdLevel = parseInt(searchParams.get("fwd") || "0", 10);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterLink, setPosterLink] = useState<string | null>(null);

  // Layout demo state
  const layoutParam = searchParams.get("layout") as "wallet" | "carousel" | "tabs" | null;
  // Wallet layout only for sessionId (original buyer), NOT for ticketId links (recipients)
  const isRecipientView = !sessionId && !!ticketId;
  const layoutMode = layoutParam || (tickets.length > 1 && !isRecipientView ? "wallet" : null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [tabIdx, setTabIdx] = useState(0);
  const [selectedForShare, setSelectedForShare] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

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

  // Language state
  const [lang, setLang] = useState<Lang>("me");

  // Name change state
  const [nameChangeModalOpen, setNameChangeModalOpen] = useState(false);
  const [nameChangeTicket, setNameChangeTicket] = useState<Ticket | null>(null);
  const [nameChangeLoading, setNameChangeLoading] = useState(false);

  // Save ticket state
  const [savePassTicket, setSavePassTicket] = useState<Ticket | null>(null);
  const [saveWarningOpen, setSaveWarningOpen] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const passRef = useRef<HTMLDivElement>(null);

  // HMAC verifikacija se sada radi na backendu (verify-qr edge function)

  // Forsiranje light mode — dark mode telefona ne smije uticati na prikaz karata
  useEffect(() => {
    const meta = document.querySelector('meta[name="color-scheme"]') || document.createElement("meta");
    meta.setAttribute("name", "color-scheme");
    meta.setAttribute("content", "light only");
    if (!meta.parentNode) document.head.appendChild(meta);
    document.documentElement.style.colorScheme = "light";
    document.documentElement.style.backgroundColor = "#f5f5f5";
    document.body.style.colorScheme = "light";
    document.body.style.backgroundColor = "#f5f5f5";
    document.body.style.color = "#111";
    return () => {
      if (meta.parentNode) meta.parentNode.removeChild(meta);
    };
  }, []);

  // Fetch poster2 iz Sponzori tabele
  useEffect(() => {
    const fetchPoster = async () => {
      try {
        const { data, error } = await supabase.from("Sponzori").select("poster2, linkPosterKarte").limit(1).maybeSingle();

        if (!error && data?.poster2) {
          setPosterUrl(data.poster2);
          setPosterLink(data.linkPosterKarte || null);
          console.log("📸 Poster2 učitan:", data.poster2, "Link:", data.linkPosterKarte);
        }
      } catch (err) {
        console.error("Greška pri učitavanju postera:", err);
      }
    };

    fetchPoster();
  }, []);

  const FULL_SELECT = "id, ticketId, eventId, eventName, eventDate, eventTime, Lokacija, seatId, category, entrance, View, price, Valuta, customerName, \"Customer Email\", \"QR Code\", qrCodeRaw, isUsed, checkTime, time, status, document_type, document_number, document_image_url, originalCustomerName, nameChangeUsed, nameChangedAt, nameChangeData, forwardCount, viewerTokens";

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
        const ticketIds = ticketId.split(",").map(id => id.trim()).filter(Boolean).slice(0, 50);
        if (ticketIds.length > 1) {
          const result = await supabase.from("QRKarte").select(FULL_SELECT).in("ticketId", ticketIds);
          data = result.data as Ticket[] | null;
          fetchError = result.error;
        } else {
          let result = await supabase.from("QRKarte").select(FULL_SELECT).eq("ticketId", ticketIds[0]);
          if (!result.data || result.data.length === 0) {
            result = await supabase.from("QRKarte").select(FULL_SELECT).eq("id", ticketIds[0]);
          }
          data = result.data as Ticket[] | null;
          fetchError = result.error;
        }
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
    const shareUrl = `${window.location.origin}/fscg-karta?ticketId=${ticket.ticketId}`;

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

  // Handle forward from wallet view — share link + mark as forwarded in DB
  const handleForward = async (ticket: Ticket) => {
    const currentCount = ticket.forwardCount || 0;

    const newCount = currentCount + 1;
    const shareUrl = `${window.location.origin}/fscg-karta?ticketId=${ticket.ticketId}&fwd=${newCount}`;
    const tribune = extractTribune(ticket.category || "");
    const shareText = `${ticket.eventName || "Utakmica"}${tribune ? ` — ${tribune}` : ""}\n\n${shareUrl}`;

    // 1. Share link
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({
          title: ticket.eventName || "Moja karta",
          text: shareText,
        });
        shared = true;
      } catch (err) {
        console.log("Share cancelled");
        return; // user cancelled — don't mark as forwarded
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      shared = true;
    }

    if (!shared) return;

    // 2. Mark as forwarded in DB + increment forwardCount
    try {
      const { error } = await supabase
        .from("QRKarte")
        .update({
          nameChangeUsed: true,
          nameChangedAt: new Date().toISOString(),
          nameChangeData: { type: "forward", forwardedAt: new Date().toISOString(), forwardLevel: newCount },
          forwardCount: newCount,
        })
        .eq("id", ticket.id);

      if (error) {
        console.error("Forward DB update error:", error);
        toast.success("Link podijeljen!");
        return;
      }

      // 3. Update local state
      setTickets(prev => prev.map(t =>
        t.id === ticket.id
          ? { ...t, nameChangeUsed: true, nameChangedAt: new Date().toISOString(), nameChangeData: { type: "forward", forwardedAt: new Date().toISOString(), forwardLevel: newCount }, forwardCount: newCount }
          : t
      ));

      toast.success("Karta proslijeđena!");
    } catch (err) {
      console.error("Forward error:", err);
      toast.success("Link podijeljen!");
    }
  };

  // Handle multi-forward from wallet select mode
  const handleMultiForward = async (selectedIndices: Set<number>, sortedTickets: Ticket[]) => {
    const selected = Array.from(selectedIndices).sort().map(i => sortedTickets[i]).filter(Boolean);
    if (selected.length === 0) return;

    const eventName = selected[0].eventName || "Utakmica";
    // Each ticket: description + its own link, separated by blank line
    const ticketBlocks = selected.map((t, idx) => {
      const tribune = extractTribune(t.category || "");
      const pts = (t.seatId || "").split("-");
      const seat = pts.length === 3 ? `Red ${pts[1]}, Sjedište ${pts[2]}` : (t.seatId || "");
      const newCount = (t.forwardCount || 0) + 1;
      const url = `${window.location.origin}/fscg-karta?ticketId=${t.ticketId}&fwd=${newCount}`;
      return `${idx + 1}. ${tribune || "Karta"}${seat ? ` — ${seat}` : ""}\n${url}`;
    });
    const shareText = `${eventName}\n\n${ticketBlocks.join("\n\n")}`;

    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: eventName, text: shareText });
        shared = true;
      } catch { return; }
    } else {
      await navigator.clipboard.writeText(shareText);
      shared = true;
    }
    if (!shared) return;

    // Mark all as forwarded in DB + increment forwardCount
    for (const ticket of selected) {
      const newCount = (ticket.forwardCount || 0) + 1;
      try {
        await supabase.from("QRKarte").update({
          nameChangeUsed: true,
          nameChangedAt: new Date().toISOString(),
          nameChangeData: { type: "forward", forwardedAt: new Date().toISOString(), forwardLevel: newCount },
          forwardCount: newCount,
        }).eq("id", ticket.id);
      } catch (err) { console.error("Forward error:", err); }
    }

    // Update local state
    const selectedIds = new Set(selected.map(t => t.id));
    setTickets(prev => prev.map(t =>
      selectedIds.has(t.id) ? { ...t, nameChangeUsed: true, nameChangedAt: new Date().toISOString(), nameChangeData: { type: "forward" }, forwardCount: (t.forwardCount || 0) + 1 } : t
    ));

    toast.success(`${selected.length} karata proslijeđeno!`);
    setSelectedForShare(new Set());
    setSelectMode(false);
  };

  // Handle name change
  const handleNameChangeClick = (ticket: Ticket) => {
    setNameChangeTicket(ticket);
    setNameChangeModalOpen(true);
  };

  const handleNameChangeSubmit = async (payload: NameChangePayload) => {
    if (!nameChangeTicket) return;
    setNameChangeLoading(true);

    try {
      // Re-check from DB to prevent race conditions
      const { data: freshTicket } = await supabase
        .from("QRKarte")
        .select("nameChangeUsed")
        .eq("id", nameChangeTicket.id)
        .maybeSingle();

      if (freshTicket?.nameChangeUsed) {
        toast.error("Ime je već promijenjeno!");
        setNameChangeModalOpen(false);
        setNameChangeLoading(false);
        return;
      }

      // Build nameChangeData JSON for audit trail
      const nameChangeData = payload.type === "adult"
        ? {
            type: "adult",
            document: payload.document ? {
              documentType: payload.document.detectedDocumentType,
              documentNumber: payload.document.documentNumber,
              surname: payload.document.surname,
              givenNames: payload.document.givenNames,
              sex: payload.document.sex,
              expiryDate: payload.document.expiryDate,
              confidence: payload.document.confidence,
              detectedCountry: payload.document.detectedCountry,
            } : null,
            scannedAt: new Date().toISOString(),
          }
        : {
            type: "minor",
            childName: payload.newName,
            guardian: payload.guardianDocument ? {
              documentType: payload.guardianDocument.detectedDocumentType,
              documentNumber: payload.guardianDocument.documentNumber,
              surname: payload.guardianDocument.surname,
              givenNames: payload.guardianDocument.givenNames,
              sex: payload.guardianDocument.sex,
              expiryDate: payload.guardianDocument.expiryDate,
              confidence: payload.guardianDocument.confidence,
              detectedCountry: payload.guardianDocument.detectedCountry,
            } : null,
            scannedAt: new Date().toISOString(),
          };

      const { error: updateError } = await supabase
        .from("QRKarte")
        .update({
          originalCustomerName: nameChangeTicket.customerName,
          customerName: payload.newName,
          nameChangeUsed: true,
          nameChangedAt: new Date().toISOString(),
          nameChangeData,
        })
        .eq("id", nameChangeTicket.id);

      if (updateError) {
        console.error("Name change error:", updateError);
        toast.error("Greška pri promjeni imena.");
        setNameChangeLoading(false);
        return;
      }

      toast.success("Ime uspješno promijenjeno!");
      setNameChangeModalOpen(false);
      setNameChangeTicket(null);
      await fetchTickets();
    } catch (err) {
      console.error("Name change error:", err);
      toast.error("Došlo je do greške.");
    } finally {
      setNameChangeLoading(false);
    }
  };

  // Handle save ticket click — show warning first
  const handleSaveTicketClick = (ticket: Ticket) => {
    setSavePassTicket(ticket);
    setSaveWarningOpen(true);
  };

  // After user confirms warning — generate image immediately
  const handleSaveWarningConfirm = async () => {
    setSaveWarningOpen(false);
    setSavingImage(true);
    // Small delay for passRef to render (it renders hidden)
    await new Promise(r => setTimeout(r, 600));
    await handleDownloadPass();
  };

  // Convert external images in passRef to inline base64 to avoid CORS issues with toPng
  const inlineExternalImages = async () => {
    if (!passRef.current) return;
    const imgs = passRef.current.querySelectorAll("img[src^='http']");
    for (const img of Array.from(imgs)) {
      try {
        const res = await fetch((img as HTMLImageElement).src, { mode: "cors" });
        const blob = await res.blob();
        const reader = new FileReader();
        const b64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        (img as HTMLImageElement).src = b64;
      } catch { /* skip if CORS fails */ }
    }
  };

  // Generate and download the pass image
  const handleDownloadPass = useCallback(async () => {
    if (!passRef.current || !savePassTicket) return;
    setSavingImage(true);
    try {
      // Inline external images to avoid CORS taint
      await inlineExternalImages();
      await new Promise(r => setTimeout(r, 300));

      const dataUrl = await toPng(passRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        quality: 1,
      });

      // Show the generated image immediately
      setGeneratedImage(dataUrl);

      // Mark ticket as downloaded in DB
      try {
        const existing = savePassTicket.viewerTokens || {};
        await supabase.from("QRKarte").update({
          viewerTokens: { ...existing, saved: true, savedAt: new Date().toISOString() },
        }).eq("id", savePassTicket.id);
        setTickets(prev => prev.map(t =>
          t.id === savePassTicket.id
            ? { ...t, viewerTokens: { ...(t.viewerTokens || {}), saved: true, savedAt: new Date().toISOString() } }
            : t
        ));
      } catch (e) {
        console.error("DB save error:", e);
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Greška pri snimanju. Pokušajte ponovo.");
    } finally {
      setSavingImage(false);
    }
  }, [savePassTicket]);

  // Render save warning modal (shared across all layouts)
  const renderSaveWarningModal = () => {
    if (!saveWarningOpen || !savePassTicket) return null;
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "28px 22px", maxWidth: 360, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ fontFamily: FONT_OSWALD, fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#111" }}>
            {lang === "en" ? "IMPORTANT" : "VAŽNO"}
          </h3>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.5, marginBottom: 20 }}>
            {lang === "en"
              ? "At the entrance, you may be asked for an ID. If the ticket does not match your name and ID, entry is not possible."
              : "Na ulazu se može zatražiti lični dokument. Ako karta ne odgovara imenu i ličnom dokumentu, ulaz nije moguć."}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { setSaveWarningOpen(false); setSavePassTicket(null); }}
              style={{ flex: 1, padding: "12px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontFamily: FONT_OSWALD, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#666" }}
            >
              {lang === "en" ? "CANCEL" : "OTKAŽI"}
            </button>
            <button
              onClick={handleSaveWarningConfirm}
              style={{ flex: 1, padding: "12px 10px", borderRadius: 10, border: "none", background: FSCG_RED, color: "#fff", fontFamily: FONT_OSWALD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {lang === "en" ? "CONTINUE" : "NASTAVI"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render fullscreen pass (shared across all layouts)
  const renderFullscreenPass = () => {
    if (!savePassTicket || saveWarningOpen) return null;
    const t2 = savePassTicket;
    const vsMatch = (t2.eventName || "").match(/^(.+?)\s+(?:vs|-)\s+(.+)$/i);
    const home = vsMatch ? vsMatch[1].trim() : (t2.eventName || "");
    const away = vsMatch ? vsMatch[2].trim() : "";
    const tribune = extractTribune(t2.category || "");
    let pSektor = "—", pRed = "—", pSjediste = "—";
    const isFree = !t2.seatId || /slobodn/i.test(t2.seatId) || !t2.seatId.trim();
    if (!isFree) {
      const parts = t2.seatId.split("-");
      if (parts.length === 3) {
        pSektor = parts[0];
        pRed = parts[1];
        pSjediste = parts[2];
      } else {
        pSektor = t2.seatId;
      }
    }
    const entrance = t2.entrance || "";
    // Image generated — show fullscreen for long-press save
    if (generatedImage) {
      return (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9000, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Close button */}
          <button
            onClick={() => { setGeneratedImage(null); setSavePassTicket(null); }}
            style={{ position: "absolute", top: 16, left: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Instruction banner — centered, visible */}
          <div style={{
            marginTop: "max(env(safe-area-inset-top, 12px), 12px)",
            padding: "12px 20px", textAlign: "center",
            background: "rgba(255,255,255,0.12)", borderRadius: 14,
            maxWidth: 320, margin: "16px auto 12px",
          }}>
            {/* Finger press-and-hold animation */}
            <div style={{ position: "relative", width: 50, height: 60, margin: "0 auto 8px" }}>
              {/* Ripple effect (simulates press) */}
              <div style={{
                position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                width: 24, height: 24, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                animation: "ripple 2.5s ease-in-out infinite",
              }} />
              {/* Finger emoji */}
              <div style={{ fontSize: 36, animation: "fingerPress 2.5s ease-in-out infinite" }}>
                👇
              </div>
            </div>
            <div style={{ fontFamily: FONT_OSWALD, fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: 1, marginBottom: 4 }}>
              {lang === "en" ? "HOLD YOUR FINGER ON THE IMAGE" : "DRŽITE PRST NA SLICI"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
              {lang === "en"
                ? 'Then select "Save to Photos" or "Download image"'
                : 'Zatim izaberite "Sačuvaj sliku" ili "Preuzmi sliku"'}
            </div>
          </div>

          {/* The PNG image */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px 20px" }}>
            <img
              src={generatedImage}
              alt="Karta"
              style={{ maxWidth: "92vw", maxHeight: "75vh", borderRadius: 12, boxShadow: "0 4px 30px rgba(0,0,0,0.5)" }}
            />
          </div>

          <style>{`
            @keyframes fingerPress {
              0%, 100% { transform: translateY(0); }
              20% { transform: translateY(12px) scale(0.95); }
              40% { transform: translateY(12px) scale(0.95); }
              60% { transform: translateY(0); }
            }
            @keyframes ripple {
              0%, 60%, 100% { transform: translateX(-50%) scale(0); opacity: 0; }
              20% { transform: translateX(-50%) scale(1); opacity: 0.4; }
              40% { transform: translateX(-50%) scale(2.5); opacity: 0; }
            }
          `}</style>
        </div>
      );
    }

    // Pass HTML rendered offscreen for toPng generation + loading overlay
    return (
      <>
      {/* Loading overlay while generating */}
      {savingImage && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.3)", borderTop: "3px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontFamily: FONT_OSWALD, fontSize: 14, fontWeight: 600, color: "#fff", letterSpacing: 1 }}>
            {lang === "en" ? "GENERATING TICKET..." : "GENERISANJE KARTE..."}
          </span>
        </div>
      )}
      {/* Hidden offscreen pass for toPng — local logo avoids CORS */}
      <div style={{ position: "fixed", left: -9999, top: 0, zIndex: -1 }}>
        <div ref={passRef} style={{ width: 400, background: "#fff", borderRadius: 0, overflow: "hidden" }}>
          {/* Red header — logo centered */}
          <div style={{ background: FSCG_RED, padding: "24px 20px 18px", textAlign: "center" }}>
            <img src="/fscg-savez.png" alt="" crossOrigin="anonymous" style={{ width: 64, height: 64, objectFit: "contain", display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontFamily: FONT_OSWALD, fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: 4, textTransform: "uppercase" }}>DIGITALNA KARTA</div>
          </div>
          {/* Match info */}
          <div style={{ padding: "22px 20px 14px", textAlign: "center", borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 6 }}>
              <span style={{ fontFamily: FONT_OSWALD, fontSize: 22, fontWeight: 700, color: "#111" }}>{home}</span>
              <span style={{ background: FSCG_RED, color: "#fff", padding: "3px 10px", borderRadius: 4, fontFamily: FONT_OSWALD, fontSize: 11, fontWeight: 700 }}>VS</span>
              <span style={{ fontFamily: FONT_OSWALD, fontSize: 22, fontWeight: 700, color: "#111" }}>{away}</span>
            </div>
            <div style={{ fontSize: 13, color: "#777" }}>{formattedDate}  •  {formattedTime}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{t2.Lokacija || ""}</div>
          </div>
          {/* QR Code — centered, big */}
          <div style={{ padding: "20px 50px", display: "flex", justifyContent: "center" }}>
            {t2.qrCodeRaw ? (
              <QRCodeSVG value={t2.qrCodeRaw} size={280} level="M" includeMargin={false} />
            ) : t2["QR Code"] ? (
              <img src={t2["QR Code"]} alt="QR" style={{ width: 280, height: 280 }} crossOrigin="anonymous" />
            ) : null}
          </div>
          {/* Ticket details */}
          <div style={{ padding: "0 24px 18px", textAlign: "center" }}>
            <div style={{ fontFamily: FONT_OSWALD, fontSize: 26, fontWeight: 700, color: "#2e7d32", marginBottom: 8 }}>{tribune || t2.category}</div>
            <div style={{ fontFamily: FONT_OSWALD, fontSize: 15, color: "#333", marginBottom: 6 }}>
              {pSektor !== "—" && `${/sektor/i.test(pSektor) ? pSektor : `Sektor ${pSektor}`}  |  `}Red {pRed}  |  Sjedište {pSjediste}
            </div>
            {entrance && <div style={{ fontSize: 13, color: "#777", marginBottom: 8 }}>Ulaz: {entrance}</div>}
          </div>
          {/* Owner */}
          <div style={{ padding: "14px 24px", borderTop: "2px solid #f0f0f0", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>POSJEDNIK</div>
            <div style={{ fontFamily: FONT_OSWALD, fontSize: 20, fontWeight: 700, color: "#111" }}>{t2.customerName}</div>
          </div>
          {/* Warning */}
          <div style={{ margin: "0 18px 18px", background: "#fef9e7", border: "1px solid #f5e6b8", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
            <span style={{ fontSize: 11, color: "#8b6914", lineHeight: 1.5 }}>Na ulazu se može zatražiti lični dokument. Ako karta ne odgovara imenu i ličnom dokumentu, ulaz nije moguć.</span>
          </div>
          {/* Footer */}
          <div style={{ background: "#f5f5f5", borderTop: "1px solid #eee", padding: "10px 24px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 9, color: "#aaa" }}>www.fscg.me</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: "#999" }}>e-tickets</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </>
    );
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
      background: "rgba(225, 7, 20, 0.9)", padding: "6px 0", textAlign: "center",
    }}>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: 0.5 }}>
        {lang === "en" ? "Refreshing..." : "Osvježavanje..."}
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

  // Helper to extract team names for wallet/tab labels
  const getMatchLabel = (t: Ticket) => {
    const m = (t.eventName || "").match(/^(.+?)\s+vs\s+(.+)$/i);
    return m ? `vs ${m[2].trim()}` : (t.eventName || "Karta");
  };

  // ─── WALLET LAYOUT ───
  if (layoutMode === "wallet") {
    return (
      <div className="ticket-page">
        {refreshBanner}
        <div className="container">
          {/* Header */}
          <div style={{ padding: "28px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <img src="https://hvpytasddzeprgqkwlbu.supabase.co/storage/v1/object/public/razno/savezzz.png" alt="FSCG" style={{ width: 60, height: 60, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: FONT_OSWALD, fontSize: 22, fontWeight: 700, color: "#111", letterSpacing: 1, textTransform: "uppercase", lineHeight: 1 }}>
                {lang === "en" ? "My Tickets" : "Moje Karte"}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#111", marginTop: 4 }}>
                {tickets.length} {lang === "en" ? (tickets.length === 1 ? "ticket" : "tickets") : (tickets.length === 1 ? "ulaznica" : "ulaznice")}
              </div>
            </div>
          </div>
          {/* Action row: Proslijedi karte + Lang toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 10px", width: "100%", maxWidth: 400, margin: "0 auto" }}>
            {tickets.filter(t => !t.nameChangeUsed).length > 1 ? (
              <button
                onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedForShare(new Set()); }}
                style={{
                  padding: "8px 14px", borderRadius: 10, border: "none",
                  background: selectMode ? "#fef2f2" : "transparent", cursor: "pointer",
                  fontFamily: FONT_OSWALD, fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
                  color: selectMode ? FSCG_RED : FSCG_RED, textTransform: "uppercase",
                  WebkitAppearance: "none" as any, transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={FSCG_RED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                {selectMode ? (lang === "en" ? "Cancel" : "Otkaži") : (lang === "en" ? "Forward tickets" : "Proslijedi karte")}
              </button>
            ) : <div />}
            <LangToggle lang={lang} setLang={setLang} />
          </div>

          {/* Stack */}
          {(() => {
            const tribuneOrder = ["JUG", "SJEVER", "ISTOK", "ZAPAD", "VIP"];
            const sorted = [...tickets].sort((a, b) => {
              // Active (not forwarded) first, then forwarded
              const fwdA = (a.forwardCount || 0) > 0 || a.nameChangeData?.type === "forward" ? 1 : 0;
              const fwdB = (b.forwardCount || 0) > 0 || b.nameChangeData?.type === "forward" ? 1 : 0;
              if (fwdA !== fwdB) return fwdA - fwdB;
              const tA = extractTribune(a.category || "").toUpperCase();
              const tB = extractTribune(b.category || "").toUpperCase();
              const idxA = tribuneOrder.findIndex(t => tA.includes(t));
              const idxB = tribuneOrder.findIndex(t => tB.includes(t));
              return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
            });
            const vsMatch0 = (sorted[0]?.eventName || "").match(/^(.+?)\s+(?:vs|-)\s+(.+)$/i);
            const homeTeam0 = vsMatch0 ? vsMatch0[1].trim() : (sorted[0]?.eventName || "");
            const awayTeam0 = vsMatch0 ? vsMatch0[2].trim() : "";
            return (
          <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
            {/* Red match header — separate from card stack */}
            <div style={{ borderRadius: "14px 14px 0 0", overflow: "hidden" }}>
              <div style={{ background: FSCG_RED, padding: "12px 18px 10px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontFamily: FONT_OSWALD, fontSize: 15, fontWeight: 700, color: "#fff", textTransform: "uppercase", lineHeight: 1, flex: 1 }}>{homeTeam0}</div>
                    <div style={{ background: FSCG_YELLOW, color: "#000", fontFamily: FONT_OSWALD, fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 3 }}>VS</div>
                    <div style={{ fontFamily: FONT_OSWALD, fontSize: 15, fontWeight: 700, color: "#fff", textTransform: "uppercase", lineHeight: 1, flex: 1, textAlign: "right" }}>{awayTeam0}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Card stack — all cards identical */}
            <div style={{ position: "relative", height: sorted.length * 82 + 50 }}>
            {sorted.map((ticket, i) => {
              const tribune = extractTribune(ticket.category || "");
              const color = getTribuneColor(tribune);
              const isFree = ticket.seatId ? /slobodn/i.test(ticket.seatId) || ticket.seatId.trim() === "" : true;
              let sektorLabel = "—";
              let seatLabel = "—";
              if (ticket.seatId && !isFree) {
                const pts = ticket.seatId.split("-");
                if (pts.length === 3) {
                  sektorLabel = pts[0];
                  seatLabel = `${pts[1]}/${pts[2]}`;
                } else {
                  seatLabel = ticket.seatId;
                }
              }
              const isSelected = selectedForShare.has(i);
              const canSelect = selectMode && !((ticket.forwardCount || 0) > 0 || ticket.nameChangeData?.type === "forward");
              return (
                <div
                  key={ticket.id || ticket.ticketId || i}
                  onClick={() => {
                    if (canSelect) {
                      setSelectedForShare(prev => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      });
                    } else {
                      setExpandedTicketId(ticket.id || ticket.ticketId);
                    }
                  }}
                  style={{
                    position: "absolute", left: 0, right: 0,
                    top: i * 82,
                    borderRadius: i === 0 ? "0 0 16px 16px" : 16,
                    overflow: "hidden", cursor: "pointer",
                    zIndex: sorted.length - i,
                    boxShadow: canSelect && isSelected ? `0 0 0 2.5px ${FSCG_RED}, 0 4px 20px rgba(0,0,0,0.12)` : "0 4px 20px rgba(0,0,0,0.12)",
                    transition: "box-shadow 0.15s ease",
                  }}
                >
                  <div style={{ background: canSelect && isSelected ? "#fef8f8" : "#fff", padding: "24px 18px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s ease" }}>
                    {canSelect ? (
                      <div style={{
                        flexShrink: 0, width: 22, height: 22, borderRadius: 6, marginRight: 10,
                        border: isSelected ? `2px solid ${FSCG_RED}` : "2px solid #ccc",
                        background: isSelected ? FSCG_RED : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}>
                        {isSelected && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    ) : (
                      !ticket.nameChangeUsed && <span style={{ flexShrink: 0, fontFamily: FONT_OSWALD, fontSize: 12, fontWeight: 700, color: "#bbb", marginRight: 10, minWidth: 16, textAlign: "center" }}>{i + 1}</span>
                    )}
                    <div style={{ flex: 1, borderRight: "1px solid #f0f0f0", paddingRight: 6, textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 3 }}>{lang === "en" ? "SECTOR" : "SEKTOR"}</span>
                      <span style={{ fontFamily: FONT_OSWALD, fontSize: 13, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>{sektorLabel}</span>
                    </div>
                    <div style={{ flex: 1, borderRight: "1px solid #f0f0f0", paddingRight: 6, paddingLeft: 6, textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 3 }}>{T.row[lang]}/{T.seat[lang]}</span>
                      <span style={{ fontFamily: FONT_OSWALD, fontSize: 13, fontWeight: 700, color: "#111" }}>{seatLabel}</span>
                    </div>
                    <div style={{ flex: 1, paddingLeft: 6, textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#aaa", display: "block", marginBottom: 3 }}>{T.stand[lang]}</span>
                      <span style={{ fontFamily: FONT_OSWALD, fontSize: 13, fontWeight: 700, color }}>{translateData(tribune || "—", lang)}</span>
                    </div>
                    {((ticket.forwardCount || 0) > 0 || ticket.nameChangeData?.type === "forward") && (
                      <div style={{ flexShrink: 0, background: "#eff6ff", color: "#1d4ed8", fontSize: 7, fontWeight: 700, letterSpacing: 0.5, padding: "3px 8px", borderRadius: 6, border: "1px solid #bfdbfe", textTransform: "uppercase", marginLeft: 8 }}>
                        {T.forwarded[lang]}
                      </div>
                    )}
                    {!((ticket.forwardCount || 0) > 0 || ticket.nameChangeData?.type === "forward") && (ticket.viewerTokens as any)?.saved && (
                      <div style={{ flexShrink: 0, background: "#f0fdf4", color: "#16a34a", fontSize: 7, fontWeight: 700, letterSpacing: 0.5, padding: "3px 8px", borderRadius: 6, border: "1px solid #bbf7d0", textTransform: "uppercase", marginLeft: 8, display: "flex", alignItems: "center", gap: 3 }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        {lang === "en" ? "SAVED" : "PREUZETA"}
                      </div>
                    )}
                    {!selectMode && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FSCG_RED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 8 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
            );
          })()}

          <div className="footer" style={{ marginTop: 28 }}>e-tickets</div>
        </div>

        {/* Floating forward bar when tickets are selected */}
        {selectMode && selectedForShare.size > 0 && (() => {
          const tribuneOrder = ["JUG", "SJEVER", "ISTOK", "ZAPAD", "VIP"];
          const sortedRef = [...tickets].sort((a, b) => {
            const fwdA = (a.forwardCount || 0) > 0 || a.nameChangeData?.type === "forward" ? 1 : 0;
            const fwdB = (b.forwardCount || 0) > 0 || b.nameChangeData?.type === "forward" ? 1 : 0;
            if (fwdA !== fwdB) return fwdA - fwdB;
            const tA = extractTribune(a.category || "").toUpperCase();
            const tB = extractTribune(b.category || "").toUpperCase();
            const idxA = tribuneOrder.findIndex(t => tA.includes(t));
            const idxB = tribuneOrder.findIndex(t => tB.includes(t));
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
          });
          return (
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              padding: "14px 20px", paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
              background: "rgba(255,255,255,0.97)", borderTop: "1px solid #e5e5e5", zIndex: 100,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            }}>
              <span style={{ fontFamily: FONT_OSWALD, fontSize: 13, fontWeight: 600, color: "#555", letterSpacing: 0.5 }}>
                {selectedForShare.size} {lang === "en" ? "selected" : "selektovano"}
              </span>
              <button
                onClick={() => handleMultiForward(selectedForShare, sortedRef)}
                style={{
                  padding: "12px 28px", borderRadius: 12, border: "none",
                  background: FSCG_RED, color: "#fff", cursor: "pointer",
                  fontFamily: FONT_OSWALD, fontSize: 14, fontWeight: 700, letterSpacing: 1,
                  textTransform: "uppercase",
                  display: "flex", alignItems: "center", gap: 8,
                  boxShadow: "0 4px 16px rgba(225, 7, 20, 0.35)",
                  WebkitAppearance: "none" as any,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                {lang === "en" ? "Forward" : "Proslijedi"}
              </button>
            </div>
          );
        })()}

        {/* Full-screen ticket popup */}
        {expandedTicketId !== null && (() => {
          const expandedTicket = tickets.find(t => (t.id || t.ticketId) === expandedTicketId);
          if (!expandedTicket) return null;
          return (
          <div style={{
            position: "fixed", inset: 0,
            background: "#f0f0f0",
            zIndex: 200,
            overflowY: "auto",
            animation: "fadeIn 0.25s ease",
          }}>
            {/* Top bar with back button */}
            <div style={{
              position: "sticky", top: 0, zIndex: 1,
              background: "#f0f0f0",
              padding: "12px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <button
                onClick={() => setExpandedTicketId(null)}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "#e5e5e5", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  WebkitAppearance: "none" as any,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span style={{ fontFamily: FONT_OSWALD, fontSize: 13, fontWeight: 600, color: "#888", letterSpacing: 1, textTransform: "uppercase" }}>
                {lang === "en" ? "Ticket" : "Karta"}
              </span>
              <div style={{ display: "inline-flex", borderRadius: 14, overflow: "hidden", border: "1px solid #ddd", background: "#fff" }}>
                {(["me", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      padding: "4px 8px", border: "none", cursor: "pointer",
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
                      background: lang === l ? FSCG_RED : "transparent",
                      color: lang === l ? "#fff" : "#999",
                      WebkitAppearance: "none" as any,
                    }}
                  >
                    {l === "me" ? "MNE" : "ENG"}
                  </button>
                ))}
              </div>
            </div>
            {/* Ticket card */}
            <div style={{ padding: "0 12px 40px", maxWidth: 440, margin: "0 auto" }}>
              <div className="ticket-wrapper" style={{ maxWidth: "100%" }}>
                <TicketCard
                  ticket={expandedTicket}
                  formattedDate={formattedDate} formattedTime={formattedTime}
                  posterUrl={null} posterLink={null}
                  onShare={handleForward} onCheckin={handleCheckinClick}
                  onNameChange={handleNameChangeClick}
                  onSaveTicket={handleSaveTicketClick}
                  isSessionView={!!sessionId}
                  fwdLevel={sessionId ? 0 : fwdLevel}
                  lang={lang}
                />
              </div>
            </div>
          </div>
          );
        })()}

        <NameChangeModal
          isOpen={nameChangeModalOpen}
          onClose={() => { setNameChangeModalOpen(false); setNameChangeTicket(null); }}
          onSubmit={handleNameChangeSubmit}
          isLoading={nameChangeLoading}
          currentName={nameChangeTicket?.customerName || ""}
        />

        {renderSaveWarningModal()}
        {renderFullscreenPass()}

        <style>{styles}{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  // ─── CAROUSEL LAYOUT ───
  if (layoutMode === "carousel") {
    return (
      <div className="ticket-page">
        {refreshBanner}
        <div className="container">
          <div style={{ padding: "16px 0 8px", textAlign: "center" }}>
            <div style={{ fontFamily: FONT_OSWALD, fontSize: 18, fontWeight: 700, color: "#333", letterSpacing: 1, textTransform: "uppercase" }}>
              {lang === "en" ? "My Tickets" : "Moje Karte"}
            </div>
          </div>
          <LangToggle lang={lang} setLang={setLang} />

          <div style={{ width: "100%", overflow: "hidden", position: "relative" }}>
            <div style={{
              display: "flex",
              transition: "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              transform: `translateX(-${carouselIdx * 100}%)`,
            }}>
              {tickets.map((ticket, i) => (
                <div key={ticket.id || ticket.ticketId || i} style={{ minWidth: "100%", display: "flex", justifyContent: "center", padding: "0 4px" }}>
                  <div className="ticket-wrapper">
                    <TicketCard
                      ticket={ticket}
                      formattedDate={formattedDate} formattedTime={formattedTime}
                      posterUrl={null} posterLink={null}
                      onShare={handleForward} onCheckin={handleCheckinClick}
                      onNameChange={handleNameChangeClick}
                      onSaveTicket={handleSaveTicketClick}
                      isSessionView={!!sessionId}
                      fwdLevel={sessionId ? 0 : fwdLevel}
                      lang={lang}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {tickets.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 14 }}>
              <button
                onClick={() => setCarouselIdx(Math.max(0, carouselIdx - 1))}
                disabled={carouselIdx === 0}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: carouselIdx === 0 ? "default" : "pointer", opacity: carouselIdx === 0 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center", WebkitAppearance: "none" as any }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div style={{ display: "flex", gap: 6 }}>
                {tickets.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCarouselIdx(i)}
                    style={{
                      width: carouselIdx === i ? 18 : 7, height: 7, borderRadius: 4,
                      background: carouselIdx === i ? FSCG_RED : "#ddd",
                      transition: "all 0.3s ease", cursor: "pointer",
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => setCarouselIdx(Math.min(tickets.length - 1, carouselIdx + 1))}
                disabled={carouselIdx === tickets.length - 1}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: carouselIdx === tickets.length - 1 ? "default" : "pointer", opacity: carouselIdx === tickets.length - 1 ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center", WebkitAppearance: "none" as any }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          )}

          <div className="footer">Powered by e-tickets &bull; FSCG</div>
        </div>
        {renderSaveWarningModal()}
        {renderFullscreenPass()}
        <style>{styles}</style>
      </div>
    );
  }

  // ─── TABS LAYOUT ───
  if (layoutMode === "tabs") {
    return (
      <div className="ticket-page">
        {refreshBanner}
        <div className="container">
          <div style={{ padding: "16px 0 8px", textAlign: "center" }}>
            <div style={{ fontFamily: FONT_OSWALD, fontSize: 18, fontWeight: 700, color: "#333", letterSpacing: 1, textTransform: "uppercase" }}>
              {lang === "en" ? "My Tickets" : "Moje Karte"}
            </div>
          </div>
          <LangToggle lang={lang} setLang={setLang} />

          {tickets.length > 1 && (
            <div style={{
              display: "flex", gap: 6, overflowX: "auto", padding: "0 10px 10px",
              width: "100%", maxWidth: 400, margin: "0 auto",
              WebkitOverflowScrolling: "touch" as any,
            }}>
              {tickets.map((ticket, i) => {
                const tribune = extractTribune(ticket.category || "");
                return (
                  <button
                    key={ticket.id || ticket.ticketId || i}
                    onClick={() => setTabIdx(i)}
                    style={{
                      flexShrink: 0, padding: "8px 14px", borderRadius: 10,
                      border: tabIdx === i ? `2px solid ${FSCG_RED}` : "1px solid #ddd",
                      background: tabIdx === i ? "#fef2f2" : "#fff",
                      cursor: "pointer", WebkitAppearance: "none" as any,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ fontFamily: FONT_OSWALD, fontSize: 11, fontWeight: 700, color: tabIdx === i ? FSCG_RED : "#555", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {getMatchLabel(ticket)}
                    </div>
                    <div style={{ fontSize: 8, color: tabIdx === i ? FSCG_RED : "#aaa", marginTop: 2, whiteSpace: "nowrap" }}>
                      {tribune || ticket.seatId || ""} • {formattedDate}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="ticket-wrapper">
            <TicketCard
              ticket={tickets[tabIdx]}
              formattedDate={formattedDate} formattedTime={formattedTime}
              posterUrl={null} posterLink={null}
              onShare={handleForward} onCheckin={handleCheckinClick}
              onNameChange={handleNameChangeClick}
              onSaveTicket={handleSaveTicketClick}
              isSessionView={!!sessionId}
              fwdLevel={sessionId ? 0 : fwdLevel}
              lang={lang}
            />
          </div>

          <div className="footer">Powered by e-tickets &bull; FSCG</div>
        </div>
        {renderSaveWarningModal()}
        {renderFullscreenPass()}
        <style>{styles}</style>
      </div>
    );
  }

  // ─── DEFAULT LAYOUT (original) ───
  return (
    <div className="ticket-page">
      {refreshBanner}
      <div className="container">
        <LangToggle lang={lang} setLang={setLang} />
        <div className="tickets-grid">
          {tickets.map((ticket, index) => (
            <div className="ticket-wrapper" key={ticket.id || ticket.ticketId || index}>
              <TicketCard
                ticket={ticket}
                formattedDate={formattedDate}
                formattedTime={formattedTime}
                posterUrl={null}
                posterLink={null}
                onShare={handleForward}
                onCheckin={handleCheckinClick}
                onNameChange={handleNameChangeClick}
                onSaveTicket={handleSaveTicketClick}
                isSessionView={!!sessionId}
                fwdLevel={sessionId ? 0 : fwdLevel}
                lang={lang}
              />
            </div>
          ))}
        </div>

        <div className="footer">Powered by e-tickets &bull; FSCG</div>
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

      <NameChangeModal
        isOpen={nameChangeModalOpen}
        onClose={() => { setNameChangeModalOpen(false); setNameChangeTicket(null); }}
        onSubmit={handleNameChangeSubmit}
        isLoading={nameChangeLoading}
        currentName={nameChangeTicket?.customerName || ""}
      />

      {renderSaveWarningModal()}
      {renderFullscreenPass()}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  html, body {
    color-scheme: light only !important;
    background-color: #f5f5f5 !important;
  }
  @media (prefers-color-scheme: dark) {
    html, body { background: #f5f5f5 !important; color: #111 !important; color-scheme: light only !important; }
    .ticket-page, .ticket-page * { color-scheme: light only !important; forced-color-adjust: none !important; }
    img, svg { filter: none !important; }
  }
  .ticket-page {
    background: #f5f5f5;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding: 20px 0;
    color-scheme: light only !important;
    color: #111 !important;
  }
  .ticket-page * { margin: 0; padding: 0; box-sizing: border-box; color-scheme: light only !important; }
  .ticket-page input, .ticket-page select, .ticket-page textarea {
    color: #111111 !important;
    background-color: #ffffff !important;
    -webkit-text-fill-color: #111111 !important;
    color-scheme: light !important;
  }
  .ticket-page input::placeholder {
    color: #9ca3af !important;
    -webkit-text-fill-color: #9ca3af !important;
  }
  .modal input, .modal select, .modal textarea {
    color: #111111 !important;
    background-color: #ffffff !important;
    -webkit-text-fill-color: #111111 !important;
    color-scheme: light !important;
  }
  .modal input::placeholder {
    color: #9ca3af !important;
    -webkit-text-fill-color: #9ca3af !important;
  }
  .container { max-width: 1200px; margin: 0 auto; padding: 5px; display: flex; flex-direction: column; align-items: center; }
  .tickets-grid { display: flex; flex-direction: column; align-items: center; gap: 20px; width: 100%; }
  .ticket-wrapper { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; max-width: 400px; }
  .ticket-container { background: white; border-radius: 18px; width: 400px; max-width: calc(100vw - 20px); position: relative; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15); }
  .ticket-content { padding: 20px 16px; text-align: center; }
  .header { margin-bottom: 12px; text-align: center; }
  .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 3px; letter-spacing: -0.5px; text-transform: uppercase; color: #003087; }
  .header p { font-size: 11px; color: #666; }
  .event-info { text-align: left; margin-bottom: 12px; }
  .info-label { font-size: 9px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
  .info-value { font-size: 13px; font-weight: 600; word-wrap: break-word; color: #000; }
  .event-name-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }

  .entrance-highlight {
    background: linear-gradient(135deg, #003087 0%, #002266 100%);
    color: white;
    padding: 10px 16px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 3px 12px rgba(0, 48, 135, 0.35);
    min-width: 90px;
    animation: entrance-pulse 2s ease-in-out 3;
    flex-shrink: 0;
  }
  @keyframes entrance-pulse {
    0%, 100% { box-shadow: 0 3px 12px rgba(0, 48, 135, 0.35); }
    50% { box-shadow: 0 3px 20px rgba(0, 48, 135, 0.65); }
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

  /* DOCUMENT INFO SECTION */
  .document-info-highlight { position: relative; border-radius: 6px; padding: 6px; background: white; margin: 8px 0; border: 2px solid #d97706; }
  .document-indicator { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #d97706; color: white; padding: 3px 10px; border-radius: 10px; font-size: 9px; font-weight: 600; z-index: 5; white-space: nowrap; }
  .document-details { padding-top: 6px; grid-template-columns: repeat(2, 1fr); }
  .document-value { font-size: 14px !important; font-weight: 700 !important; color: #92400e !important; }

  .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; margin: 8px 0; }
  .grid-item { display: flex; flex-direction: column; align-items: center; }
  .ticket-status { padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; display: inline-block; white-space: nowrap; }
  .status-valid { background-color: #dcfce7; color: #16a34a; }
  .status-used { background-color: #f3f4f6; color: #4b5563; }
  .customer-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 12px; gap: 10px; }
  .customer-info { text-align: left; flex: 0 0 auto; }
  .buttons-row { display: flex; gap: 8px; margin-left: auto; flex-shrink: 0; }
  .share-button { background: #003087; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); min-width: 95px; white-space: nowrap; }
  .share-button:hover { background: #002266; transform: translateY(-2px); }
  .checkin-button { background: #16a34a; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); min-width: 95px; white-space: nowrap; }
  .checkin-button:hover { background: #15803d; transform: translateY(-2px); }
  .button-icon { width: 14px; height: 14px; }
  .global-notice-container { margin-bottom: 12px; width: 100%; max-width: 400px; }
  .notice-box { background-color: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 12px; text-align: left; }
  .global-notice h3 { color: #b91c1c; font-size: 12px; margin-bottom: 4px; font-weight: 700; }
  .global-notice p { color: #b91c1c; font-size: 11px; line-height: 1.4; }
  .loading-container { text-align: center; padding: 60px 20px; }
  .loader { border: 4px solid #f3f3f3; border-top: 4px solid #003087; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .loading-text { color: #666; font-size: 16px; }
  .error-container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 500px; text-align: center; margin: 40px auto; }
  .error-icon { font-size: 48px; margin-bottom: 20px; }
  .error-message { color: #1a1a1a; font-size: 18px; line-height: 1.5; margin-bottom: 20px; }
  .home-button { display: inline-block; padding: 12px 24px; background: #003087; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; transition: background 0.2s; }
  .home-button:hover { background: #002266; }
  .footer { text-align: center; margin-top: 30px; color: #999; font-size: 14px; }

  /* INFO BUTTON PULSE */
  .fscg-info-btn {
    animation: infoPulse 2.5s ease-in-out infinite;
  }
  @keyframes infoPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.35); }
    50% { box-shadow: 0 0 0 6px rgba(234, 88, 12, 0); }
  }

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
  .modal-ok { background-color: #003087; color: white; }
  .modal-falsifikat { background-color: #dc2626; color: white; }

  /* PIN MODAL */
  .pin-modal-content { max-width: 400px; }
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
    .ticket-container { width: calc(100vw - 20px); max-width: 400px; }
    .share-button, .checkin-button { padding: 7px 10px; font-size: 10px; min-width: 80px; gap: 4px; }
    .button-icon { width: 12px; height: 12px; }
  }
`;
