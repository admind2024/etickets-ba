import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SeatStatus = "available" | "reserved" | "sold" | "away_fans" | "blocked";

export interface StadiumSeat {
  id: string;
  event_id: string;
  section: string;
  row: string;
  seat_number: string;
  status: SeatStatus;
  reserved_session_id: string | null;
  reserved_at: string | null;
  sold_ticket_id: string | null;
  created_at: string;
}

export interface SectionAvailability {
  section: string;
  total: number;
  available: number;
  reserved: number;
  sold: number;
  away_fans: number;
  blocked: number;
}

export interface BulkSeatInput {
  event_id: string;
  section: string;
  rowStart: string;
  rowEnd: string;
  seatsPerRow: number;
  rowType: "letters" | "numbers";
}

export interface ReservedSeat {
  seat_id: string;
  seat_row: string;
  seat_number: string;
}

// ═══════════════════════════════════════════════════════════════
// ADMIN HOOKS
// ═══════════════════════════════════════════════════════════════

/** Fetch all seats for an event (admin) */
export const useEventSeats = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["stadium-seats", eventId],
    queryFn: async (): Promise<StadiumSeat[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("stadium_seats")
        .select("id, section, row, seat_number, status")
        .eq("event_id", eventId)
        .order("section", { ascending: true })
        .order("row", { ascending: true })
        .order("seat_number", { ascending: true });
      if (error) throw error;
      return (data || []) as StadiumSeat[];
    },
    enabled: !!eventId,
    staleTime: 30000,
  });
};

/** Get section summaries for an event (admin dashboard) — SQL aggregation via RPC */
export const useSectionSummary = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["stadium-seats-summary", eventId],
    queryFn: async (): Promise<SectionAvailability[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase.rpc("get_seat_availability", {
        p_event_id: eventId,
      });
      if (error) throw error;
      return (data || []) as SectionAvailability[];
    },
    enabled: !!eventId,
    staleTime: 30000,
  });
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC HOOKS
// ═══════════════════════════════════════════════════════════════

/** Get available seat count per section for a match (public page) — SQL aggregation via RPC */
export const useSeatAvailability = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["seat-availability", eventId],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!eventId) return {};

      const { data, error } = await supabase.rpc("get_seat_availability", {
        p_event_id: eventId,
      });
      if (error) throw error;

      // No rows = no seats configured → unlimited mode
      if (!data || data.length === 0) return {};

      const availability: Record<string, number> = {};
      (data as SectionAvailability[]).forEach((r) => {
        availability[r.section] = r.available;
      });
      return availability;
    },
    enabled: !!eventId,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false, // pause polling when tab is hidden
  });
};

/** Check if event has stadium seats configured */
export const useHasStadiumSeats = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ["has-stadium-seats", eventId],
    queryFn: async (): Promise<boolean> => {
      if (!eventId) return false;
      const { count, error } = await supabase
        .from("stadium_seats")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);
      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!eventId,
    staleTime: 60000,
  });
};

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

/** Bulk create seats for a section */
export const useBulkCreateSeats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkSeatInput): Promise<number> => {
      const rows = generateRows(input.rowStart, input.rowEnd, input.rowType);
      const seats: Array<{
        event_id: string;
        section: string;
        row: string;
        seat_number: string;
        status: string;
      }> = [];

      for (const row of rows) {
        for (let seatNum = 1; seatNum <= input.seatsPerRow; seatNum++) {
          seats.push({
            event_id: input.event_id,
            section: input.section,
            row: row,
            seat_number: String(seatNum),
            status: "available",
          });
        }
      }

      // Insert in batches of 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < seats.length; i += BATCH_SIZE) {
        const batch = seats.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("stadium_seats").insert(batch);
        if (error) throw error;
      }

      return seats.length;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stadium-seats", variables.event_id] });
      queryClient.invalidateQueries({ queryKey: ["stadium-seats-summary", variables.event_id] });
      queryClient.invalidateQueries({ queryKey: ["seat-availability", variables.event_id] });
      queryClient.invalidateQueries({ queryKey: ["has-stadium-seats", variables.event_id] });
    },
  });
};

/** Update status of specific seats */
export const useUpdateSeatStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      seatIds,
      status,
    }: {
      seatIds: string[];
      status: SeatStatus;
      eventId: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from("stadium_seats")
        .update({ status, reserved_session_id: null, reserved_at: null, sold_ticket_id: null })
        .in("id", seatIds);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stadium-seats", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["stadium-seats-summary", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["seat-availability", variables.eventId] });
    },
  });
};

/** Update status of seats by section + row range */
export const useUpdateSeatsByRange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      section,
      rows,
      status,
    }: {
      eventId: string;
      section: string;
      rows?: string[];
      status: SeatStatus;
    }): Promise<number> => {
      let query = supabase
        .from("stadium_seats")
        .update({ status, reserved_session_id: null, reserved_at: null, sold_ticket_id: null })
        .eq("event_id", eventId)
        .eq("section", section);

      if (rows && rows.length > 0) {
        query = query.in("row", rows);
      }

      // Only allow changing from certain statuses
      if (status === "away_fans" || status === "blocked") {
        query = query.in("status", ["available"]);
      } else if (status === "available") {
        query = query.in("status", ["away_fans", "blocked", "reserved"]);
      }

      const { data, error } = await query.select("id");
      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stadium-seats", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["stadium-seats-summary", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["seat-availability", variables.eventId] });
    },
  });
};

/** Delete all seats for a section */
export const useDeleteSectionSeats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, section }: { eventId: string; section: string }): Promise<void> => {
      const { error } = await supabase
        .from("stadium_seats")
        .delete()
        .eq("event_id", eventId)
        .eq("section", section);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stadium-seats", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["stadium-seats-summary", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["seat-availability", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["has-stadium-seats", variables.eventId] });
    },
  });
};

/** Reserve seats via RPC (called before checkout) */
export const useReserveSeats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      section,
      quantity,
      sessionId,
    }: {
      eventId: string;
      section: string;
      quantity: number;
      sessionId: string;
    }): Promise<ReservedSeat[]> => {
      const { data, error } = await supabase.rpc("reserve_seats", {
        p_event_id: eventId,
        p_section: section,
        p_quantity: quantity,
        p_session_id: sessionId,
      });
      if (error) throw error;
      return (data || []) as ReservedSeat[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["seat-availability", variables.eventId] });
    },
  });
};

/** Release reserved seats (if checkout cancelled) */
export const useReleaseSeats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }): Promise<void> => {
      const { error } = await supabase.rpc("release_seats", {
        p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seat-availability"] });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateRows(start: string, end: string, type: "letters" | "numbers"): string[] {
  const rows: string[] = [];

  if (type === "letters") {
    const startCode = start.toUpperCase().charCodeAt(0);
    const endCode = end.toUpperCase().charCodeAt(0);
    for (let i = startCode; i <= endCode; i++) {
      rows.push(String.fromCharCode(i));
    }
  } else {
    const startNum = parseInt(start);
    const endNum = parseInt(end);
    for (let i = startNum; i <= endNum; i++) {
      rows.push(String(i));
    }
  }

  return rows;
}
