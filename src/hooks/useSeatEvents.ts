import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TicketCategory {
  category: string;
  price: number;
  type?: "regular" | "table";
  tableFixedPrice?: number;
  description?: string;
}

export interface SeatEvent {
  ID: string;
  name: string;
  Title?: string;
  capacity?: string;
  serviceFeePercentage?: number;
  biletarnicaFee?: number;
  pdvPercentage?: number;
  date?: string;
  endDate?: string;
  time?: string;
  venue?: string;
  workspaceKey?: string;
  eventId?: string;
  eventKey?: string;
  currency?: string;
  categories?: TicketCategory[] | string;
  "SeatEvents (Item)"?: string;
  online?: number;
  biletarnica?: number;
  termsOfUse?: string;
  info?: string;
  category?: string;
  Logo?: string;
  "Created Date"?: string;
  "Updated Date"?: string;
  Owner?: string;
  description?: TicketCategory[] | string;
  dogadjaj?: string;
}

export const parseSeatCategories = (categories: TicketCategory[] | string | null | undefined): TicketCategory[] => {
  if (!categories) return [];
  
  if (typeof categories === "string") {
    try {
      return JSON.parse(categories);
    } catch {
      return [];
    }
  }
  
  return categories;
};

export const useSeatEventByEventKey = (eventKey: string | undefined) => {
  return useQuery({
    queryKey: ["seat-event", "eventKey", eventKey],
    queryFn: async (): Promise<SeatEvent | null> => {
      if (!eventKey) return null;

      const { data, error } = await supabase
        .from("seat_events")
        .select("*")
        .eq("eventKey", eventKey)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        console.error("Error fetching seat event:", error);
        throw error;
      }

      return data;
    },
    enabled: !!eventKey,
  });
};

export const useSeatEventBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["seat-event", "slug", slug],
    queryFn: async (): Promise<SeatEvent | null> => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("seat_events")
        .select("*")
        .ilike("SeatEvents (Item)", `%${slug}%`)
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          const { data: dataByName, error: errorByName } = await supabase
            .from("seat_events")
            .select("*")
            .ilike("name", `%${slug.replace(/-/g, ' ')}%`)
            .limit(1)
            .single();
          
          if (errorByName) {
            if (errorByName.code === "PGRST116") return null;
            throw errorByName;
          }
          
          return dataByName;
        }
        throw error;
      }

      return data;
    },
    enabled: !!slug,
  });
};

export const calculateServiceFee = (
  basePrice: number,
  ticketCount: number,
  serviceFeePercentage: number = 5
): number => {
  const percentageFee = basePrice * (serviceFeePercentage / 100);
  const fixedFee = 0.30 * ticketCount;
  return Math.round((percentageFee + fixedFee) * 100) / 100;
};

export const calculateInsurance = (basePrice: number): number => {
  return Math.round(basePrice * 0.07 * 100) / 100;
};
