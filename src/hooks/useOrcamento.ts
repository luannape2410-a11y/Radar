import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Lancamento = {
  id: string;
  exercicio: number;
  mes: number;
  unidade_id: string;
  subelemento_id: string;
  fornecedor_id: string | null;
  contrato_id: string | null;
  funcao: string | null;
  subfuncao: string | null;
  programa: string | null;
  fonte_recurso: string | null;
  valor_dotacao: number;
  valor_empenhado: number;
  valor_liquidado: number;
  valor_pago: number;
  observacao: string | null;
  origem: string | null;
  unidades: { id: string; nome: string; tipo: string } | null;
  subelementos: { id: string; codigo: string; descricao: string; categoria: string | null; grupo: string | null } | null;
  fornecedores: { id: string; nome: string } | null;
};

export function useLancamentos(exercicio?: number) {
  return useQuery({
    queryKey: ["lancamentos", exercicio],
    queryFn: async () => {
      let q = supabase
        .from("lancamentos")
        .select(
          "*, unidades(id,nome,tipo), subelementos(id,codigo,descricao,categoria,grupo), fornecedores(id,nome)"
        )
        .order("created_at", { ascending: false });
      if (exercicio) q = q.eq("exercicio", exercicio);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Lancamento[];
    },
  });
}

export function useUnidades() {
  return useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("unidades").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubelementos() {
  return useQuery({
    queryKey: ["subelementos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subelementos").select("*").order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFornecedores() {
  return useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContratos() {
  return useQuery({
    queryKey: ["contratos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*, fornecedores(nome), unidades(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}