import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============ TYPES ============

export interface Performer {
  id: string;
  name: string;
  slug: string;
  biography?: string;
  image?: string;
  type?: string; // Pjevač, Glumac, Stand Up komičar, Bend, DJ, itd.
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PerformerInput {
  name: string;
  slug: string;
  biography?: string;
  image?: string;
  type?: string;
  seo_title?: string;
  seo_description?: string;
}

// ============ HELPERS ============

/**
 * Generiše URL-friendly slug od teksta
 * Normalizuje dijakritike (č, ć, š, ž, đ) i uklanja specijalne karaktere
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

// ============ QUERIES ============

export const usePerformers = () => {
  return useQuery({
    queryKey: ["performers"],
    queryFn: async (): Promise<Performer[]> => {
      const { data, error } = await supabase
        .from("performers")
        .select("id, name, slug, biography, image, type, seo_title, seo_description, created_at, updated_at")
        .order("name");

      if (error) {
        console.error("Error fetching performers:", error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minuta
  });
};

export const usePerformerBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ["performer", slug],
    queryFn: async (): Promise<Performer | null> => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("performers")
        .select("id, name, slug, biography, image, type, seo_title, seo_description, created_at, updated_at")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error("Error fetching performer by slug:", error);
        throw error;
      }

      return data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

// ============ MUTATIONS ============

// CREATE
export const useCreatePerformer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PerformerInput): Promise<Performer> => {
      const { data, error } = await supabase
        .from("performers")
        .insert({
          name: input.name,
          slug: input.slug,
          biography: input.biography || null,
          image: input.image || null,
          type: input.type || "Izvođač",
          seo_title: input.seo_title || null,
          seo_description: input.seo_description || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating performer:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performers"] });
    },
  });
};

// UPDATE
export const useUpdatePerformer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PerformerInput & { id: string }): Promise<Performer> => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("performers")
        .update({
          name: updates.name,
          slug: updates.slug,
          biography: updates.biography || null,
          image: updates.image || null,
          type: updates.type || "Izvođač",
          seo_title: updates.seo_title || null,
          seo_description: updates.seo_description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating performer:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["performers"] });
      queryClient.invalidateQueries({ queryKey: ["performer", data.slug] });
    },
  });
};

// DELETE
export const useDeletePerformer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("performers").delete().eq("id", id);

      if (error) {
        console.error("Error deleting performer:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performers"] });
    },
  });
};
