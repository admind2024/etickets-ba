import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "./usePerformers";

export interface Team {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  sport: string;
  logo: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamInput {
  name: string;
  slug?: string;
  short_name?: string | null;
  sport: string;
  logo?: string | null;
  city?: string | null;
  country?: string | null;
}

export const SPORT_OPTIONS = [
  { value: "football", label: "Fudbal" },
  { value: "basketball", label: "Košarka" },
  { value: "handball", label: "Rukomet" },
  { value: "volleyball", label: "Odbojka" },
  { value: "water_polo", label: "Vaterpolo" },
  { value: "tennis", label: "Tenis" },
  { value: "other", label: "Ostalo" },
] as const;

export const getSportLabel = (value: string): string => {
  return SPORT_OPTIONS.find((s) => s.value === value)?.label || value;
};

export const useTeams = () => {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("sport", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Team[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useTeamsBySport = (sport: string | undefined) => {
  return useQuery({
    queryKey: ["teams", "sport", sport],
    queryFn: async (): Promise<Team[]> => {
      if (!sport) return [];
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("sport", sport)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Team[];
    },
    enabled: !!sport,
    staleTime: 1000 * 60 * 5,
  });
};

export const useTeamById = (id: string | undefined) => {
  return useQuery({
    queryKey: ["team", id],
    queryFn: async (): Promise<Team | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from("teams").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Team | null;
    },
    enabled: !!id,
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TeamInput): Promise<Team> => {
      const slug = input.slug || generateSlug(`${input.name}-${input.sport}`);
      const { data, error } = await supabase
        .from("teams")
        .insert({
          name: input.name,
          slug,
          short_name: input.short_name,
          sport: input.sport,
          logo: input.logo,
          city: input.city,
          country: input.country || "ME",
        })
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: TeamInput & { id: string }): Promise<Team> => {
      const { data, error } = await supabase
        .from("teams")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });
};
