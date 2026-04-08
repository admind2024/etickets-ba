import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface OcrResult {
  surname: string | null;
  givenNames: string | null;
  sex: string | null;
  documentNumber: string | null;
  expiryDate: string | null;
  confidence: string;
  isMontenegrin: boolean | null;
  detectedCountry: string | null;
  detectedDocumentType: string | null;
  imageRotated?: boolean;
  isBackSide?: boolean;
}

interface DocumentScannerProps {
  onResult: (file: File, ocrData: OcrResult) => void;
  onClose: () => void;
  lang: "me" | "en";
  documentType: string;
  skipMontenegrinCheck?: boolean;
  strict?: boolean;
}

export default function DocumentScanner({
  onResult,
  onClose,
  lang,
  documentType,
  skipMontenegrinCheck = false,
  strict = true,
}: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (mounted) setCameraReady(true);
          };
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        if (mounted) {
          setCameraError(
            lang === "me"
              ? "Kamera nije dostupna. Koristite opciju za upload slike."
              : "Camera not available. Please use the image upload option."
          );
        }
      }
    };
    startCamera();
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [lang]);

  const handleScan = async () => {
    const video = videoRef.current;
    if (!video || scanning) return;

    setScanError(null);
    setScanning(true);

    try {
      // Capture frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas error");
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Blob error"))),
          "image/jpeg",
          0.92
        );
      });

      // Convert to base64 for OCR
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(blob);
      });

      // Call OCR
      const { data, error } = await supabase.functions.invoke("ocr-document", {
        body: { imageBase64: base64, documentType, strict },
      });

      if (error) throw new Error(error.message);

      if (!data?.success) {
        throw new Error(data?.error || "OCR failed");
      }

      // FIRST: Reject documents that are not ID card or passport
      if (data.detectedDocumentType && data.detectedDocumentType !== "id_card" && data.detectedDocumentType !== "passport") {
        setScanError(
          lang === "me"
            ? `Ovaj dokument je ${data.detectedDocumentType === "drivers_license" ? "vozačka dozvola" : "neprihvatljiv dokument"}. Prihvataju se samo lična karta ili pasoš.`
            : `This document is a ${data.detectedDocumentType === "drivers_license" ? "driver's license" : "unacceptable document"}. Only ID cards or passports are accepted.`
        );
        return;
      }

      // Check rotation
      if (data.imageRotated) {
        setScanError(
          lang === "me"
            ? "Dokument je okrenut! Pozicionirajte ga HORIZONTALNO."
            : "Document is rotated! Position it HORIZONTALLY."
        );
        return;
      }

      // Check back side
      if (data.isBackSide) {
        setScanError(
          lang === "me"
            ? "Ovo je zadnja strana! Okrenite na PREDNJU stranu sa fotografijom."
            : "This is the back side! Flip to the FRONT side with the photo."
        );
        return;
      }

      // Check Montenegrin (skip if prop says so)
      if (!skipMontenegrinCheck && data.isMontenegrin === false) {
        setScanError(
          lang === "me"
            ? `Ovo nije crnogorski dokument (detektovano: ${data.detectedCountry || "nepoznato"}).`
            : `This is not a Montenegrin document (detected: ${data.detectedCountry || "unknown"}).`
        );
        return;
      }

      // Check name was read
      if (!data.surname && !data.givenNames) {
        setScanError(
          lang === "me"
            ? "Nije moguće pročitati ime. Pokušajte sa boljim osvjetljenjem."
            : "Could not read the name. Try with better lighting."
        );
        return;
      }

      // Check confidence
      if (data.confidence === "low") {
        setScanError(
          lang === "me"
            ? "Loš kvalitet. Približite dokument i pokušajte ponovo."
            : "Poor quality. Move the document closer and try again."
        );
        return;
      }

      // Check expiry date
      if (data.expiryDate) {
        try {
          const parts = data.expiryDate.replace(/\.$/, "").split(".");
          if (parts.length === 3) {
            const expiry = new Date(
              parseInt(parts[2]),
              parseInt(parts[1]) - 1,
              parseInt(parts[0])
            );
            if (expiry < new Date()) {
              setScanError(
                lang === "me"
                  ? `Dokument je istekao (${data.expiryDate}). Koristite važeći dokument.`
                  : `Document has expired (${data.expiryDate}). Please use a valid document.`
              );
              return;
            }
          }
        } catch {
          // ignore date parse errors
        }
      }

      // SUCCESS — show green, vibrate, then close
      setScanSuccess(true);
      if (navigator.vibrate) navigator.vibrate(200);

      const file = new File([blob], "document-scan.jpg", { type: "image/jpeg" });

      setTimeout(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        onResult(file, data);
      }, 800);
    } catch (err: any) {
      console.error("Scan error:", err);
      setScanError(
        lang === "me"
          ? "Greška pri skeniranju. Pokušajte ponovo."
          : "Scan error. Please try again."
      );
    } finally {
      setScanning(false);
    }
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onClose();
  };

  const frameColor = scanSuccess
    ? "#22c55e"
    : scanError
      ? "#ef4444"
      : "rgba(255,255,255,0.8)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 10001,
          background: "rgba(0,0,0,0.6)",
          border: "none",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <X className="w-6 h-6" style={{ color: "#fff" }} />
      </button>

      {cameraError ? (
        <div style={{ color: "#fff", textAlign: "center", padding: 32 }}>
          <AlertCircle
            style={{ width: 48, height: 48, color: "#f87171", margin: "0 auto 16px" }}
          />
          <p style={{ fontSize: 16, marginBottom: 16 }}>{cameraError}</p>
          <button
            onClick={handleClose}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              background: "#fff",
              color: "#000",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            {lang === "me" ? "Zatvori" : "Close"}
          </button>
        </div>
      ) : (
        <>
          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Scanning overlay */}
          {scanning && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10002,
                background: "rgba(0,0,0,0.4)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <Loader2
                className="w-12 h-12 animate-spin"
                style={{ color: "#fff" }}
              />
              <p style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>
                {lang === "me" ? "Skeniram..." : "Scanning..."}
              </p>
            </div>
          )}

          {/* Success overlay */}
          {scanSuccess && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10002,
                background: "rgba(34,197,94,0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <CheckCircle style={{ width: 64, height: 64, color: "#22c55e" }} />
              <p style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
                {lang === "me" ? "Uspješno!" : "Success!"}
              </p>
            </div>
          )}

          {/* Overlay with cutout */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {/* Top dark area */}
            <div style={{ flex: 1, width: "100%", background: "rgba(0,0,0,0.55)" }} />

            {/* Middle row with cutout */}
            <div style={{ display: "flex", width: "100%", pointerEvents: "none" }}>
              <div style={{ flex: 1, background: "rgba(0,0,0,0.55)" }} />

              {/* Transparent cutout — ID card aspect ratio ~1.586:1 */}
              <div
                style={{
                  width: "min(85vw, 420px)",
                  aspectRatio: "1.586 / 1",
                  border: `3px solid ${frameColor}`,
                  borderRadius: 16,
                  position: "relative",
                  transition: "border-color 0.3s",
                }}
              >
                {[
                  { top: -2, left: -2, borderTop: `4px solid ${frameColor}`, borderLeft: `4px solid ${frameColor}`, borderRadius: "14px 0 0 0" },
                  { top: -2, right: -2, borderTop: `4px solid ${frameColor}`, borderRight: `4px solid ${frameColor}`, borderRadius: "0 14px 0 0" },
                  { bottom: -2, left: -2, borderBottom: `4px solid ${frameColor}`, borderLeft: `4px solid ${frameColor}`, borderRadius: "0 0 0 14px" },
                  { bottom: -2, right: -2, borderBottom: `4px solid ${frameColor}`, borderRight: `4px solid ${frameColor}`, borderRadius: "0 0 14px 0" },
                ].map((s, i) => (
                  <div key={i} style={{ position: "absolute", width: 28, height: 28, transition: "border-color 0.3s", ...s }} />
                ))}
              </div>

              <div style={{ flex: 1, background: "rgba(0,0,0,0.55)" }} />
            </div>

            {/* Bottom dark area */}
            <div
              style={{
                flex: 1,
                width: "100%",
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: 20,
                gap: 14,
                pointerEvents: "auto",
              }}
            >
              {/* Guide / error text */}
              <p
                style={{
                  color: scanError ? "#fca5a5" : "#fff",
                  fontSize: scanError ? 13 : 14,
                  fontWeight: 600,
                  textAlign: "center",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  lineHeight: 1.5,
                  padding: "0 24px",
                  minHeight: 42,
                }}
              >
                {scanError
                  ? scanError
                  : lang === "me"
                    ? "Pozicionirajte PREDNJU stranu dokumenta u okvir"
                    : "Position the FRONT side of your document in the frame"}
              </p>

              {/* Scan button */}
              {cameraReady && !scanSuccess && (
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  style={{
                    padding: "14px 48px",
                    borderRadius: 40,
                    background: scanning ? "#666" : "#fff",
                    color: "#000",
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: 1,
                    border: "none",
                    cursor: scanning ? "default" : "pointer",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                    textTransform: "uppercase",
                    opacity: scanning ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {!scanning && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  )}
                  {scanning
                    ? (lang === "me" ? "Skeniram..." : "Scanning...")
                    : (lang === "me" ? "Skeniraj" : "Scan")}
                </button>
              )}

              {!cameraReady && (
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: "#fff" }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
