import { useState, useEffect, useCallback, CSSProperties, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───
interface EventRow {
  id: string;
  name?: string;
  performer?: string;
  date?: string;
  event_time?: string;
  venue?: string;
  category?: string;
  status?: string;
  currency?: string;
  slug?: string;
  link?: string;
  prioritet?: number;
  organizer?: string;
  capacity?: string;
  hide?: boolean | string;
  info?: string;
  long_description?: string;
  biografija?: string;
  image?: string;
  heroImage?: string;
  heroImageMobile?: string;
  youtube?: string;
  eventType?: string;
  eventId?: string;
  eventKey?: string;
  workspaceKey?: string;
  end_date?: string;
  online?: string;
  biletarnica?: string;
  email?: string;
  serviceFeePercentage?: string;
  biletarnicaFee?: string;
  pdvPercentage?: string;
  categories?: string;
  description?: string | CatItem[];
  seo_title?: string;
  seo_description?: string;
  organizer_url?: string;
  organizer_slug?: string;
  organizer_description?: string;
  organizer_logo?: string;
  organizer_email?: string;
  organizer_phone?: string;
  organizer_address?: string;
  organizer_city?: string;
  organizer_country?: string;
  organizer_website?: string;
  organizer_facebook?: string;
  organizer_instagram?: string;
  organizer_twitter?: string;
  organizer_youtube?: string;
  organizer_tiktok?: string;
  organizer_verified?: boolean | string;
  organizer_featured?: boolean | string;
  venue_info?: string;
  parking_info?: string;
  allocations?: string | AllocItem[];
  [key: string]: unknown;
}

interface CatItem {
  category: string;
  price: number;
  type: string;
  tableFixedPrice: number;
  description: string;
  _k?: number;
}

interface AllocItem {
  id: string;
  category: string;
  quantity: number;
  type: string;
  channel: string;
  notes: string;
  created_at: string;
  _k?: number;
}

interface ToastItem {
  id: number;
  msg: string;
  type: string;
}

// ─── Constants ───
const TABS = [
  { id: "basic", label: "Osnovno", icon: "📋" },
  { id: "details", label: "Detalji", icon: "📝" },
  { id: "pricing", label: "Cijene", icon: "💰" },
  { id: "alloc", label: "Alokacije", icon: "📦" },
  { id: "seo", label: "SEO", icon: "🔍" },
  { id: "org", label: "Organizator", icon: "🏢" },
  { id: "venue", label: "Venue", icon: "📍" },
];
const FILTERS = [
  { id: "all", label: "Svi" },
  { id: "active", label: "Aktivni" },
  { id: "past", label: "Prošli" },
  { id: "Koncert", label: "Koncerti" },
  { id: "Predstava", label: "Predstave" },
  { id: "Nastup", label: "Nastupi" },
];
const CATEGORIES = ["Koncert", "Nastup", "Predstava", "Festival", "Sport", "Ostalo"];
const STATUSES = [
  { v: "active", l: "Aktivan" },
  { v: "past", l: "Prošao" },
  { v: "draft", l: "Draft" },
];
const CURRENCIES = ["EUR", "RSD", "BAM"];

// ─── Theme ───
const th = {
  bg: "#f8f9fb",
  card: "#fff",
  card2: "#f4f5f7",
  border: "#e5e7eb",
  borderH: "#d1d5db",
  text: "#111827",
  sub: "#6b7280",
  dim: "#9ca3af",
  accent: "#4f46e5",
  accentH: "#6366f1",
  accentL: "#eef2ff",
  accentG: "rgba(79,70,229,.06)",
  green: "#059669",
  greenBg: "#ecfdf5",
  orange: "#d97706",
  orangeBg: "#fffbeb",
  red: "#dc2626",
  redBg: "#fef2f2",
  r: 10,
  rs: 7,
  sh: "0 1px 3px rgba(0,0,0,.04),0 1px 2px rgba(0,0,0,.06)",
  shL: "0 20px 60px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.05)",
};

// ─── Shared styles ───
const inp: CSSProperties = {
  width: "100%",
  padding: "8px 11px",
  background: th.card,
  border: `1px solid ${th.border}`,
  borderRadius: th.rs,
  color: th.text,
  fontFamily: "Inter,sans-serif",
  fontSize: 13,
  outline: "none",
};
const monoInp: CSSProperties = { ...inp, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 };
const taStyle: CSSProperties = { ...inp, resize: "vertical" as const, minHeight: 68 };
const selStyle: CSSProperties = {
  ...inp,
  appearance: "none" as const,
  paddingRight: 28,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};
const lblStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: th.sub,
  marginBottom: 4,
  letterSpacing: 0.3,
};

// ─── Toasts ───
function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {items.map((x) => (
        <div
          key={x.id}
          style={{
            padding: "10px 16px",
            borderRadius: th.rs,
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            background: x.type === "success" ? th.green : x.type === "error" ? th.red : th.accent,
            boxShadow: th.sh,
            animation: "slideUp .2s ease-out",
          }}
        >
          {x.msg}
        </div>
      ))}
    </div>
  );
}

// ─── API (koristi supabase client iz projekta) ───

function fDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("sr-Latn", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

// ─── Button ───
function Btn({
  children,
  v = "ghost",
  sm,
  onClick,
  sx,
}: {
  children: ReactNode;
  v?: "primary" | "ghost" | "danger";
  sm?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  sx?: CSSProperties;
}) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: sm ? "5px 10px" : "7px 14px",
    borderRadius: th.rs,
    fontFamily: "Inter,sans-serif",
    fontSize: sm ? 12 : 13,
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    ...sx,
  };
  const vs: Record<string, CSSProperties> = {
    primary: { background: th.accent, color: "#fff" },
    ghost: { background: "transparent", color: th.sub, border: `1px solid ${th.border}` },
    danger: { background: th.redBg, color: th.red },
  };
  return (
    <button style={{ ...base, ...vs[v] }} onClick={onClick}>
      {children}
    </button>
  );
}

// ─── Price Card ───
function PriceCard({
  cat,
  idx,
  onChange,
  onRemove,
  currency,
}: {
  cat: CatItem;
  idx: number;
  onChange: (i: number, f: string, v: string) => void;
  onRemove: () => void;
  currency: string;
}) {
  const isTable = cat.type === "table";
  return (
    <div
      style={{
        background: th.card,
        border: `1px solid ${th.border}`,
        borderRadius: th.r,
        padding: 16,
        position: "relative",
        transition: "box-shadow .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: isTable ? th.orangeBg : th.accentL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            {isTable ? "🪑" : "🎫"}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{cat.category || "Nova kategorija"}</div>
            <div style={{ fontSize: 11, color: th.dim }}>{isTable ? "Sto" : "Regular"}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: th.accent }}>
            {cat.price}
            <span style={{ fontSize: 12, fontWeight: 500, color: th.dim, marginLeft: 2 }}>{currency}</span>
          </div>
          <button
            onClick={onRemove}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: "none",
              background: th.redBg,
              color: th.red,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
        <div>
          <span style={lblStyle}>Naziv kategorije</span>
          <input
            style={inp}
            value={cat.category || ""}
            placeholder="npr. VIP Tribina"
            onChange={(e) => onChange(idx, "category", e.target.value)}
          />
        </div>
        <div>
          <span style={lblStyle}>Cijena ({currency})</span>
          <input
            style={{ ...inp, fontWeight: 600, fontSize: 15, textAlign: "center" as const }}
            type="number"
            value={cat.price || 0}
            onChange={(e) => onChange(idx, "price", e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <div>
          <span style={lblStyle}>Tip</span>
          <select
            style={selStyle}
            value={cat.type || "regular"}
            onChange={(e) => onChange(idx, "type", e.target.value)}
          >
            <option value="regular">Regular (karta)</option>
            <option value="table">Table (sto)</option>
          </select>
        </div>
        <div>
          <span style={lblStyle}>Fiksna cijena stola</span>
          <input
            style={inp}
            type="number"
            value={cat.tableFixedPrice || 0}
            onChange={(e) => onChange(idx, "tableFixedPrice", e.target.value)}
          />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={lblStyle}>Opis (opciono)</span>
        <textarea
          style={{ ...inp, resize: "vertical" as const, minHeight: 60 }}
          rows={2}
          value={cat.description || ""}
          placeholder="Kratak opis kategorije..."
          onChange={(e) => onChange(idx, "description", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Allocation Card ───
const ALLOC_TYPES = [
  { v: "external_channel", l: "Eksterni kanal" },
  { v: "reserved", l: "Rezervisano" },
  { v: "complimentary", l: "Komplimentarno" },
  { v: "hold", l: "Hold" },
];

function AllocCard({
  alloc,
  idx,
  onChange,
  onRemove,
  catOptions,
}: {
  alloc: AllocItem;
  idx: number;
  onChange: (i: number, f: string, v: string) => void;
  onRemove: () => void;
  catOptions: string[];
}) {
  const typeLabel = ALLOC_TYPES.find((x) => x.v === alloc.type)?.l || alloc.type;
  const typeColor =
    alloc.type === "external_channel"
      ? th.accent
      : alloc.type === "complimentary"
        ? th.green
        : alloc.type === "reserved"
          ? th.orange
          : th.sub;
  const typeBg =
    alloc.type === "external_channel"
      ? th.accentL
      : alloc.type === "complimentary"
        ? th.greenBg
        : alloc.type === "reserved"
          ? th.orangeBg
          : th.card2;
  return (
    <div
      style={{
        background: th.card,
        border: `1px solid ${th.border}`,
        borderRadius: th.r,
        padding: 16,
        transition: "box-shadow .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: typeBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            📦
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{alloc.channel || "Novi kanal"}</div>
            <div style={{ fontSize: 11, color: typeColor, fontWeight: 500 }}>{typeLabel}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: th.accent }}>
            {alloc.quantity}
            <span style={{ fontSize: 12, fontWeight: 500, color: th.dim, marginLeft: 2 }}>kom</span>
          </div>
          <button
            onClick={onRemove}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: "none",
              background: th.redBg,
              color: th.red,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      </div>
      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <span style={lblStyle}>Kanal / Distributer</span>
          <input
            style={inp}
            value={alloc.channel || ""}
            placeholder="npr. M-Tel, Kamarad..."
            onChange={(e) => onChange(idx, "channel", e.target.value)}
          />
        </div>
        <div>
          <span style={lblStyle}>Kategorija karte</span>
          {catOptions.length > 0 ? (
            <select
              style={selStyle}
              value={alloc.category || ""}
              onChange={(e) => onChange(idx, "category", e.target.value)}
            >
              <option value="">— Izaberi —</option>
              {catOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              style={inp}
              value={alloc.category || ""}
              placeholder="Kategorija"
              onChange={(e) => onChange(idx, "category", e.target.value)}
            />
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10, marginTop: 10 }}>
        <div>
          <span style={lblStyle}>Količina</span>
          <input
            style={{ ...inp, fontWeight: 600, fontSize: 15, textAlign: "center" as const }}
            type="number"
            value={alloc.quantity || 0}
            onChange={(e) => onChange(idx, "quantity", e.target.value)}
          />
        </div>
        <div>
          <span style={lblStyle}>Tip alokacije</span>
          <select
            style={selStyle}
            value={alloc.type || "external_channel"}
            onChange={(e) => onChange(idx, "type", e.target.value)}
          >
            {ALLOC_TYPES.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={lblStyle}>Napomena</span>
        <input
          style={inp}
          value={alloc.notes || ""}
          placeholder="npr. 5 VIP stolova × 6 mjesta = 30 karata"
          onChange={(e) => onChange(idx, "notes", e.target.value)}
        />
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={lblStyle}>ID</span>
        <input
          style={monoInp}
          value={alloc.id || ""}
          placeholder="unique-id"
          onChange={(e) => onChange(idx, "id", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Field Component ───
interface FProps {
  l: string;
  f: string;
  type?: string;
  full?: boolean;
  opts?: (string | { v: string; l: string })[];
  check?: boolean;
  isMono?: boolean;
  rows?: number;
}

// ─── Main ───
export default function App() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [conn, setConn] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sf, setSf] = useState("date");
  const [sd, setSd] = useState<"asc" | "desc">("desc");
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [tab, setTab] = useState("basic");
  const [cats, setCats] = useState<CatItem[]>([]);
  const [allocs, setAllocs] = useState<AllocItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const toast = useCallback((msg: string, type = "info") => {
    const id = Date.now();
    setToasts((p: ToastItem[]) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p: ToastItem[]) => p.filter((x: ToastItem) => x.id !== id)), 3000);
  }, []);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("AboutEvents")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      setEvents(data || []);
      setConn(true);
      toast(`${(data || []).length} događaja`, "info");
    } catch (e: unknown) {
      toast("Greška: " + (e instanceof Error ? e.message : String(e)), "error");
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, []);

  const filtered = (() => {
    let f = [...events];
    if (filter === "active" || filter === "past") f = f.filter((e) => e.status === filter);
    else if (filter !== "all") f = f.filter((e) => e.category === filter);
    if (search) {
      const s = search.toLowerCase();
      f = f.filter(
        (e) =>
          (e.name || "").toLowerCase().includes(s) ||
          (e.venue || "").toLowerCase().includes(s) ||
          (e.performer || "").toLowerCase().includes(s),
      );
    }
    f.sort((a, b) => {
      let va = String(a[sf] || ""),
        vb = String(b[sf] || "");
      if (sf === "date") {
        const da = new Date(va).getTime(),
          db = new Date(vb).getTime();
        return sd === "asc" ? da - db : db - da;
      }
      return va < vb ? (sd === "asc" ? -1 : 1) : va > vb ? (sd === "asc" ? 1 : -1) : 0;
    });
    return f;
  })();

  const doSort = (field: string) => {
    if (sf === field) setSd((d: "asc" | "desc") => (d === "asc" ? "desc" : "asc"));
    else {
      setSf(field);
      setSd("asc");
    }
  };
  const stats = {
    total: events.length,
    active: events.filter((e: EventRow) => e.status === "active").length,
    past: events.filter((e: EventRow) => e.status === "past").length,
    koncert: events.filter((e: EventRow) => e.category === "Koncert").length,
  };

  const openEdit = (ev: EventRow) => {
    setEditing(ev);
    setForm({ ...ev });
    setTab("basic");
    setImageFile(null);
    setImagePreview(null);
    const d = ev.description;
    let c2: CatItem[] = [];
    if (typeof d === "string") {
      try {
        c2 = JSON.parse(d);
      } catch {}
    } else if (Array.isArray(d)) c2 = d;
    setCats(c2.map((x, i) => ({ ...x, _k: i })));
    const al = ev.allocations;
    let a2: AllocItem[] = [];
    if (typeof al === "string") {
      try {
        a2 = JSON.parse(al);
      } catch {}
    } else if (Array.isArray(al)) a2 = al;
    setAllocs(a2.map((x, i) => ({ ...x, _k: i })));
  };
  const closeEdit = () => {
    setEditing(null);
    setForm({});
  };
  const uf = (field: string, val: unknown) => setForm((p: Record<string, unknown>) => ({ ...p, [field]: val }));

  const save = async () => {
    if (!editing) return;
    try {
      const d: Record<string, unknown> = { ...form };
      d.description = cats.map(({ _k, ...r }: CatItem) => r);
      d.categories = cats
        .map((x: CatItem) => `${x.category} - ${x.price} ${(d.currency as string) || "EUR"}`)
        .join(", ");
      d.allocations = allocs.map(({ _k, ...r }: AllocItem) => r);
      const { error } = await supabase
        .from("AboutEvents")
        .update(d)
        .eq("id", editing.id);
      if (error) throw error;

      // Sync tekstualnih polja u event_i18n (lang='me') - sajt čita odatle
      const i18nData: Record<string, unknown> = {
        event_id: editing.id,
        lang: "me",
        title: d.name,
        info: d.info,
        long_description: d.long_description,
        seo_title: d.seo_title,
        seo_description: d.seo_description,
        slug: d.slug,
        description: d.description,
        venue_info: d.venue_info,
        parking_info: d.parking_info,
        updated_at: new Date().toISOString(),
      };
      const { error: i18nError } = await supabase
        .from("event_i18n")
        .upsert(i18nData, { onConflict: "event_id,lang" });
      if (i18nError) console.error("event_i18n sync error:", i18nError);

      toast("Sačuvano!", "success");
      closeEdit();
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : String(e), "error");
    }
  };

  const del = async () => {
    if (!editing || !confirm(`Obriši "${editing.name}"?`)) return;
    try {
      const { error } = await supabase
        .from("AboutEvents")
        .delete()
        .eq("id", editing.id);
      if (error) throw error;
      toast("Obrisano", "success");
      closeEdit();
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : String(e), "error");
    }
  };

  // ─── Image Upload ───
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (field: string): Promise<void> => {
    if (!imageFile || !editing) return;
    setIsUploadingImage(true);
    try {
      const slug = (form.slug as string) || editing.id;
      const ext = imageFile.name.split(".").pop() || "jpg";
      const filePath = `${slug}-${field}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("event-images")
        .upload(filePath, imageFile, { cacheControl: "3600", upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(filePath);
      uf(field, urlData.publicUrl);

      // Odmah sačuvaj u bazu
      const { error: dbErr } = await supabase
        .from("AboutEvents")
        .update({ [field]: urlData.publicUrl })
        .eq("id", editing.id);
      if (dbErr) throw dbErr;

      toast("Slika uploadovana i sačuvana!", "success");
      setImageFile(null);
      setImagePreview(null);
    } catch (e: unknown) {
      toast("Upload greška: " + (e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const uCat = (i: number, f: string, v: string) =>
    setCats((p: CatItem[]) =>
      p.map((x: CatItem, j: number) =>
        j === i ? { ...x, [f]: f === "price" || f === "tableFixedPrice" ? Number(v) || 0 : v } : x,
      ),
    );
  const uAlloc = (i: number, f: string, v: string) =>
    setAllocs((p: AllocItem[]) =>
      p.map((x: AllocItem, j: number) => (j === i ? { ...x, [f]: f === "quantity" ? Number(v) || 0 : v } : x)),
    );

  // ─── Field Component (closure over form/uf) ───
  const Field = ({ l, f, type = "text", full, opts, check, isMono, rows }: FProps) => {
    const wrap: CSSProperties = full ? { gridColumn: "1/-1" } : {};
    if (check)
      return (
        <div style={wrap}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={form[f] === true || form[f] === "true"}
              onChange={(e) => uf(f, e.target.checked)}
              style={{ width: 16, height: 16, accentColor: th.accent }}
            />
            <span style={{ color: th.sub }}>{l}</span>
          </label>
        </div>
      );
    if (opts)
      return (
        <div style={wrap}>
          <span style={lblStyle}>{l}</span>
          <select style={selStyle} value={(form[f] as string) || ""} onChange={(e) => uf(f, e.target.value)}>
            {opts.map((o) => (
              <option key={typeof o === "string" ? o : o.v} value={typeof o === "string" ? o : o.v}>
                {typeof o === "string" ? o : o.l}
              </option>
            ))}
          </select>
        </div>
      );
    if (rows)
      return (
        <div style={wrap}>
          <span style={lblStyle}>{l}</span>
          <textarea
            style={taStyle}
            rows={rows}
            value={(form[f] as string) || ""}
            onChange={(e) => uf(f, e.target.value)}
          />
        </div>
      );
    return (
      <div style={wrap}>
        <span style={lblStyle}>{l}</span>
        <input
          type={type}
          style={isMono ? monoInp : inp}
          value={(form[f] as string) ?? ""}
          onChange={(e) => uf(f, e.target.value)}
        />
        {f === "image" && (form.image as string) && (
          <img
            src={form.image as string}
            alt=""
            style={{
              width: 80,
              height: 52,
              borderRadius: 6,
              objectFit: "cover",
              border: `1px solid ${th.border}`,
              marginTop: 5,
            }}
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
      </div>
    );
  };

  const g2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
  const currency = (form.currency as string) || "EUR";

  const tabContent: Record<string, ReactNode> = {
    basic: (
      <div style={g2}>
        <Field l="Naziv" f="name" />
        <Field l="Performer" f="performer" />
        <Field l="Datum" f="date" type="date" />
        <Field l="Vrijeme" f="event_time" type="time" />
        <Field l="Venue" f="venue" />
        <Field l="Kategorija" f="category" opts={CATEGORIES} />
        <Field l="Status" f="status" opts={STATUSES} />
        <Field l="Valuta" f="currency" opts={CURRENCIES} />
        <Field l="Slug" f="slug" isMono />
        <Field l="Link" f="link" isMono />
        <Field l="Prioritet" f="prioritet" type="number" />
        <Field l="Organizer" f="organizer" />
        {/* Kapacitet — pregledna tabela po kategorijama */}
        {(() => {
          const raw = (form.capacity as string) || "";
          // Parsira "Fan pit250 places..." format
          const items: { name: string; places: number }[] = [];
          const regex = /([A-Za-zÀ-žčćžšđČĆŽŠĐ\s]+?)(\d+)\s*places?/gi;
          let m;
          while ((m = regex.exec(raw)) !== null) {
            items.push({ name: m[1].trim(), places: parseInt(m[2]) });
          }

          const updatePlaces = (idx: number, val: number) => {
            const updated = [...items];
            updated[idx] = { ...updated[idx], places: val };
            const newStr = updated.map((it) => `${it.name}${it.places} places`).join("");
            uf("capacity", newStr);
          };

          return (
            <div style={{ gridColumn: "1/-1" }}>
              <span style={lblStyle}>Kapacitet</span>
              {items.length > 0 ? (
                <div
                  style={{
                    border: `1px solid ${th.border}`,
                    borderRadius: th.rs,
                    overflow: "hidden",
                  }}
                >
                  {items.map((it, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 12px",
                        borderBottom: i < items.length - 1 ? `1px solid ${th.border}` : "none",
                        background: i % 2 === 0 ? th.card : th.card2,
                      }}
                    >
                      <span style={{ fontSize: 13, color: th.text, fontWeight: 500 }}>{it.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="number"
                          value={it.places}
                          onChange={(e) => updatePlaces(i, parseInt(e.target.value) || 0)}
                          style={{
                            width: 80,
                            padding: "4px 8px",
                            background: th.card,
                            border: `1px solid ${th.border}`,
                            borderRadius: th.rs,
                            color: th.text,
                            fontSize: 13,
                            textAlign: "right" as const,
                            outline: "none",
                          }}
                        />
                        <span style={{ fontSize: 11, color: th.sub }}>mjesta</span>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: th.accent + "10",
                      borderTop: `1px solid ${th.border}`,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <span>Ukupno</span>
                    <span>{items.reduce((s, it) => s + it.places, 0)} mjesta</span>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  style={inp}
                  value={raw}
                  onChange={(e) => uf("capacity", e.target.value)}
                  placeholder="Kapacitet..."
                />
              )}
            </div>
          );
        })()}
        <Field l="Sakrij događaj" f="hide" check />
      </div>
    ),
    details: (
      <div style={g2}>
        <Field l="Info" f="info" rows={3} full />
        <Field l="Long Description" f="long_description" rows={8} full />
        <Field l="Biografija" f="biografija" rows={4} full />
        {/* Image Upload */}
        <div style={{ gridColumn: "1/-1" }}>
          <span style={lblStyle}>Slika događaja</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input
              type="text"
              style={{ ...monoInp, flex: 1 }}
              value={(form.image as string) || ""}
              onChange={(e) => uf("image", e.target.value)}
              placeholder="URL slike ili uploaduj novu..."
            />
            <label style={{
              padding: "7px 14px", borderRadius: 7, cursor: "pointer",
              background: th.accent, color: "#fff", fontSize: 12, fontWeight: 600,
              whiteSpace: "nowrap",
            }}>
              {isUploadingImage ? "⏳ Upload..." : "📷 Upload"}
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => handleImageSelect(e, "image")} />
            </label>
            {imageFile && !isUploadingImage && (
              <button onClick={() => uploadImage("image")} style={{
                padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                background: th.green, color: "#fff", fontSize: 12, fontWeight: 600,
              }}>
                ✅ Sačuvaj sliku
              </button>
            )}
          </div>
          {(imagePreview || (form.image as string)) && (
            <img
              src={imagePreview || (form.image as string)}
              alt=""
              style={{ width: 160, height: 100, borderRadius: 8, objectFit: "cover", border: `1px solid ${th.border}` }}
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
        </div>
        <Field l="Hero Image" f="heroImage" isMono />
        <Field l="Hero Image Mobile" f="heroImageMobile" isMono />
        <Field l="YouTube" f="youtube" isMono />
        <Field
          l="Event Type"
          f="eventType"
          opts={[
            { v: "seats", l: "Seats" },
            { v: "general", l: "General" },
          ]}
        />
        <Field l="Event ID" f="eventId" isMono />
        <Field l="Event Key" f="eventKey" isMono />
        <Field l="Workspace Key" f="workspaceKey" isMono />
        <Field l="End Date" f="end_date" type="date" />
        <Field l="Online" f="online" />
        <Field l="Biletarnica" f="biletarnica" />
        <Field l="Email" f="email" type="email" />
      </div>
    ),
    pricing: (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ background: th.card2, borderRadius: th.r, padding: 14 }}>
            <span style={lblStyle}>Service Fee %</span>
            <input
              style={{ ...inp, fontSize: 16, fontWeight: 600, textAlign: "center" as const, background: th.card }}
              value={(form.serviceFeePercentage as string) || ""}
              onChange={(e) => uf("serviceFeePercentage", e.target.value)}
            />
          </div>
          <div style={{ background: th.card2, borderRadius: th.r, padding: 14 }}>
            <span style={lblStyle}>PDV %</span>
            <input
              style={{ ...inp, fontSize: 16, fontWeight: 600, textAlign: "center" as const, background: th.card }}
              value={(form.pdvPercentage as string) || ""}
              onChange={(e) => uf("pdvPercentage", e.target.value)}
            />
          </div>
          <div style={{ background: th.card2, borderRadius: th.r, padding: 14 }}>
            <span style={lblStyle}>Biletarnica Fee</span>
            <input
              style={{ ...inp, fontSize: 16, fontWeight: 600, textAlign: "center" as const, background: th.card }}
              value={(form.biletarnicaFee as string) || ""}
              onChange={(e) => uf("biletarnicaFee", e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Kategorije cijena</span>
            <span style={{ fontSize: 12, color: th.dim, marginLeft: 8 }}>{cats.length} kategorija</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {cats.length > 0 && (
              <span style={{ fontSize: 12, color: th.sub, background: th.card2, padding: "4px 10px", borderRadius: 5 }}>
                Raspon: {Math.min(...cats.map((x: CatItem) => x.price))}–
                {Math.max(...cats.map((x: CatItem) => x.price))} {currency}
              </span>
            )}
            <Btn
              v="primary"
              sm
              onClick={() =>
                setCats((p: CatItem[]) => [
                  ...p,
                  { category: "", price: 0, type: "regular", tableFixedPrice: 0, description: "", _k: Date.now() },
                ])
              }
            >
              + Nova kategorija
            </Btn>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {cats.map((x: CatItem, i: number) => (
            <PriceCard
              key={x._k ?? i}
              cat={x}
              idx={i}
              currency={currency}
              onChange={uCat}
              onRemove={() => setCats((p: CatItem[]) => p.filter((_: CatItem, j: number) => j !== i))}
            />
          ))}
        </div>

        {cats.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: th.dim,
              background: th.card2,
              borderRadius: th.r,
              marginTop: 8,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎫</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Nema kategorija cijena</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Dodaj prvu kategoriju da definišeš cijene karata</div>
          </div>
        )}

        {cats.length > 0 && (
          <div style={{ marginTop: 20, padding: 14, background: th.card2, borderRadius: th.r }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: th.dim, letterSpacing: 0.3 }}>
              PREGLED — AUTOMATSKI GENERISANO
            </span>
            <div style={{ fontSize: 12, color: th.sub, lineHeight: 1.6, marginTop: 8 }}>
              <div style={{ marginBottom: 4 }}>
                <strong>categories:</strong>{" "}
                {cats.map((x: CatItem) => `${x.category} - ${x.price} ${currency}`).join(", ")}
              </div>
              <details style={{ cursor: "pointer" }}>
                <summary style={{ fontSize: 11, color: th.dim }}>description JSON</summary>
                <pre
                  style={{
                    fontSize: 11,
                    color: th.sub,
                    marginTop: 6,
                    padding: 10,
                    background: th.card,
                    borderRadius: 6,
                    overflow: "auto",
                    maxHeight: 200,
                  }}
                >
                  {JSON.stringify(
                    cats.map(({ _k, ...r }: CatItem) => r),
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    ),
    alloc: (
      <div>
        {/* Summary */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Alokacije karata</span>
            <span style={{ fontSize: 12, color: th.dim, marginLeft: 8 }}>
              {allocs.length} alokacija · {allocs.reduce((s: number, x: AllocItem) => s + (x.quantity || 0), 0)} karata
              ukupno
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {allocs.length > 0 &&
              (() => {
                const channels = [...new Set(allocs.map((x: AllocItem) => x.channel).filter(Boolean))];
                return (
                  <span
                    style={{ fontSize: 12, color: th.sub, background: th.card2, padding: "4px 10px", borderRadius: 5 }}
                  >
                    {channels.length} {channels.length === 1 ? "kanal" : "kanala"}
                  </span>
                );
              })()}
            <Btn
              v="primary"
              sm
              onClick={() =>
                setAllocs((p: AllocItem[]) => [
                  ...p,
                  {
                    id: `alloc-${Date.now()}`,
                    category: "",
                    quantity: 0,
                    type: "external_channel",
                    channel: "",
                    notes: "",
                    created_at: new Date().toISOString(),
                    _k: Date.now(),
                  },
                ])
              }
            >
              + Nova alokacija
            </Btn>
          </div>
        </div>

        {/* Alloc cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {allocs.map((x: AllocItem, i: number) => (
            <AllocCard
              key={x._k ?? i}
              alloc={x}
              idx={i}
              catOptions={cats.map((c: CatItem) => c.category).filter(Boolean)}
              onChange={uAlloc}
              onRemove={() => setAllocs((p: AllocItem[]) => p.filter((_: AllocItem, j: number) => j !== i))}
            />
          ))}
        </div>

        {allocs.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: th.dim,
              background: th.card2,
              borderRadius: th.r,
              marginTop: 8,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Nema alokacija</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Dodaj alokacije za raspodjelu karata po kanalima</div>
          </div>
        )}

        {allocs.length > 0 && (
          <div style={{ marginTop: 20, padding: 14, background: th.card2, borderRadius: th.r }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: th.dim, letterSpacing: 0.3 }}>
              PREGLED — AUTOMATSKI GENERISANO
            </span>
            <div style={{ fontSize: 12, color: th.sub, lineHeight: 1.6, marginTop: 8 }}>
              {/* Per-channel summary */}
              {(() => {
                const byChannel: Record<string, number> = {};
                allocs.forEach((a: AllocItem) => {
                  byChannel[a.channel || "Nepoznat"] = (byChannel[a.channel || "Nepoznat"] || 0) + (a.quantity || 0);
                });
                return Object.entries(byChannel).map(([ch, qty]) => (
                  <span key={ch} style={{ display: "inline-block", marginRight: 12, marginBottom: 4 }}>
                    <strong>{ch}:</strong> {qty} karata
                  </span>
                ));
              })()}
              <details style={{ cursor: "pointer", marginTop: 8 }}>
                <summary style={{ fontSize: 11, color: th.dim }}>allocations JSON</summary>
                <pre
                  style={{
                    fontSize: 11,
                    color: th.sub,
                    marginTop: 6,
                    padding: 10,
                    background: th.card,
                    borderRadius: 6,
                    overflow: "auto",
                    maxHeight: 200,
                  }}
                >
                  {JSON.stringify(
                    allocs.map(({ _k, ...r }: AllocItem) => r),
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    ),
    seo: (
      <div style={g2}>
        <div style={{ gridColumn: "1/-1" }}>
          <span style={lblStyle}>SEO Title</span>
          <input
            style={inp}
            value={(form.seo_title as string) || ""}
            onChange={(e) => uf("seo_title", e.target.value)}
          />
          <div
            style={{
              fontSize: 11,
              color: ((form.seo_title as string) || "").length > 60 ? th.red : th.dim,
              marginTop: 3,
            }}
          >
            {((form.seo_title as string) || "").length}/60
          </div>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <span style={lblStyle}>SEO Description</span>
          <textarea
            style={taStyle}
            rows={3}
            value={(form.seo_description as string) || ""}
            onChange={(e) => uf("seo_description", e.target.value)}
          />
          <div
            style={{
              fontSize: 11,
              color: ((form.seo_description as string) || "").length > 160 ? th.red : th.dim,
              marginTop: 3,
            }}
          >
            {((form.seo_description as string) || "").length}/160
          </div>
        </div>
      </div>
    ),
    org: (
      <div style={g2}>
        <Field l="URL" f="organizer_url" isMono />
        <Field l="Slug" f="organizer_slug" isMono />
        <Field l="Opis" f="organizer_description" rows={3} full />
        <Field l="Logo URL" f="organizer_logo" isMono />
        <Field l="Email" f="organizer_email" type="email" />
        <Field l="Telefon" f="organizer_phone" />
        <Field l="Adresa" f="organizer_address" />
        <Field l="Grad" f="organizer_city" />
        <Field l="Država" f="organizer_country" />
        <Field l="Website" f="organizer_website" isMono />
        <Field l="Facebook" f="organizer_facebook" isMono />
        <Field l="Instagram" f="organizer_instagram" isMono />
        <Field l="Twitter" f="organizer_twitter" isMono />
        <Field l="YouTube" f="organizer_youtube" isMono />
        <Field l="TikTok" f="organizer_tiktok" isMono />
        <Field l="Verified" f="organizer_verified" check />
        <Field l="Featured" f="organizer_featured" check />
      </div>
    ),
    venue: (
      <div style={g2}>
        <Field l="Venue Info" f="venue_info" rows={5} full />
        <Field l="Parking Info" f="parking_info" rows={2} full />
      </div>
    ),
  };

  return (
    <div
      style={{
        fontFamily: "Inter,-apple-system,sans-serif",
        background: th.bg,
        color: th.text,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'); @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}} *{box-sizing:border-box;margin:0;padding:0} ::selection{background:#c7d2fe}`}</style>
      <Toasts items={toasts} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Događaji</div>
            <div style={{ fontSize: 14, color: th.sub, marginTop: 4 }}>
              {stats.total} ukupno · {stats.active} aktivnih · {stats.koncert} koncerata
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: th.green }} />
            <span style={{ fontSize: 12, color: th.dim }}>Povezano</span>
            <Btn onClick={() => load()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Osvježi
            </Btn>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "5px 13px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "Inter,sans-serif",
                  border: filter === f.id ? `1px solid ${th.accent}` : "1px solid transparent",
                  background: filter === f.id ? th.accentL : "transparent",
                  color: filter === f.id ? th.accent : th.sub,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            placeholder="Pretraži..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inp, width: 220, background: th.card, boxShadow: th.sh }}
          />
        </div>

        <div
          style={{
            background: th.card,
            border: `1px solid ${th.border}`,
            borderRadius: th.r,
            overflow: "hidden",
            boxShadow: th.sh,
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    { f: "name", l: "Događaj" },
                    { f: "date", l: "Datum" },
                    { f: "venue", l: "Venue" },
                    { f: "category", l: "Tip" },
                    { f: "status", l: "Status" },
                    { f: "", l: "Vidljiv" },
                    { f: "", l: "" },
                  ].map((h, i) => (
                    <th
                      key={i}
                      onClick={() => h.f && doSort(h.f)}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: 0.4,
                        color: th.dim,
                        borderBottom: `1px solid ${th.border}`,
                        cursor: h.f ? "pointer" : "default",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                        background: th.card,
                      }}
                    >
                      {h.l}
                      {sf === h.f ? (sd === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 48, color: th.dim, fontSize: 14 }}>
                      Nema rezultata
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => openEdit(e)}
                      style={{
                        borderBottom: `1px solid ${th.border}`,
                        cursor: "pointer",
                        transition: "background .1s",
                      }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = th.accentG)}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <img
                            src={e.image || ""}
                            alt=""
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 7,
                              objectFit: "cover",
                              background: th.card2,
                              flexShrink: 0,
                            }}
                            onError={(ev) => ((ev.target as HTMLImageElement).style.display = "none")}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name || "—"}</div>
                            <div style={{ fontSize: 11, color: th.dim }}>{e.performer || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, whiteSpace: "nowrap", color: th.sub }}>
                        {fDate(e.date)} · {e.event_time || ""}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: th.sub }}>{e.venue || "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: th.sub }}>{e.category || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "2px 9px",
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            background:
                              e.status === "active" ? th.greenBg : e.status === "draft" ? th.orangeBg : th.card2,
                            color: e.status === "active" ? th.green : e.status === "draft" ? th.orange : th.dim,
                          }}
                        >
                          {e.status || "active"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontSize: 12,
                          color: e.hide === true || e.hide === "true" ? th.red : th.green,
                          fontWeight: 500,
                        }}
                      >
                        {e.hide === true || e.hide === "true" ? "Skriven" : "Vidljiv"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Btn
                          sm
                          onClick={(ev) => {
                            ev.stopPropagation();
                            openEdit(e);
                          }}
                        >
                          Uredi
                        </Btn>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.18)",
            backdropFilter: "blur(3px)",
            zIndex: 200,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflowY: "auto",
            padding: "28px 16px",
            animation: "fadeIn .15s",
          }}
        >
          <div
            style={{
              background: th.card,
              borderRadius: 14,
              width: "100%",
              maxWidth: 880,
              boxShadow: th.shL,
              animation: "slideUp .2s ease-out",
            }}
          >
            <div
              style={{
                padding: "16px 22px",
                borderBottom: `1px solid ${th.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 700 }}>{editing.name || "Uredi"}</div>
              <button
                onClick={closeEdit}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  border: "none",
                  background: th.card2,
                  color: th.sub,
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{ display: "flex", borderBottom: `1px solid ${th.border}`, padding: "0 22px", overflowX: "auto" }}
            >
              {TABS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setTab(x.id)}
                  style={{
                    padding: "11px 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    border: "none",
                    background: "none",
                    fontFamily: "Inter,sans-serif",
                    borderBottom: `2px solid ${tab === x.id ? th.accent : "transparent"}`,
                    color: tab === x.id ? th.accent : th.sub,
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{x.icon}</span>
                  {x.label}
                </button>
              ))}
            </div>
            <div style={{ padding: 22, maxHeight: "60vh", overflowY: "auto" }}>{tabContent[tab]}</div>
            <div
              style={{
                padding: "12px 22px",
                borderTop: `1px solid ${th.border}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <Btn v="danger" sm onClick={del} sx={{ marginRight: "auto" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
                Obriši
              </Btn>
              <Btn onClick={closeEdit}>Otkaži</Btn>
              <Btn v="primary" onClick={save}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                </svg>
                Sačuvaj
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
