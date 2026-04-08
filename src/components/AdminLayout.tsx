import { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  CalendarPlus,
  QrCode,
  RotateCcw,
  Banknote,
  Ticket,
  Link2,
  ShoppingBag,
  Copy,
  Mail,
  Settings,
  Menu,
  X,
  RefreshCw,
  TrendingUp,
  Users,
  MapPin,
  Building2,
  Calendar,
  FileText,
  Megaphone,
  DoorOpen,
  Trophy,
  CreditCard,
  Shield,
  Printer,
  AlertTriangle,
  LineChart,
} from "lucide-react";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  { label: "Analytics", path: "/admin/analytics", icon: <LineChart size={18} /> },
  { label: "Pregled karata", path: "/admin/karte", icon: <TrendingUp size={18} /> },
  { label: "Ad Events", path: "/admin/events", icon: <CalendarPlus size={18} /> },
  { label: "Skeniranje", path: "/admin/skeniranje", icon: <QrCode size={18} /> },
  { label: "Povrati/Refund", path: "/admin/refund", icon: <RotateCcw size={18} /> },
  { label: "Isplate", path: "/admin/isplate", icon: <Banknote size={18} /> },
  { label: "Osiguranje", path: "/admin/osiguranje", icon: <Shield size={18} /> },
  { label: "BIN Popusti", path: "/admin/bin-popusti", icon: <CreditCard size={18} /> },
  { label: "Kartice Statistika", path: "/admin/card-statistika", icon: <CreditCard size={18} /> },
  { label: "Link za plaćanje", path: "/admin/link-placanje", icon: <Link2 size={18} /> },
  { label: "Pazar", path: "/admin/pazar", icon: <ShoppingBag size={18} /> },
  { label: "Provjera duplikata", path: "/admin/duplikati", icon: <Copy size={18} /> },
  { label: "Generiši QR", path: "/admin/generisi-qr", icon: <Printer size={18} /> },
  { label: "Kontrola ulaza", path: "/admin/ulazi", icon: <DoorOpen size={18} /> },
  { label: "Organizatori Izvještaj", path: "/admin/organizatori-izvjestaj", icon: <FileText size={18} /> },
  { label: "Izvođači", path: "/admin/performers", icon: <Users size={18} /> },
  { label: "Lokacije", path: "/admin/venues", icon: <MapPin size={18} /> },
  { label: "Organizatori", path: "/admin/organizers", icon: <Building2 size={18} /> },
  { label: "Eventi", path: "/admin/eventi", icon: <Calendar size={18} /> },
  { label: "Sponzori", path: "/admin/sponzori", icon: <Megaphone size={18} /> },
  { label: "Dodaj meč", path: "/admin/dodaj-mec", icon: <Trophy size={18} /> },
  { label: "Dokumenti kupaca", path: "/admin/dokumenti", icon: <FileText size={18} /> },
  { label: "Mail", path: "/admin/mail", icon: <Mail size={18} /> },
  { label: "Banner", path: "/admin/banner", icon: <AlertTriangle size={18} /> },
  { label: "CMS", path: "/admin/cms", icon: <Settings size={18} /> },
];

const AdminLayout = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Force light mode on all admin pages - use MutationObserver to prevent ThemeProvider from re-adding dark
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");

    const observer = new MutationObserver(() => {
      if (root.classList.contains("dark")) {
        root.classList.remove("dark");
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      if (wasDark) root.classList.add("dark");
    };
  }, []);

  const currentPage = menuItems.find((item) => location.pathname === item.path);
  const pageTitle = currentPage?.label || "Admin Dashboard";

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f6f9fc]">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-[260px] bg-white h-screen overflow-y-auto
          border-r border-gray-200 shadow-sm
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="px-5 py-6 border-b border-gray-100">
          <Link to="/admin" className="flex items-center gap-2.5 text-[#013DC4] font-bold text-xl tracking-tight">
            <Ticket size={24} />
            <span>etickets</span>
          </Link>
        </div>

        <nav className="p-3">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3.5 py-2.5 rounded-md
                      text-sm font-medium transition-all duration-150
                      ${
                        isActive
                          ? "bg-[#f0f7ff] text-[#013DC4]"
                          : "text-[#425466] hover:bg-[#f6f9fc] hover:text-[#1a1f36]"
                      }
                    `}
                  >
                    <span className={isActive ? "text-[#013DC4]" : "text-[#697386]"}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-5 -right-12 md:hidden w-10 h-10 bg-white rounded-md shadow-md flex items-center justify-center"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-7 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100"
            >
              <Menu size={20} className="text-gray-600" />
            </button>

            <h1 className="text-lg md:text-xl font-semibold text-[#1a1f36] tracking-tight">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="w-9 h-9 border border-gray-200 bg-white rounded-md flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <RefreshCw size={16} className="text-[#697386]" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
