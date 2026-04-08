import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Player {
  id: string;
  team_id: string;
  name: string;
  slug: string | null;
  number: number | null;
  position: string | null;
  image: string | null;
  nationality: string | null;
  is_captain: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerInput {
  team_id: string;
  name: string;
  slug?: string | null;
  number?: number | null;
  position?: string | null;
  image?: string | null;
  nationality?: string | null;
  is_captain?: boolean;
}

export const POSITION_OPTIONS = [
  { value: "GK", label: "Golman" },
  { value: "DF", label: "Defanzivac" },
  { value: "MF", label: "Vezni" },
  { value: "FW", label: "Napadač" },
] as const;

export const POSITION_LABELS: Record<string, Record<string, string>> = {
  me: { GK: "Golman", DF: "Defanzivac", MF: "Vezni", FW: "Napadač" },
  en: { GK: "Goalkeeper", DF: "Defender", MF: "Midfielder", FW: "Forward" },
  ru: { GK: "Вратарь", DF: "Защитник", MF: "Полузащитник", FW: "Нападающий" },
};

export const getPositionLabel = (position: string, lang: string = "me"): string => {
  return POSITION_LABELS[lang]?.[position] || position;
};

export const usePlayersByTeam = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ["players", "team", teamId],
    queryFn: async (): Promise<Player[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .order("number", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Player[];
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePlayers = () => {
  return useQuery({
    queryKey: ["players"],
    queryFn: async (): Promise<Player[]> => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("team_id", { ascending: true })
        .order("number", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as Player[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreatePlayer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlayerInput): Promise<Player> => {
      const { data, error } = await supabase
        .from("players")
        .insert({
          team_id: input.team_id,
          name: input.name,
          slug: input.slug || input.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          number: input.number,
          position: input.position,
          image: input.image,
          nationality: input.nationality,
          is_captain: input.is_captain || false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Player;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });
};

export const useUpdatePlayer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: PlayerInput & { id: string }): Promise<Player> => {
      const { data, error } = await supabase
        .from("players")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Player;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });
};

export const useDeletePlayer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("players").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["players"] }),
  });
};
