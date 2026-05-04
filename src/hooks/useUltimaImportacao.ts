import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUltimaImportacao() {
  return useQuery({
    queryKey: ["ultima-importacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes")
        .select("created_at, arquivo_nome, exercicio")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}