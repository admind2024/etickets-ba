import { ReactNode } from "react";
import { Navigate, Link } from "react-router-dom";
import { Loader2, ShieldX } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";

interface AdminGuardProps {
  children: ReactNode;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const { isAdmin, isLoading, userEmail } = useAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Provjera pristupa...</p>
        </div>
      </div>
    );
  }

  if (!userEmail) {
    return <Navigate to="/admin-login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pristup odbijen</h1>
          <p className="text-gray-600 mb-2">Nemate dozvolu za pristup admin panelu.</p>
          <p className="text-sm text-gray-400 mb-6">{userEmail}</p>
          <Button asChild>
            <Link to="/">Povratak na pocetnu</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <div>{children}</div>;
};

export default AdminGuard;
