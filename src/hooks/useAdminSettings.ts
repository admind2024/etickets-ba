import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type OcrMode = "strict" | "relaxed";

export function useOcrMode() {
  const queryClient = useQueryClient();

  const { data: mode = "strict" as OcrMode, isLoading } = useQuery<OcrMode>({
    queryKey: ["admin-settings", "ocr_mode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "ocr_mode")
        .single();
      if (error) {
        console.error("Failed to fetch ocr_mode:", error);
        return "strict";
      }
      // Handle both raw string and JSON-stringified values
      let val = data?.value;
      if (typeof val === "string") {
        try { val = JSON.parse(val); } catch { /* keep as-is */ }
      }
      return (val === "relaxed" ? "relaxed" : "strict") as OcrMode;
    },
    staleTime: 30_000, // 30s cache for checkout page
  });

  const { mutate: setMode, isPending: isSaving } = useMutation({
    mutationFn: async (newMode: OcrMode) => {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({ key: "ocr_mode", value: newMode as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      return newMode;
    },
    onSuccess: (newMode) => {
      queryClient.setQueryData(["admin-settings", "ocr_mode"], newMode);
      toast.success(
        newMode === "strict"
          ? "Striktni mod aktiviran (samo CG dokumenti)"
          : "Opušteni mod aktiviran (svi dokumenti)"
      );
    },
    onError: (err: any) => {
      toast.error("Greška pri spremanju: " + (err.message || "Nepoznata greška"));
    },
  });

  const toggle = () => setMode(mode === "strict" ? "relaxed" : "strict");

  return { mode, isLoading, isSaving, setMode, toggle };
}
