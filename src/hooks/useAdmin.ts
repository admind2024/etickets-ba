import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminCheck {
  isAdmin: boolean;
  isLoading: boolean;
  userEmail: string | null;
}

export const useAdmin = (): AdminCheck => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async () => {
    setIsLoading(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        setIsAdmin(false);
        setUserEmail(null);
        setIsLoading(false);
        return;
      }

      setUserEmail(user.email);

      // Check if email exists in Admin table
      const { data, error } = await supabase.from("Admin").select("email").eq("email", user.email).maybeSingle();

      if (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
    } catch (error) {
      console.error("Admin check error:", error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAdmin, isLoading, userEmail };
};

export default useAdmin;
