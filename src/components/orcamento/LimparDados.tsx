import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function LimparDados() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [escopo, setEscopo] = useState<"lancamentos" | "tudo">("lancamentos");
  const [exercicio, setExercicio] = useState<string>("todos");
  const [loading, setLoading] = useState(false);

  async function executar() {
    setLoading(true);
    try {
      // Lançamentos
      let delLanc = supabase.from("lancamentos").delete();
      if (exercicio !== "todos") delLanc = delLanc.eq("exercicio", Number(exercicio));
      else delLanc = delLanc.not("id", "is", null);
      const { error: e1 } = await delLanc;
      if (e1) throw e1;

      // Importações (apenas se não filtrou exercício, ou filtra por exercício também)
      let delImp = supabase.from("importacoes").delete();
      if (exercicio !== "todos") delImp = delImp.eq("exercicio", Number(exercicio));
      else delImp = delImp.not("id", "is", null);
      await delImp;

      if (escopo === "tudo" && exercicio === "todos") {
        await supabase.from("contratos").delete().not("id", "is", null);
        await supabase.from("fornecedores").delete().not("id", "is", null);
        await supabase.from("subelementos").delete().not("id", "is", null);
        await supabase.from("unidades").delete().not("id", "is", null);
      }

      toast.success("Dados limpos com sucesso.");
      qc.invalidateQueries();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao limpar dados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" /> Limpar dados
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Limpar dados</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove permanentemente os registros selecionados. Não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Escopo</label>
            <Select value={escopo} onValueChange={(v) => setEscopo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lancamentos">Apenas lançamentos e importações</SelectItem>
                <SelectItem value="tudo">Tudo (inclui unidades, subelementos, fornecedores, contratos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Exercício</label>
            <Select value={exercicio} onValueChange={setExercicio} disabled={escopo === "tudo"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os exercícios</SelectItem>
                {[2023, 2024, 2025, 2026].map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {escopo === "tudo" && (
              <p className="text-xs text-muted-foreground">
                Limpeza total ignora filtro de exercício.
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); executar(); }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Limpando…" : "Confirmar limpeza"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}