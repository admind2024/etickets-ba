import { Link } from "react-router-dom";
import {
  CalendarPlus,
  QrCode,
  RotateCcw,
  Banknote,
  Link2,
  ShoppingBag,
  Copy,
  Mail,
  Settings,
  TrendingUp,
  ArrowRight,
  Printer,
  CreditCard,
  Shield,
  DoorOpen,
  FileText,
} from "lucide-react";

const dashboardCards = [
  { label: "Pregled karata", path: "/admin/karte", icon: TrendingUp, color: "bg-green-500" },
  { label: "Ad Events", path: "/admin/events", icon: CalendarPlus, color: "bg-orange-500" },
  { label: "Skeniranje", path: "/admin/skeniranje", icon: QrCode, color: "bg-cyan-500" },
  { label: "Povrati/Refund", path: "/admin/refund", icon: RotateCcw, color: "bg-red-500" },
  { label: "Isplate", path: "/admin/isplate", icon: Banknote, color: "bg-emerald-500" },
  { label: "Link za plaćanje", path: "/admin/link-placanje", icon: Link2, color: "bg-pink-500" },
  { label: "Pazar", path: "/admin/pazar", icon: ShoppingBag, color: "bg-teal-500" },
  { label: "Provjera duplikata", path: "/admin/duplikati", icon: Copy, color: "bg-slate-500" },
  { label: "Mail", path: "/admin/mail", icon: Mail, color: "bg-rose-500" },
  { label: "CMS", path: "/admin/cms", icon: Settings, color: "bg-gray-600" },
  { label: "Generiši QR", path: "/admin/generisi-qr", icon: Printer, color: "bg-violet-500" },
  { label: "BIN Popusti", path: "/admin/bin-popusti", icon: CreditCard, color: "bg-amber-500" },
  { label: "Osiguranje", path: "/admin/osiguranje", icon: Shield, color: "bg-teal-600" },
  { label: "Ulazi izvještaj", path: "/admin/ulazi", icon: DoorOpen, color: "bg-indigo-500" },
  { label: "Organizatori", path: "/admin/organizatori-izvjestaj", icon: FileText, color: "bg-slate-600" },
  { label: "Banner", path: "/admin/banner", icon: Shield, color: "bg-amber-500" },
];

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-2xl font-bold text-[#1a1f36] mb-2">Dobrodošli u Admin Panel</h2>
        <p className="text-[#697386]">Izaberite sekciju iz menija ili kliknite na karticu ispod.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.path}
              to={card.path}
              className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-[#013DC4]/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon size={24} className="text-white" />
                </div>
                <ArrowRight size={18} className="text-gray-300 group-hover:text-[#013DC4] transition-colors" />
              </div>
              <h3 className="font-semibold text-[#1a1f36] group-hover:text-[#013DC4] transition-colors">
                {card.label}
              </h3>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;
