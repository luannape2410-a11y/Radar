import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUnidades, useSubelementos, useFornecedores, type Lancamento } from "@/hooks/useOrcamento";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lancamento?: Lancamento | null;
}

export function LancamentoForm({ open, onOpenChange, lancamento }: Props) {
  const { data: unidades = [] } = useUnidades();
  const { data: subs = [] } = useSubelementos();
  const { data: forn = [] } = useFornecedores();
  const qc = useQueryClient();

  const [form, setForm] = useState(() => ({
    exercicio: lancamento?.exercicio ?? new Date().getFullYear(),
    mes: lancamento?.mes ?? 12,
    unidade_id: lancamento?.unidade_id ?? "",
    subelemento_id: lancamento?.subelemento_id ?? "",
    fornecedor_id: lancamento?.fornecedor_id ?? "",
    valor_dotacao: lancamento?.valor_dotacao ?? 0,
    valor_empenhado: lancamento?.valor_empenhado ?? 0,
    valor_liquidado: lancamento?.valor_liquidado ?? 0,
    valor_pago: lancamento?.valor_pago ?? 0,
    fonte_recurso: lancamento?.fonte_recurso ?? "",
    funcao: lancamento?.funcao ?? "",
    programa: lancamento?.programa ?? "",
    observacao: lancamento?.observacao ?? "",
  }));

  async function salvar() {
    if (!form.unidade_id || !form.subelemento_id) {
      toast.error("Selecione unidade e subelemento.");
      return;
    }
    const payload = {
      ...form,
      fornecedor_id: form.fornecedor_id || null,
      origem: "manual",
    };
    const { error } = lancamento
      ? await supabase.from("lancamentos").update(payload).eq("id", lancamento.id)
      : await supabase.from("lancamentos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(lancamento ? "Atualizado." : "Lançamento criado.");
    qc.invalidateQueries();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lancamento ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Exercício</Label>
            <Input type="number" value={form.exercicio} onChange={(e) => setForm({ ...form, exercicio: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Mês</Label>
            <Input type="number" min={1} max={12} value={form.mes} onChange={(e) => setForm({ ...form, mes: Number(e.target.value) })} />
          </div>
          <div className="col-span-2">
            <Label>Unidade</Label>
            <Select value={form.unidade_id} onValueChange={(v) => setForm({ ...form, unidade_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {unidades.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Subelemento</Label>
            <Select value={form.subelemento_id} onValueChange={(v) => setForm({ ...form, subelemento_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="max-h-64">
                {subs.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.descricao}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Fornecedor (opcional)</Label>
            <Select value={form.fornecedor_id || "nenhum"} onValueChange={(v) => setForm({ ...form, fornecedor_id: v === "nenhum" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">— nenhum —</SelectItem>
                {forn.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Dotação (R$)</Label><Input type="number" step="0.01" value={form.valor_dotacao} onChange={(e) => setForm({ ...form, valor_dotacao: Number(e.target.value) })} /></div>
          <div><Label>Empenhado (R$)</Label><Input type="number" step="0.01" value={form.valor_empenhado} onChange={(e) => setForm({ ...form, valor_empenhado: Number(e.target.value) })} /></div>
          <div><Label>Liquidado (R$)</Label><Input type="number" step="0.01" value={form.valor_liquidado} onChange={(e) => setForm({ ...form, valor_liquidado: Number(e.target.value) })} /></div>
          <div><Label>Pago (R$)</Label><Input type="number" step="0.01" value={form.valor_pago} onChange={(e) => setForm({ ...form, valor_pago: Number(e.target.value) })} /></div>
          <div><Label>Função</Label><Input value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} /></div>
          <div><Label>Programa</Label><Input value={form.programa} onChange={(e) => setForm({ ...form, programa: e.target.value })} /></div>
          <div className="col-span-2"><Label>Fonte de recurso</Label><Input value={form.fonte_recurso} onChange={(e) => setForm({ ...form, fonte_recurso: e.target.value })} /></div>
          <div className="col-span-2"><Label>Observação</Label><Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}