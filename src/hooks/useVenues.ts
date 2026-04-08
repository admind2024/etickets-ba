import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "./usePerformers";

export interface Venue {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  capacity: number | null;
  description: string | null;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueInput {
  name: string;
  slug?: string;
  city: string;
  address?: string | null;
  capacity?: number | null;
  description?: string | null;
  image?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string | null;
}

export const useVenues = () => {
  return useQuery({
    queryKey: ["venues"],
    queryFn: async (): Promise<Venue[]> => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .order("city", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Venue[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useVenueBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["venue", slug],
    queryFn: async (): Promise<Venue | null> => {
      if (!slug) return null;
      const { data, error } = await supabase.from("venues").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as Venue | null;
    },
    enabled: !!slug,
  });
};

export const useCities = () => {
  return useQuery({
    queryKey: ["cities"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("venues").select("city").order("city");
      if (error) throw error;
      return [...new Set((data || []).map((v) => v.city))];
    },
  });
};

export const useCreateVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VenueInput): Promise<Venue> => {
      const slug = input.slug || generateSlug(`${input.name}-${input.city}`);
      const { data, error } = await supabase
        .from("venues")
        .insert({
          name: input.name,
          slug,
          city: input.city,
          address: input.address,
          capacity: input.capacity,
          description: input.description,
          image: input.image,
          latitude: input.latitude,
          longitude: input.longitude,
          google_maps_url: input.google_maps_url,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["venues"] }),
  });
};

export const useUpdateVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: VenueInput & { id: string }): Promise<Venue> => {
      const { data, error } = await supabase
        .from("venues")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["venues"] }),
  });
};

export const useDeleteVenue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("venues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["venues"] }),
  });
};
