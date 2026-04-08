import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, Save, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { toast } from "sonner";

interface SponzoriData {
  id: string;
  idx: number;
  image1: string | null;
  link1: string | null;
  image2: string | null;
  link2: string | null;
  image3: string | null;
  link3: string | null;
  poster2: string | null;
  posterLink1: string | null;
  linkPosterKarte: string | null;
  namePoster2: string | null;
  posterMapa: string | null;
  posterMapaLink: string | null;
}

const CPM_RATE = 5;
const CPC_RATE = 0.15;

const parseOS = (ua: string): string => {
  if (!ua) return "Nepoznato";
  const l = ua.toLowerCase();
  if (l.includes("iphone") || l.includes("ipad") || l.includes("ipod")) {
    const m = ua.match(/OS (\d+)[_\d]*/i);
    return m ? `iOS ${m[1]}` : "iOS";
  }
  if (l.includes("android")) {
    const m = ua.match(/Android (\d+\.?\d*)/i);
    return m ? `Android ${m[1]}` : "Android";
  }
  if (l.includes("windows nt 10")) return "Windows 10/11";
  if (l.includes("windows")) return "Windows";
  if (l.includes("macintosh") || l.includes("mac os x")) return "macOS";
  if (l.includes("linux") && !l.includes("android")) return "Linux";
  return "Ostalo";
};

const parseBrowser = (ua: string): string => {
  if (!ua) return "Nepoznato";
  if (ua.includes("Instagram")) return "Instagram";
  if (ua.includes("FBAN") || ua.includes("FBAV")) return "Facebook";
  if (ua.includes("Twitter")) return "Twitter/X";
  if (ua.includes("TikTok")) return "TikTok";
  if (ua.includes("WhatsApp")) return "WhatsApp";
  if (ua.includes("Viber")) return "Viber";
  if (ua.includes("Telegram")) return "Telegram";
  if (ua.includes("LinkedIn")) return "LinkedIn";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome") && !ua.includes("Chromium")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  return "Ostalo";
};

const parseDevice = (ua: string): string => {
  if (!ua) return "Nepoznato";
  const l = ua.toLowerCase();
  if (l.includes("iphone")) return "iPhone";
  if (l.includes("ipad")) return "iPad";
  if (l.includes("android") && l.includes("mobile")) return "Android Phone";
  if (l.includes("android")) return "Android";
  if (l.includes("macintosh")) return "Mac";
  if (l.includes("windows")) return "Windows PC";
  return "Ostalo";
};

const AdminSponzori = () => {
  const [activeTab, setActiveTab] = useState<"analytics" | "manage">("analytics");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all" | "custom">("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [formData, setFormData] = useState<Partial<SponzoriData>>({});
  const [expandedSponsors, setExpandedSponsors] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["sponsor-analytics", dateRange, customStart, customEnd],
    queryFn: async () => {
      const params: any = {};
      if (dateRange === "custom" && customStart && customEnd) {
        params.p_days = 0;
        params.p_start_date = customStart;
        params.p_end_date = customEnd;
      } else {
        params.p_days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 0;
      }
      const { data, error } = await supabase.rpc("get_sponsor_analytics", params);
      if (error) throw error;
      return data as any;
    },
    enabled: activeTab === "analytics" && (dateRange !== "custom" || (!!customStart && !!customEnd)),
  });

  const { data: sponzoriData, isLoading: sponzoriLoading } = useQuery({
    queryKey: ["sponzori-manage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Sponzori")
        .select("*")
        .order("idx", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SponzoriData | null;
    },
    enabled: activeTab === "manage",
  });

  useEffect(() => {
    if (sponzoriData) setFormData(sponzoriData as Partial<SponzoriData>);
  }, [sponzoriData]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SponzoriData>) => {
      if (!sponzoriData?.id) {
        const { error } = await supabase.from("Sponzori").insert({ idx: 0, ...data });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("Sponzori").update(data).eq("id", sponzoriData.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Sačuvano!");
      queryClient.invalidateQueries({ queryKey: ["sponzori-manage"] });
    },
    onError: (error) => toast.error("Greška: " + error.message),
  });

  const handleSave = () => updateMutation.mutate(formData);

  const handleInputChange = (field: keyof SponzoriData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value || null }));
  };

  const handleClearField = (field: keyof SponzoriData, linkField?: keyof SponzoriData) => {
    setFormData((prev) => {
      const u = { ...prev } as any;
      u[field] = null;
      if (linkField) u[linkField] = null;
      return u;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedSponsors((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const totals = useMemo(() => {
    const t = analyticsData?.totals;
    if (!t) return { imp: 0, clk: 0, ctr: 0, cpm: 0, cpc: 0 };
    const imp = t.impressions || 0;
    const clk = t.clicks || 0;
    const ctr = imp > 0 ? (clk / imp) * 100 : 0;
    return { imp, clk, ctr, cpm: (imp / 1000) * CPM_RATE, cpc: clk * CPC_RATE };
  }, [analyticsData]);

  const deviceStats = useMemo(() => {
    const t = analyticsData?.totals;
    if (!t) return { desktop: 0, mobile: 0 };
    return { desktop: t.desktop || 0, mobile: t.mobile || 0 };
  }, [analyticsData]);

  const makeStatsFromUA = (getData: (ua: string) => string) => {
    if (!analyticsData?.user_agents) return [];
    const total = analyticsData.user_agents.reduce((s: number, r: any) => s + r.count, 0);
    const m = new Map<string, number>();
    analyticsData.user_agents.forEach((r: any) => {
      const k = getData(r.ua || "");
      m.set(k, (m.get(k) || 0) + r.count);
    });
    return Array.from(m.entries())
      .map(([name, count]) => ({ name, count, pct: total > 0 ? ((count / total) * 100).toFixed(1) : "0" }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const countryStats = useMemo(() => {
    if (!analyticsData?.countries) return [];
    const total = analyticsData.countries.reduce((s: number, r: any) => s + r.count, 0);
    return analyticsData.countries.map((r: any) => ({
      name: r.name, count: r.count, pct: total > 0 ? ((r.count / total) * 100).toFixed(1) : "0",
    }));
  }, [analyticsData]);
  const referrerStats: any[] = []; // Referrer data not tracked in sponsor_analytics
  const osStats = useMemo(() => makeStatsFromUA((ua) => parseOS(ua)), [analyticsData]);
  const browserStats = useMemo(() => makeStatsFromUA((ua) => parseBrowser(ua)), [analyticsData]);
  const deviceTypeStats = useMemo(() => makeStatsFromUA((ua) => parseDevice(ua)), [analyticsData]);

  const dailyStats = useMemo(() => {
    if (!analyticsData?.daily) return [];
    return analyticsData.daily.map((d: any) => ({
      date: d.date, imp: d.imp || 0, clk: d.clk || 0,
      ctr: d.imp > 0 ? (d.clk / d.imp) * 100 : 0,
    }));
  }, [analyticsData]);

  const sponsorStats = useMemo(() => {
    if (!analyticsData?.sponsors) return [];
    const vers = analyticsData.sponsors.map((s: any) => ({
      key: `${s.sid}|||${s.img || ""}|||${s.link || ""}`,
      sid: s.sid, imp: s.imp || 0, clk: s.clk || 0,
      name: s.name || s.sid, img: s.img || "", link: s.link || "",
      first: new Date(s.first_seen), last: new Date(s.last_seen),
      ctr: s.imp > 0 ? (s.clk / s.imp) * 100 : 0,
      rev: ((s.imp || 0) / 1000) * CPM_RATE + (s.clk || 0) * CPC_RATE,
    }));
    const bySid = new Map<string, typeof vers>();
    vers.forEach((v: any) => {
      if (!bySid.has(v.sid)) bySid.set(v.sid, []);
      bySid.get(v.sid)!.push(v);
    });
    bySid.forEach((arr) => arr.sort((a, b) => b.last.getTime() - a.last.getTime()));
    return Array.from(bySid.entries())
      .map(([sid, arr]) => {
        const totalImp = arr.reduce((s, v) => s + v.imp, 0);
        const totalClk = arr.reduce((s, v) => s + v.clk, 0);
        return {
          sid, versions: arr, totalImp, totalClk,
          totalCtr: totalImp > 0 ? (totalClk / totalImp) * 100 : 0,
          totalRev: arr.reduce((s, v) => s + v.rev, 0),
          current: arr[0],
        };
      })
      .sort((a, b) => b.totalImp - a.totalImp);
  }, [analyticsData]);

  const exportCSV = () => {
    if (!dailyStats.length) return;
    const csv =
      "Datum,Impresije,Klikovi,CTR\n" +
      dailyStats.map((r) => `${r.date},${r.imp},${r.clk},${r.ctr.toFixed(2)}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sponzori-${dateRange}.csv`;
    a.click();
  };

  const fmt = (n: number) => new Intl.NumberFormat("de-DE").format(n);
  const fmtC = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
  const fmtD = (d: Date) => d.toLocaleDateString("sr-Latn-ME", { day: "numeric", month: "short", year: "numeric" });

  const Bar = ({ val, max, color }: { val: number; max: number; color: string }) => (
    <div className="w-full bg-gray-100 rounded h-1.5">
      <div className={`h-1.5 rounded ${color}`} style={{ width: `${Math.min((val / max) * 100, 100)}%` }} />
    </div>
  );

  const StatTable = ({
    title,
    data,
    color,
  }: {
    title: string;
    data: { name: string; count: number; pct: string }[];
    color: string;
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 font-semibold text-black">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-600 uppercase border-b border-gray-100">
            <th className="px-5 py-3 w-8">#</th>
            <th className="px-5 py-3">Naziv</th>
            <th className="px-5 py-3 text-right">Broj</th>
            <th className="px-5 py-3 text-right w-14">%</th>
            <th className="px-5 py-3 w-24"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                Nema podataka
              </td>
            </tr>
          ) : (
            data.map((r, i) => (
              <tr key={r.name} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 text-gray-600 text-xs">{i + 1}</td>
                <td className="px-5 py-2.5 font-medium text-black">{r.name}</td>
                <td className="px-5 py-2.5 text-right text-black">{fmt(r.count)}</td>
                <td className="px-5 py-2.5 text-right text-gray-600 text-xs">{r.pct}%</td>
                <td className="px-5 py-2.5">
                  <Bar val={r.count} max={data[0]?.count || 1} color={color} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-black">Sponzori</h2>
          <p className="text-gray-600 text-sm mt-1">Analitika i upravljanje</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "analytics" ? "bg-white text-black shadow-sm" : "text-gray-600"}`}
          >
            Analitika
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "manage" ? "bg-white text-black shadow-sm" : "text-gray-600"}`}
          >
            Upravljanje
          </button>
        </div>
      </div>

      {activeTab === "analytics" && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              <option value="7d">7 dana</option>
              <option value="30d">30 dana</option>
              <option value="90d">90 dana</option>
              <option value="all">Sve</option>
              <option value="custom">Custom period</option>
            </select>
            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Calendar size={14} className="text-gray-400" />
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <span className="text-gray-400 text-sm">–</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                />
              </div>
            )}
            <button
              onClick={() => refetchAnalytics()}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw size={16} className={analyticsLoading ? "animate-spin" : "text-gray-400"} />
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium"
            >
              <Download size={14} />
              Export
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-600 uppercase">Impresije</p>
              <p className="text-2xl font-semibold text-black mt-1">{fmt(totals.imp)}</p>
              <p className="text-xs text-gray-600 mt-1">CPM: {fmtC(totals.cpm)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-600 uppercase">Klikovi</p>
              <p className="text-2xl font-semibold text-black mt-1">{fmt(totals.clk)}</p>
              <p className="text-xs text-gray-600 mt-1">CPC: {fmtC(totals.cpc)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-600 uppercase">CTR</p>
              <p className="text-2xl font-semibold text-black mt-1">{totals.ctr.toFixed(2)}%</p>
              <p className={`text-xs mt-1 ${totals.ctr >= 1 ? "text-green-600" : "text-gray-600"}`}>
                {totals.ctr >= 1 ? "Iznad prosjeka" : "Prosječno"}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-600 uppercase">Desktop / Mobile</p>
              <p className="text-2xl font-semibold text-black mt-1">
                {fmt(deviceStats.desktop)} / {fmt(deviceStats.mobile)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {((deviceStats.mobile / (deviceStats.desktop + deviceStats.mobile || 1)) * 100).toFixed(0)}% mobile
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-600 uppercase">Ukupno</p>
              <p className="text-2xl font-semibold text-green-600 mt-1">{fmtC(totals.cpm + totals.cpc)}</p>
              <p className="text-xs text-gray-600 mt-1">CPM + CPC</p>
            </div>
          </div>

          {sponsorStats.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 font-semibold text-black">Sponzori</div>
              <div className="divide-y divide-gray-100">
                {sponsorStats.map((s) => (
                  <div key={s.sid}>
                    <div
                      onClick={() => toggleExpand(s.sid)}
                      className="p-4 cursor-pointer hover:bg-gray-50 flex items-center gap-4"
                    >
                      {s.current.img && (
                        <img
                          src={s.current.img}
                          alt=""
                          className="w-10 h-10 object-contain rounded-lg border border-gray-100 bg-gray-50"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-black">{s.current.name}</span>
                          {s.versions.length > 1 && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                              {s.versions.length} verzije
                            </span>
                          )}
                        </div>
                        {s.current.link && <p className="text-xs text-gray-600 truncate">{s.current.link}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-black">
                          {fmt(s.totalImp)} <span className="text-gray-600 text-sm">imp</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          {fmt(s.totalClk)} klik · {s.totalCtr.toFixed(2)}%
                        </p>
                      </div>
                      <div className="text-right w-20">
                        <p className="font-medium text-green-600">{fmtC(s.totalRev)}</p>
                      </div>
                      {expandedSponsors.has(s.sid) ? (
                        <ChevronUp size={16} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-500" />
                      )}
                    </div>
                    {expandedSponsors.has(s.sid) && (
                      <div className="bg-gray-50 border-t border-gray-100">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-600 uppercase">
                              <th className="px-4 py-3">Verzija</th>
                              <th className="px-4 py-3">Period</th>
                              <th className="px-4 py-3 text-right">Imp</th>
                              <th className="px-4 py-3 text-right">Klik</th>
                              <th className="px-4 py-3 text-right">CTR</th>
                              <th className="px-4 py-3 text-right">Vrijednost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {s.versions.map((v, i) => (
                              <tr key={v.key} className={i === 0 ? "bg-green-50/50" : "bg-white"}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {v.img ? (
                                      <img
                                        src={v.img}
                                        alt=""
                                        className="w-8 h-8 object-contain rounded border bg-white"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 bg-gray-200 rounded" />
                                    )}
                                    <div>
                                      <span
                                        className={`text-xs px-1.5 py-0.5 rounded ${i === 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                                      >
                                        {i === 0 ? "Aktivna" : `#${i + 1}`}
                                      </span>
                                      {v.link && (
                                        <a
                                          href={v.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block text-xs text-blue-600 hover:underline mt-1 truncate max-w-48"
                                        >
                                          {v.link}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-black">
                                  {fmtD(v.first)} — {fmtD(v.last)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-black">{fmt(v.imp)}</td>
                                <td className="px-4 py-3 text-right font-medium text-black">{fmt(v.clk)}</td>
                                <td className="px-4 py-3 text-right text-black">{v.ctr.toFixed(2)}%</td>
                                <td className="px-4 py-3 text-right font-medium text-green-600">{fmtC(v.rev)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatTable title="Zemlje" data={countryStats} color="bg-blue-500" />
            <StatTable title="Browseri / Aplikacije" data={browserStats} color="bg-amber-500" />
            <StatTable title="Operativni sistemi" data={osStats} color="bg-violet-500" />
            <StatTable title="Tipovi uređaja" data={deviceTypeStats} color="bg-cyan-500" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 font-semibold text-black">Dnevna statistika</div>
            {analyticsLoading ? (
              <div className="p-10 text-center text-gray-500">Učitavanje...</div>
            ) : dailyStats.length === 0 ? (
              <div className="p-10 text-center text-gray-500">Nema podataka</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-600 uppercase border-b border-gray-100">
                    <th className="px-5 py-3">Datum</th>
                    <th className="px-5 py-3 text-right">Impresije</th>
                    <th className="px-5 py-3 text-right">Klikovi</th>
                    <th className="px-5 py-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dailyStats.map((r) => (
                    <tr key={r.date} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-medium text-black">
                        {new Date(r.date).toLocaleDateString("sr-Latn-ME", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-5 py-2.5 text-right text-black">{fmt(r.imp)}</td>
                      <td className="px-5 py-2.5 text-right text-black">{fmt(r.clk)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${r.ctr >= 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                        >
                          {r.ctr.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === "manage" && (
        <div className="space-y-6">
          {sponzoriLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
              Učitavanje...
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 font-semibold text-black">Podešavanja</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-600 uppercase border-b border-gray-100">
                      <th className="px-5 py-3 w-48">Polje</th>
                      <th className="px-5 py-3">Vrijednost</th>
                      <th className="px-5 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      { field: "image1", label: "Sponzor lijevo (slika)", link: "link1" },
                      { field: "link1", label: "Sponzor lijevo (link)" },
                      { field: "image2", label: "Sponzor desno (slika)", link: "link2" },
                      { field: "link2", label: "Sponzor desno (link)" },
                      { field: "image3", label: "Bottom banner (slika)", link: "link3" },
                      { field: "link3", label: "Bottom banner (link)" },
                      { field: "poster2", label: "Poster karta (slika)", link: "linkPosterKarte" },
                      { field: "linkPosterKarte", label: "Poster karta (link)" },
                      { field: "namePoster2", label: "Ime sponzora karta" },
                      { field: "posterLink1", label: "Poster Link 1" },
                      { field: "posterMapa", label: "Poster Mapa" },
                      { field: "posterMapaLink", label: "Poster Mapa Link" },
                    ].map((item) => (
                      <tr key={item.field} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-black">{item.label}</td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={
                              (formData[item.field as keyof SponzoriData] as string) ??
                              (sponzoriData?.[item.field as keyof SponzoriData] as string) ??
                              ""
                            }
                            onChange={(e) => handleInputChange(item.field as keyof SponzoriData, e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() =>
                              handleClearField(item.field as keyof SponzoriData, item.link as keyof SponzoriData)
                            }
                            className="text-xs text-gray-500 hover:text-red-500"
                          >
                            Očisti
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {updateMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    Sačuvaj
                  </button>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  Promjene mogu potrajati do <strong>10 minuta</strong> zbog CF keša.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSponzori;
