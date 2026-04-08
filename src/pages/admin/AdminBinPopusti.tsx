import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Plus, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react";

interface BinDiscount {
  id: string;
  bin: string;
  bank_name: string;
  percentage: number;
  active: boolean;
  created_at: string;
}

export default function AdminBinPopusti() {
  const [discounts, setDiscounts] = useState<BinDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New discount form
  const [newBin, setNewBin] = useState("");
  const [newBank, setNewBank] = useState("");
  const [newPercent, setNewPercent] = useState("10");

  const load = async () => {
    const { data } = await supabase
      .from("bin_discounts")
      .select("*")
      .order("created_at", { ascending: false });
    setDiscounts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newBin || !newBank || !newPercent) return;
    setSaving(true);
    await supabase.from("bin_discounts").insert({
      bin: newBin.trim(),
      bank_name: newBank.trim(),
      percentage: parseInt(newPercent),
      active: true,
    });
    setNewBin("");
    setNewBank("");
    setNewPercent("10");
    await load();
    setSaving(false);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("bin_discounts").update({ active: !currentActive }).eq("id", id);
    if (error) {
      console.error("Toggle error:", error);
      alert("Greška: " + error.message);
    }
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Obrisati ovaj popust?")) return;
    await supabase.from("bin_discounts").delete().eq("id", id);
    await load();
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
          <CreditCard className="w-6 h-6 text-amber-500" />
          BIN Popusti
        </h2>
        <p className="text-sm text-gray-500">
          Upravljajte popustima za kartice prema BIN broju (prvih 6 cifara). Popusti se automatski primjenjuju na checkout formi.
        </p>
      </div>

      {/* Add new */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Dodaj novi popust</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">BIN (6 cifara)</label>
            <input
              type="text"
              maxLength={8}
              value={newBin}
              onChange={(e) => setNewBin(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-wider"
              placeholder="516971"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Naziv banke</label>
            <input
              type="text"
              value={newBank}
              onChange={(e) => setNewBank(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Hipotekarna banka"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Popust (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={saving || !newBin || !newBank}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Dodaj
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">BIN</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Banka</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Popust</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm font-medium">{d.bin}</td>
                <td className="px-4 py-3 text-sm">{d.bank_name}</td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600">{d.percentage}%</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(d.id, d.active)} className="flex items-center gap-1.5">
                    {d.active ? (
                      <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-xs text-green-600 font-medium">Aktivan</span></>
                    ) : (
                      <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-xs text-gray-400 font-medium">Neaktivan</span></>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {discounts.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Nema popusta</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
