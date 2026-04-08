import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2, Eye, EyeOff, Save } from "lucide-react";

export default function AdminBanner() {
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [textEn, setTextEn] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("site_banner")
      .select("*")
      .eq("id", "main")
      .maybeSingle();

    if (data) {
      setEnabled(data.enabled);
      setText(data.text || "");
      setTextEn(data.text_en || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    await supabase
      .from("site_banner")
      .upsert({
        id: "main",
        enabled,
        text,
        text_en: textEn,
        updated_at: new Date().toISOString(),
      });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          Banner obavještenje
        </h2>
        <p className="text-sm text-gray-500">
          Upravljajte trakom obavještenja koja se prikazuje na vrhu sajta iznad headera.
        </p>
      </div>

      {/* Preview */}
      {enabled && text && (
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 px-4 py-2 bg-gray-50 border-b border-gray-200 font-medium">PREVIEW</p>
          <div className="w-full bg-amber-500 text-white text-center py-2 px-4 text-xs sm:text-sm font-medium">
            <span className="mr-1.5">⚠️</span>
            {text}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Status bannera</p>
            <p className="text-sm text-gray-500">
              {enabled ? "Banner je vidljiv na sajtu" : "Banner je sakriven"}
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              enabled ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                enabled ? "translate-x-7" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Text ME */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Tekst (Crnogorski/Srpski)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tekst obavještenja..."
          />
        </div>

        {/* Text EN */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Text (English)
          </label>
          <textarea
            value={textEn}
            onChange={(e) => setTextEn(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Notification text in English..."
          />
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Objavi
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Sačuvano!</span>
          )}
        </div>
      </div>
    </div>
  );
}
