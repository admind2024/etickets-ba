import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QRKarta {
  id: string;
  ticketId: string;
  "order number": string;
  sessionId: string;
  eventName: string;
  eventId: string;
  eventDate: string;
  eventTime: string;
  Lokacija: string;
  seatId: string;
  category: string;
  sectionLabel: string;
  categoryKey: string;
  categoryLabel: string;
  entrance: string;
  View: string;
  viewQuality: string;
  price: string;
  serviceFee: string;
  totalPrice: string;
  Valuta: string;
  customerName: string;
  "Customer Email": string;
  customerPhone: string;
  customerGender: string;
  city: string;
  country: string;
  qrCodeRaw: string;
  "QR Code": string;
  status: string;
  used: string | null;
  isUsed: string | null;
  validationCount: string | null;
  Purchasedate: string;
  purchaseTime: string;
  salesChannel: string;
  termsOfServiceAccepted: boolean;
  insurance: string | null;
  cardBrand: string;
  cardLast4: string;
  cardCountry: string;
  cardIssuer: string;
  fiscalInvoiceUrl: string | null;
  fiscalPdfUrl: string | null;
  fiscalizedAt: string | null;
  isFiscalized: string | null;
  created_at: string;
  [key: string]: any;
}

const PAGE_SIZE = 100;

// Parse date pattern from search term (DD.MM.YYYY, DD.MM, DD/MM/YYYY, DD/MM)
function parseDateFromSearch(term: string): { start: string; end: string } | null {
  // Try DD.MM.YYYY or DD/MM/YYYY (2 or 4 digit year)
  let match = term.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const start = new Date(year, month - 1, day);
      const end = new Date(year, month - 1, day + 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }

  // Try DD.MM or DD/MM (assume current year)
  match = term.match(/(\d{1,2})[./](\d{1,2})(?![./\d])/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const year = new Date().getFullYear();
      const start = new Date(year, month - 1, day);
      const end = new Date(year, month - 1, day + 1);
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }

  return null;
}

// Hook sa paginacijom, pretragom i event filterom
export const useQRKarteAdmin = (filters?: { search?: string; events?: string[] }) => {
  return useInfiniteQuery({
    queryKey: ["qr-karte-admin", filters?.search || "", filters?.events?.join(",") || ""],
    queryFn: async ({ pageParam = 0 }) => {
      const searchTerm = filters?.search?.trim() || null;
      const eventFilter = filters?.events && filters.events.length > 0 ? filters.events : null;

      let query = supabase
        .from("QRKarte")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false, nullsFirst: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (eventFilter) {
        if (eventFilter.length === 1) {
          query = query.eq("eventName", eventFilter[0]);
        } else {
          query = query.in("eventName", eventFilter);
        }
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const dateRange = parseDateFromSearch(searchTerm);

        let orClause = `customerName.ilike.%${term}%,Customer Email.ilike.%${term}%,customerPhone.ilike.%${term}%,ticketId.ilike.%${term}%,seatId.ilike.%${term}%,eventName.ilike.%${term}%`;

        if (dateRange) {
          orClause += `,and(created_at.gte.${dateRange.start},created_at.lt.${dateRange.end})`;
        }

        query = query.or(orClause);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data as QRKarta[],
        count: count || 0,
        pageParam,
        hasMore: (pageParam + 1) * PAGE_SIZE < (count || 0),
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.pageParam + 1 : undefined),
    initialPageParam: 0,
    staleTime: 30000,
  });
};

// Lista događaja sa brojem karata
export const useEventsWithCounts = () => {
  return useQuery({
    queryKey: ["events-with-counts"],
    queryFn: async () => {
      // Probaj RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_event_counts");

      if (!rpcError && rpcData) {
        return (rpcData as { event_name: string; ticket_count: number }[]).map((d) => ({
          name: d.event_name,
          count: d.ticket_count,
        }));
      }

      // Fallback: dohvati iz QRKarte
      const { data: karteData } = await supabase
        .from("QRKarte")
        .select("eventName")
        .not("eventName", "is", null)
        .limit(100000);

      if (!karteData) return [];

      const counts: Record<string, number> = {};
      karteData.forEach((k) => {
        if (k.eventName) {
          counts[k.eventName] = (counts[k.eventName] || 0) + 1;
        }
      });

      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 300000,
  });
};

// Lista događaja (samo imena - za kompatibilnost)
export const useEventsList = () => {
  return useQuery({
    queryKey: ["events-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("AboutEvents").select("name").not("name", "is", null).order("name");

      if (error) {
        const { data: karteData } = await supabase
          .from("QRKarte")
          .select("eventName")
          .not("eventName", "is", null)
          .limit(5000);

        const uniqueEvents = [...new Set((karteData || []).map((d) => d.eventName))].filter(Boolean).sort();
        return uniqueEvents as string[];
      }

      return data.map((d) => d.name).filter(Boolean) as string[];
    },
  });
};

// Update karta
export const useUpdateKarta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<QRKarta> }) => {
      // Ukloni read-only kolone
      const { id: _id, created_at: _ca, search_text: _st, ...cleanUpdates } = updates as any;
      const { data, error } = await supabase.from("QRKarte").update(cleanUpdates).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-karte-admin"] });
      queryClient.invalidateQueries({ queryKey: ["qr-karte-stats"] });
      toast.success("Karta ažurirana");
    },
    onError: (error: any) => {
      toast.error("Greška: " + error.message);
    },
  });
};

// Delete karta
export const useDeleteKarta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("QRKarte").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-karte-admin"] });
      queryClient.invalidateQueries({ queryKey: ["qr-karte-stats"] });
      toast.success("Karta obrisana");
    },
    onError: (error: any) => {
      toast.error("Greška: " + error.message);
    },
  });
};

// Clone karta
export const useCloneKarta = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (original: QRKarta) => {
      const { data, error } = await supabase.rpc("clone_ticket", {
        original_ticket_id: original.id,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Clone failed");

      // Postavi originalni sessionId na kloniranu kartu
      if (original.sessionId) {
        const newTicketId = data.ticket?.ticketId;
        const newId = data.ticket?.id;
        let updated = false;

        if (newTicketId) {
          const { error: err } = await supabase
            .from("QRKarte")
            .update({ sessionId: original.sessionId })
            .eq("ticketId", newTicketId);
          if (!err) updated = true;
        }

        if (!updated && newId) {
          const { error: err } = await supabase
            .from("QRKarte")
            .update({ sessionId: original.sessionId })
            .eq("id", newId);
          if (!err) updated = true;
        }

        if (!updated) {
          const { data: cloned } = await supabase
            .from("QRKarte")
            .select("id")
            .eq("Customer Email", original["Customer Email"])
            .eq("eventName", original.eventName)
            .like("sessionId", "clone_%")
            .order("created_at", { ascending: false })
            .limit(1);
          if (cloned && cloned.length > 0) {
            await supabase
              .from("QRKarte")
              .update({ sessionId: original.sessionId })
              .eq("id", cloned[0].id);
          }
        }
      }

      return data.ticket;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["qr-karte-admin"] });
      queryClient.invalidateQueries({ queryKey: ["qr-karte-stats"] });
      toast.success(`Nova karta kreirana: ${data.ticketId}`);
    },
    onError: (e: any) => toast.error("Greška pri kloniranju: " + e.message),
  });
};

// Statistike
export const useKarteStats = () => {
  return useQuery({
    queryKey: ["qr-karte-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("QRKarte").select("id", { count: "exact", head: true });

      const { count: usedCount } = await supabase
        .from("QRKarte")
        .select("id", { count: "exact", head: true })
        .or("used.eq.true,isUsed.eq.true");

      const { data: priceData } = await supabase.from("QRKarte").select("price, totalPrice, serviceFee").limit(100000);

      const totalRevenue = (priceData || []).reduce((sum, t) => sum + (parseFloat(t.totalPrice || "0") || 0), 0);
      const ticketRevenue = (priceData || []).reduce((sum, t) => sum + (parseFloat(t.price || "0") || 0), 0);
      const serviceFeeRevenue = (priceData || []).reduce((sum, t) => sum + (parseFloat(t.serviceFee || "0") || 0), 0);

      return {
        total: total || 0,
        totalRevenue,
        ticketRevenue,
        serviceFeeRevenue,
        usedCount: usedCount || 0,
      };
    },
    staleTime: 60000,
  });
};
