import { useCallback, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

type Linha = {
  orgao: string;
  unidade: string;
  codigo: string;
  descricao: string;
  valorPago: number;
};

const RE_ORG = /Org[ãa]o:\s*(\S+)\s+(.+)/;
const RE_UNI = /Unidade:\s*(\S+)\s+(.+)/;
const RE_LINHA = /^(\d\.\d\.\d{2}\.\d{2}\.\d{2})\s+(.+?)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/;

function num(s: string) {
  return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function detectarTipo(nome: string) {
  const n = nome.toUpperCase();
  if (n.includes("FUNDO")) return "Fundo";
  if (["LEGISLATIVO", "CONTROLADORIA", "PROCURADORIA"].some((k) => n.includes(k)))
    return "Órgão";
  return "Secretaria";
}

async function extrairLinhas(file: File): Promise<Linha[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const linhas: Linha[] = [];
  let orgao = "";
  let unidade = "";

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Reagrupar itens por linha (Y aproximado)
    const porY = new Map<number, { x: number; str: string }[]>();
    for (const it of content.items as any[]) {
      const y = Math.round(it.transform[5]);
      if (!porY.has(y)) porY.set(y, []);
      porY.get(y)!.push({ x: it.transform[4], str: it.str });
    }
    const linhasTxt = Array.from(porY.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, arr]) =>
        arr
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
      );

    for (const linha of linhasTxt) {
      const mo = RE_ORG.exec(linha);
      if (mo) {
        orgao = `${mo[1]} ${mo[2]}`.trim();
        continue;
      }
      const mu = RE_UNI.exec(linha);
      if (mu) {
        unidade = `${mu[1]} ${mu[2]}`.trim();
        continue;
      }
      const ml = RE_LINHA.exec(linha);
      if (!ml) continue;
      const cod = ml[1];
      if (cod.endsWith(".00")) continue; // só subelementos
      linhas.push({
        orgao,
        unidade,
        codigo: cod,
        descricao: ml[2].trim(),
        valorPago: num(ml[3]),
      });
    }
  }
  return linhas;
}

export function ImportadorPDF() {
  const [open, setOpen] = useState(false);
  const [exercicio, setExercicio] = useState(new Date().getFullYear());
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState("");
  const qc = useQueryClient();

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith(".pdf")) setArquivo(f);
    else toast.error("Envie um arquivo .pdf");
  }, []);

  async function processar() {
    if (!arquivo) return;
    setLoading(true);
    try {
      setProgresso("Lendo PDF…");
      const linhas = await extrairLinhas(arquivo);
      if (!linhas.length) throw new Error("Nenhum subelemento encontrado no PDF.");

      setProgresso(`Preparando ${linhas.length} lançamentos…`);

      // Unidades únicas
      const unidadesNomes = Array.from(new Set(linhas.map((l) => l.unidade).filter(Boolean)));
      const { data: unidadesDb, error: errU } = await supabase
        .from("unidades")
        .upsert(
          unidadesNomes.map((nome) => ({ nome, tipo: detectarTipo(nome) })),
          { onConflict: "nome" }
        )
        .select();
      if (errU) throw errU;
      const mapaUnidade = new Map((unidadesDb ?? []).map((u: any) => [u.nome, u.id]));

      // Subelementos
      const subsMap = new Map<string, string>();
      linhas.forEach((l) => subsMap.set(l.codigo, l.descricao));
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
      const { data: subsDb, error: errS } = await supabase
        .from("subelementos")
        .upsert(subsRows, { onConflict: "codigo" })
        .select();
      if (errS) throw errS;
      const mapaSub = new Map((subsDb ?? []).map((s: any) => [s.codigo, s.id]));

      // Importação
      const { data: imp, error: errI } = await supabase
        .from("importacoes")
        .insert({
          arquivo_nome: arquivo.name,
          exercicio,
          total_linhas: linhas.length,
          total_valor: linhas.reduce((s, l) => s + l.valorPago, 0),
        })
        .select()
        .single();
      if (errI) throw errI;

      const lancRows = linhas
        .map((l) => ({
          exercicio,
          mes: 12,
          unidade_id: mapaUnidade.get(l.unidade),
          subelemento_id: mapaSub.get(l.codigo),
          valor_pago: l.valorPago,
          valor_empenhado: l.valorPago,
          valor_liquidado: l.valorPago,
          origem: "importacao_pdf",
          importacao_id: imp?.id,
        }))
        .filter((r) => r.unidade_id && r.subelemento_id);

      const lote = 200;
      for (let i = 0; i < lancRows.length; i += lote) {
        setProgresso(`Salvando ${Math.min(i + lote, lancRows.length)}/${lancRows.length}…`);
        const { error } = await supabase
          .from("lancamentos")
          .insert(lancRows.slice(i, i + lote));
        if (error) throw error;
      }

      toast.success(`PDF importado: ${lancRows.length} lançamentos.`);
      qc.invalidateQueries();
      setOpen(false);
      setArquivo(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao importar PDF.";
      toast.error(msg);
    } finally {
      setLoading(false);
      setProgresso("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileUp className="h-4 w-4 mr-2" />
          Importar PDF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar relatório em PDF</DialogTitle>
          <DialogDescription>
            Relatório "Natureza da Despesa segundo as Categorias Econômicas por Unidade
            Orçamentária" (PAGO – Acumulado). O sistema extrai Órgão, Unidade, Código,
            Descrição e Valor Pago.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Exercício</Label>
            <Input
              type="number"
              value={exercicio}
              onChange={(e) => setExercicio(Number(e.target.value))}
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={`rounded-md border-2 border-dashed p-6 text-center transition-colors ${
              drag ? "border-primary bg-primary/5" : "border-muted"
            }`}
          >
            <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm">
              {arquivo ? (
                <span className="font-medium">{arquivo.name}</span>
              ) : (
                <>Arraste o PDF aqui ou selecione abaixo</>
              )}
            </p>
            <Input
              type="file"
              accept="application/pdf,.pdf"
              className="mt-3"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
          </div>

          {progresso && (
            <p className="text-xs text-muted-foreground">{progresso}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={processar} disabled={!arquivo || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Processar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}