import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, Plus } from "lucide-react";
import { fmtBRL } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LancamentoForm } from "./LancamentoForm";
import type { Lancamento } from "@/hooks/useOrcamento";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TabelaLancamentos({ lancamentos }: { lancamentos: Lancamento[] }) {
  const [editar, setEditar] = useState<Lancamento | null>(null);
  const [novo, setNovo] = useState(false);
  const [excluir, setExcluir] = useState<Lancamento | null>(null);
  const qc = useQueryClient();

  async function confirmarExclusao() {
    if (!excluir) return;
    const { error } = await supabase.from("lancamentos").delete().eq("id", excluir.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Lançamento excluído.");
      qc.invalidateQueries();
    }
    setExcluir(null);
  }

  return (
    <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">Lançamentos</h3>
          <p className="text-xs text-muted-foreground">{lancamentos.length} registros</p>
        </div>
        <Button size="sm" onClick={() => setNovo(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo lançamento
        </Button>
      </div>
      <ScrollArea className="h-[480px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Subelemento</th>
              <th className="px-3 py-2 text-left">Unidade</th>
              <th className="px-3 py-2 text-left">Fornecedor</th>
              <th className="px-3 py-2 text-right">Pago</th>
              <th className="px-3 py-2 text-right w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lancamentos.map((l) => (
              <tr key={l.id} className="hover:bg-muted/30">
                <td className="px-3 py-2">
                  <div className="font-mono text-xs">{l.subelementos?.codigo}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[260px]">{l.subelementos?.descricao}</div>
                </td>
                <td className="px-3 py-2 text-xs">{l.unidades?.nome}</td>
                <td className="px-3 py-2 text-xs">{l.fornecedores?.nome ?? "—"}</td>
                <td className="px-3 py-2 text-right font-medium">{fmtBRL(l.valor_pago)}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEditar(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setExcluir(l)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {lancamentos.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted-foreground py-12 text-sm">Nenhum lançamento encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </ScrollArea>

      {novo && <LancamentoForm open={novo} onOpenChange={setNovo} />}
      {editar && <LancamentoForm open={!!editar} onOpenChange={(o) => !o && setEditar(null)} lancamento={editar} />}
      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}