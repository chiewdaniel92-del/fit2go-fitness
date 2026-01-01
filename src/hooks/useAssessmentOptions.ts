import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AssessmentOption } from "@/types/assessment";

export function usePrimaryGoalOptions() {
  return useQuery({
    queryKey: ["assessment-options", "primary-goal"],
    queryFn: async (): Promise<AssessmentOption[]> => {
      const { data, error } = await supabase
        .from("assessment_options_primary_goal")
        .select("id, label, description, sort_order")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useCurrentStateOptions() {
  return useQuery({
    queryKey: ["assessment-options", "current-state"],
    queryFn: async (): Promise<AssessmentOption[]> => {
      const { data, error } = await supabase
        .from("assessment_options_current_state")
        .select("id, label, description, sort_order")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}
