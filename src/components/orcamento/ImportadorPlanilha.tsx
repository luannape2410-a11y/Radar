import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function ImportadorPlanilha() {
  const [open, setOpen] = useState(false);
  const [exercicio, setExercicio] = useState(new Date().getFullYear());
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function processar() {
    if (!arquivo) return;
    setLoading(true);
    try {
      const buf = await arquivo.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets["DESPESAS"] ?? wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

      // Encontrar linha de cabeçalho (contém "Código")
      const headerIdx = rows.findIndex((r: any) => r?.[0] === "Código");
      if (headerIdx < 0) throw new Error("Cabeçalho 'Código' não encontrado.");
      const header = rows[headerIdx] as (string | null)[];
      const unidades = header.slice(3).filter(Boolean) as string[];

      // Garantir unidades
      const { data: unidadesDb } = await supabase
        .from("unidades")
        .upsert(unidades.map((nome) => ({ nome, tipo: detectarTipo(nome) })), { onConflict: "nome" })
        .select();

      const mapaUnidade = new Map((unidadesDb ?? []).map((u: any) => [u.nome, u.id]));

      // Coletar subelementos e lançamentos
      const subsMap = new Map<string, string>();
      const lancRaw: { unidade: string; cod: string; valor: number }[] = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i] as any[];
        const cod = r?.[0];
        const desc = r?.[1];
        if (!cod) continue;
        const codStr = String(cod).trim();
        subsMap.set(codStr, String(desc ?? "").trim());
        for (let j = 0; j < unidades.length; j++) {
          const v = r[3 + j];
          if (typeof v === "number" && v !== 0) {
            lancRaw.push({ unidade: unidades[j], cod: codStr, valor: v });
          }
        }
      }

      // Upsert subelementos
      const subsRows = Array.from(subsMap.entries()).map(([codigo, descricao]) => {
        const p = codigo.split(".");
        return {
          codigo,
          descricao,
          categoria: p[0] ?? null,
          grupo: p[1] ?? null,
          modalidade: p[2] ?? null,
          elemento: p[3] ?? null,
          subelemento: p[4] ?? null,
        };
      });
      const { data: subsDb } = await supabase
        .from("subelementos")
        .upsert(subsRows, { onConflict: "codigo" })
        .select();
      const mapaSub = new Map((subsDb ?? []).map((s: any) => [s.codigo, s.id]));

      // Registrar importação
      const { data: imp } = await supabase
        .from("importacoes")
        .insert({
          arquivo_nome: arquivo.name,
          exercicio,
          total_linhas: lancRaw.length,
          total_valor: lancRaw.reduce((s, l) => s + l.valor, 0),
        })
        .select()
        .single();

      // Inserir lançamentos em lotes
      const lancRows = lancRaw
        .map((l) => ({
          exercicio,
          mes: 12,
          unidade_id: mapaUnidade.get(l.unidade),
          subelemento_id: mapaSub.get(l.cod),
          valor_pago: l.valor,
          valor_empenhado: l.valor,
          valor_liquidado: l.valor,
          origem: "importacao",
          importacao_id: imp?.id,
        }))
        .filter((r) => r.unidade_id && r.subelemento_id);

      const lote = 200;
      for (let i = 0; i < lancRows.length; i += lote) {
        const { error } = await supabase.from("lancamentos").insert(lancRows.slice(i, i + lote));
        if (error) throw error;
      }

      toast.success(`Importação concluída: ${lancRows.length} lançamentos.`);
      qc.invalidateQueries();
      setOpen(false);
      setArquivo(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao importar.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Importar planilha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar planilha de despesas</DialogTitle>
          <DialogDescription>
            Mesmo padrão do arquivo modelo: aba "DESPESAS" com colunas Código, Descrição, Tipo e uma coluna por unidade administrativa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Exercício</Label>
            <Input type="number" value={exercicio} onChange={(e) => setExercicio(Number(e.target.value))} />
          </div>
          <div>
            <Label>Arquivo .xlsx</Label>
            <Input type="file" accept=".xlsx,.xls" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={processar} disabled={!arquivo || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Processar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function detectarTipo(nome: string) {
  const n = nome.toUpperCase();
  if (n.includes("FUNDO")) return "Fundo";
  if (["LEGISLATIVO", "CONTROLADORIA", "PROCURADORIA"].some((k) => n.includes(k))) return "Órgão";
  return "Secretaria";
}