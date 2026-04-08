import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EventVariant {
  id: string;
  name: string;
  slug: string;
  date: string;
  event_time?: string;
  venue?: string;
  categories?: string;
  currency?: string;
  image?: string;
  eventType?: string;
}

export const useEventVariants = (eventName: string | undefined) => {
  return useQuery({
    queryKey: ["event-variants", eventName],
    queryFn: async (): Promise<EventVariant[]> => {
      if (!eventName) return [];

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("AboutEvents")
        .select("id, name, slug, date, event_time, venue, categories, currency, image, eventType")
        .eq("name", eventName)
        .gte("date", today)
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching event variants:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!eventName,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};
