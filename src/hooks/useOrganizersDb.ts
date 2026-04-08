import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrganizerFromDb {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  logo: string | null;
  description: string | null;
  status: string | null;
  verified: boolean;
  featured: boolean;
}

export const useOrganizersDb = () => {
  return useQuery({
    queryKey: ["organizers-db"],
    queryFn: async (): Promise<OrganizerFromDb[]> => {
      const { data, error } = await supabase
        .from("organizers")
        .select("*")
        .eq("status", "active")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching organizers:", error);
        throw error;
      }

      return (data || []).map((org) => ({
        id: org.id,
        name: org.name || "",
        slug: org.slug || "",
        email: org.email,
        phone: org.phone,
        website: org.website,
        address: org.address,
        city: org.city,
        country: org.country,
        logo: org.logo,
        description: org.description,
        status: org.status,
        verified: org.verified || false,
        featured: org.featured || false,
      }));
    },
  });
};
