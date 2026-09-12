import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Resuelve nombre/teléfono/avatar de un conjunto de user ids en una sola
 * consulta, con cache por combinación de ids. Reemplaza el patrón repetido
 * de "traer ids, después traer profiles, después armar un Map" que estaba
 * duplicado en cliente.tsx, pro.tsx y admin.tsx.
 */
export function useProfileLookup(ids: (string | null | undefined)[]) {
  const uniqueIds = [...new Set(ids.filter((id): id is string => !!id))].sort();
  const key = uniqueIds.join(",");

  const query = useQuery({
    queryKey: ["profile-lookup", key],
    enabled: uniqueIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").in("id", uniqueIds);
      if (error) throw error;
      return data;
    },
  });

  const map = new Map((query.data ?? []).map((p) => [p.id, p]));

  return {
    isLoading: query.isLoading,
    profiles: query.data ?? [],
    profileOf: (id: string): Profile | undefined => map.get(id),
    nameOf: (id: string, fallback = "Usuario"): string => map.get(id)?.full_name ?? fallback,
  };
}