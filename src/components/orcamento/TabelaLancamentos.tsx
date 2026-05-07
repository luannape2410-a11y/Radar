import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Search, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
  const [filtros, setFiltros] = useState({ subelemento: "", unidade: "", fornecedor: "", pago: "" });
  const [ordem, setOrdem] = useState<{ campo: "subelemento" | "unidade" | "fornecedor" | "pago"; dir: "asc" | "desc" } | null>({ campo: "pago", dir: "desc" });
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

  const filtrados = useMemo(() => {
    const sub = filtros.subelemento.toLowerCase().trim();
    const uni = filtros.unidade.toLowerCase().trim();
    const forn = filtros.fornecedor.toLowerCase().trim();
    const pagoMin = filtros.pago.trim() ? Number(filtros.pago.replace(",", ".")) : null;
    let out = lancamentos.filter((l) => {
      if (sub) {
        const t = `${l.subelementos?.codigo ?? ""} ${l.subelementos?.descricao ?? ""}`.toLowerCase();
        if (!t.includes(sub)) return false;
      }
      if (uni && !(l.unidades?.nome ?? "").toLowerCase().includes(uni)) return false;
      if (forn && !(l.fornecedores?.nome ?? "").toLowerCase().includes(forn)) return false;
      if (pagoMin !== null && !Number.isNaN(pagoMin) && Number(l.valor_pago) < pagoMin) return false;
      return true;
    });
    if (ordem) {
      const dir = ordem.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const get = (l: Lancamento) => {
          switch (ordem.campo) {
            case "subelemento": return l.subelementos?.codigo ?? "";
            case "unidade": return l.unidades?.nome ?? "";
            case "fornecedor": return l.fornecedores?.nome ?? "";
            case "pago": return Number(l.valor_pago);
          }
        };
        const va = get(a), vb = get(b);
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    return out;
  }, [lancamentos, filtros, ordem]);

  const temFiltro = !!(filtros.subelemento || filtros.unidade || filtros.fornecedor || filtros.pago);

  function toggleOrdem(campo: "subelemento" | "unidade" | "fornecedor" | "pago") {
    setOrdem((cur) => {
      if (!cur || cur.campo !== campo) return { campo, dir: "asc" };
      if (cur.dir === "asc") return { campo, dir: "desc" };
      return null;
    });
  }

  function IconeOrdem({ campo }: { campo: "subelemento" | "unidade" | "fornecedor" | "pago" }) {
    if (ordem?.campo !== campo) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return ordem.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  return (
    <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">Lançamentos</h3>
          <p className="text-xs text-muted-foreground">
            {filtrados.length} de {lancamentos.length} registros
          </p>
        </div>
        <Button size="sm" onClick={() => setNovo(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo lançamento
        </Button>
      </div>
      <div className="grid gap-2 border-b bg-muted/20 px-4 py-3 md:grid-cols-[1.4fr_1fr_1fr_140px_auto]">
        <FiltroInput
          placeholder="Filtrar subelemento (código ou descrição)"
          value={filtros.subelemento}
          onChange={(v) => setFiltros((f) => ({ ...f, subelemento: v }))}
        />
        <FiltroInput
          placeholder="Filtrar unidade"
          value={filtros.unidade}
          onChange={(v) => setFiltros((f) => ({ ...f, unidade: v }))}
        />
        <FiltroInput
          placeholder="Filtrar fornecedor"
          value={filtros.fornecedor}
          onChange={(v) => setFiltros((f) => ({ ...f, fornecedor: v }))}
        />
        <FiltroInput
          placeholder="Pago ≥"
          value={filtros.pago}
          onChange={(v) => setFiltros((f) => ({ ...f, pago: v }))}
          numeric
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!temFiltro}
          onClick={() => setFiltros({ subelemento: "", unidade: "", fornecedor: "", pago: "" })}
        >
          <X className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
      </div>
      <ScrollArea className="h-[480px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left"><BotaoOrdem onClick={() => toggleOrdem("subelemento")}>Subelemento <IconeOrdem campo="subelemento" /></BotaoOrdem></th>
              <th className="px-3 py-2 text-left"><BotaoOrdem onClick={() => toggleOrdem("unidade")}>Unidade <IconeOrdem campo="unidade" /></BotaoOrdem></th>
              <th className="px-3 py-2 text-left"><BotaoOrdem onClick={() => toggleOrdem("fornecedor")}>Fornecedor <IconeOrdem campo="fornecedor" /></BotaoOrdem></th>
              <th className="px-3 py-2 text-right"><BotaoOrdem onClick={() => toggleOrdem("pago")} className="ml-auto">Pago <IconeOrdem campo="pago" /></BotaoOrdem></th>
              <th className="px-3 py-2 text-right w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.map((l) => (
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
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-12 text-sm">
                  {lancamentos.length === 0 ? "Nenhum lançamento encontrado." : "Nenhum resultado para os filtros aplicados."}
                </td>
              </tr>
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

function FiltroInput({
  placeholder,
  value,
  onChange,
  numeric,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={numeric ? "decimal" : undefined}
        className="h-9 pl-7 text-xs"
      />
    </div>
  );
}

function BotaoOrdem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${className ?? ""}`}
    >
      {children}
    </button>
  );
}