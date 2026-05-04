import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtBRL, fmtCompact } from "@/lib/format";
import type { Lancamento } from "@/hooks/useOrcamento";
import { ArrowDown, ArrowUp, Minus, AlertTriangle, FileText, FileSpreadsheet, FileType2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  exportarComparativoPDF,
  exportarComparativoXLSX,
  exportarComparativoDOCX,
  type AlertaComparativo,
  type ContextoComparativo,
} from "@/lib/exportarComparativo";
import { toast } from "@/hooks/use-toast";

type Props = {
  lancamentos: Lancamento[]; // todos os anos (já filtrados por unidade/função/busca, mas SEM filtro de exercício)
  exercicios: number[];
};

const CORES = ["hsl(215 60% 35%)", "hsl(168 65% 38%)", "hsl(38 92% 50%)", "hsl(0 75% 55%)", "hsl(265 50% 55%)"];

export function SecaoComparativo({ lancamentos, exercicios }: Props) {
  const [modo, setModo] = useState<"subelemento" | "unidade">("subelemento");
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>("todas");
  const [exibicaoUnidades, setExibicaoUnidades] = useState<"principal" | "todas">("principal");
  const anos = exercicios.length ? exercicios.slice().sort((a, b) => a - b) : [new Date().getFullYear()];

  // Lista de unidades disponíveis a partir dos lançamentos recebidos
  const unidadesDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of lancamentos) {
      if (l.unidade_id) map.set(l.unidade_id, l.unidades?.nome ?? "—");
    }
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [lancamentos]);

  // Aplica o filtro local de unidade
  const lancamentosFiltrados = useMemo(
    () => (unidadeFiltro === "todas" ? lancamentos : lancamentos.filter((l) => l.unidade_id === unidadeFiltro)),
    [lancamentos, unidadeFiltro]
  );

  // Agrega valor pago por (chave, ano)
  const { linhas, chaveLabel } = useMemo(() => {
    const chaveLabel = modo === "subelemento" ? "Subelemento" : "Unidade";
    const map = new Map<
      string,
      {
        rotulo: string;
        subtitulo?: string;
        unidades: Map<string, number>;
        unidadesPorAno: Map<string, Record<number, number>>;
        porAno: Record<number, number>;
      }
    >();
    for (const l of lancamentosFiltrados) {
      const id = modo === "subelemento" ? l.subelemento_id : l.unidade_id;
      const rotulo =
        modo === "subelemento"
          ? `${l.subelementos?.codigo ?? ""} — ${l.subelementos?.descricao ?? "—"}`
          : l.unidades?.nome ?? "—";
      const subtitulo = modo === "subelemento" ? l.subelementos?.categoria ?? undefined : l.unidades?.tipo;
      const cur =
        map.get(id) ??
        {
          rotulo,
          subtitulo,
          unidades: new Map<string, number>(),
          unidadesPorAno: new Map<string, Record<number, number>>(),
          porAno: {},
        };
      cur.porAno[l.exercicio] = (cur.porAno[l.exercicio] ?? 0) + Number(l.valor_pago);
      const nomeUni = l.unidades?.nome ?? "—";
      cur.unidades.set(nomeUni, (cur.unidades.get(nomeUni) ?? 0) + Number(l.valor_pago));
      const porAnoUni = cur.unidadesPorAno.get(nomeUni) ?? {};
      porAnoUni[l.exercicio] = (porAnoUni[l.exercicio] ?? 0) + Number(l.valor_pago);
      cur.unidadesPorAno.set(nomeUni, porAnoUni);
      map.set(id, cur);
    }
    const linhas = Array.from(map.entries())
      .map(([id, v]) => {
        const totais = anos.map((a) => v.porAno[a] ?? 0);
        const total = totais.reduce((s, x) => s + x, 0);
        const ultimo = totais[totais.length - 1] ?? 0;
        const penultimo = totais[totais.length - 2] ?? 0;
        const variacao = penultimo > 0 ? (ultimo - penultimo) / penultimo : null;
        const unidadesOrdenadas = Array.from(v.unidades.entries()).sort((a, b) => b[1] - a[1]);
        const unidadeTop = unidadesOrdenadas[0]?.[0] ?? "—";
        const unidadeLabel =
          unidadesOrdenadas.length > 1 ? `${unidadeTop} (+${unidadesOrdenadas.length - 1})` : unidadeTop;
        return { id, ...v, totais, total, variacao, unidadeLabel, unidadesCount: unidadesOrdenadas.length };
      })
      .sort((a, b) => b.total - a.total);
    return { linhas, chaveLabel };
  }, [lancamentosFiltrados, modo, anos]);

  const top = linhas.slice(0, 12);
  const dataChart = top.map((l) => {
    const row: Record<string, string | number> = { nome: l.rotulo.length > 32 ? l.rotulo.slice(0, 30) + "…" : l.rotulo };
    anos.forEach((a) => (row[String(a)] = l.porAno[a] ?? 0));
    return row;
  });

  // Alertas: subelementos cujo último exercício > exercício anterior
  const anoAtual = anos[anos.length - 1];
  const anoAnterior = anos.length >= 2 ? anos[anos.length - 2] : null;
  const alertasAumento = useMemo(() => {
    if (modo !== "subelemento" || anoAnterior === null) return [];
    return linhas
      .filter((l) => (l.porAno[anoAtual] ?? 0) > (l.porAno[anoAnterior] ?? 0) && (l.porAno[anoAnterior] ?? 0) > 0)
      .map((l) => {
        // Identifica apenas as unidades que aumentaram em relação ao ano anterior
        const unidadesAumento = Array.from(l.unidadesPorAno.entries())
          .map(([nome, porAno]) => {
            const at = porAno[anoAtual] ?? 0;
            const ant = porAno[anoAnterior] ?? 0;
            return { nome, atual: at, anterior: ant, delta: at - ant };
          })
          .filter((u) => u.delta > 0)
          .sort((a, b) => b.delta - a.delta);
        const unidadeTop = unidadesAumento[0]?.nome ?? "—";
        const unidadeLabelAumento =
          unidadesAumento.length > 1
            ? exibicaoUnidades === "todas"
              ? unidadesAumento.map((u) => u.nome).join(", ")
              : `${unidadeTop} (+${unidadesAumento.length - 1})`
            : unidadeTop;
        return {
          ...l,
          atual: l.porAno[anoAtual] ?? 0,
          anterior: l.porAno[anoAnterior] ?? 0,
          delta: (l.porAno[anoAtual] ?? 0) - (l.porAno[anoAnterior] ?? 0),
          unidadeLabel: unidadeLabelAumento,
          unidadesCount: unidadesAumento.length,
        };
      })
      .sort((a, b) => b.delta - a.delta);
  }, [linhas, modo, anoAtual, anoAnterior, exibicaoUnidades]);

  const nomeUnidade =
    unidadeFiltro === "todas"
      ? "Todas as unidades"
      : unidadesDisponiveis.find((u) => u.id === unidadeFiltro)?.nome ?? "Unidade";

  const handleExport = async (fmt: "pdf" | "xlsx" | "docx") => {
    if (anoAnterior === null) {
      toast({ title: "Sem comparação possível", description: "É necessário ter pelo menos dois exercícios.", variant: "destructive" });
      return;
    }
    const dados: AlertaComparativo[] = alertasAumento.map((a) => ({
      rotulo: a.rotulo,
      subtitulo: a.subtitulo,
      unidade: a.unidadeLabel,
      anterior: a.anterior,
      atual: a.atual,
      delta: a.delta,
      variacao: a.variacao,
    }));
    const ctx: ContextoComparativo = { anoAnterior, anoAtual, unidade: nomeUnidade };
    try {
      if (fmt === "pdf") exportarComparativoPDF(dados, ctx);
      else if (fmt === "xlsx") exportarComparativoXLSX(dados, ctx);
      else await exportarComparativoDOCX(dados, ctx);
      toast({ title: "Relatório gerado", description: `Arquivo .${fmt} baixado com sucesso.` });
    } catch (e) {
      toast({ title: "Erro ao exportar", description: String(e), variant: "destructive" });
    }
  };

  return (
    <section className="space-y-4">
      <Card className="p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Comparativo entre Anos</h2>
            <p className="text-sm text-muted-foreground">
              Compare o valor pago por {modo === "subelemento" ? "subelemento" : "unidade"} entre os exercícios disponíveis.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Comparar por</Label>
              <Select value={modo} onValueChange={(v) => setModo(v as "subelemento" | "unidade")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subelemento">Subelemento</SelectItem>
                  <SelectItem value="unidade">Unidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[240px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Unidade</Label>
              <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as unidades</SelectItem>
                  {unidadesDisponiveis.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[220px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Exibição de unidades (alertas)</Label>
              <Select value={exibicaoUnidades} onValueChange={(v) => setExibicaoUnidades(v as "principal" | "todas")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Apenas a unidade principal</SelectItem>
                  <SelectItem value="todas">Listar todas que aumentaram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anos.map((a, i) => (
                <Badge key={a} variant="outline" className="font-mono">
                  <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: CORES[i % CORES.length] }} />
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {modo === "subelemento" && anoAnterior !== null && (
        <Card className="p-0 overflow-hidden border-destructive/40 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-destructive/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <h3 className="text-sm font-semibold text-destructive">
                  Alertas de aumento — {anoAnterior} → {anoAtual}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {alertasAumento.length} subelemento(s) com despesa paga superior à do exercício anterior
                  {unidadeFiltro !== "todas" && " (unidade filtrada)"}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleExport("pdf")} disabled={alertasAumento.length === 0}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExport("xlsx")} disabled={alertasAumento.length === 0}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExport("docx")} disabled={alertasAumento.length === 0}>
                <FileType2 className="h-4 w-4" /> Word
              </Button>
            </div>
          </div>
          {alertasAumento.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum subelemento apresentou aumento em relação ao exercício anterior.
            </div>
          ) : (
            <ScrollArea className="h-[320px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Subelemento</th>
                    <th className="px-3 py-2 text-left">Unidade</th>
                    <th className="px-3 py-2 text-right">{anoAnterior}</th>
                    <th className="px-3 py-2 text-right">{anoAtual}</th>
                    <th className="px-3 py-2 text-right">Δ R$</th>
                    <th className="px-3 py-2 text-right">Var.</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {alertasAumento.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="font-medium text-xs truncate max-w-[320px]">{a.rotulo}</div>
                        {a.subtitulo && <div className="text-[10px] text-muted-foreground">{a.subtitulo}</div>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs truncate max-w-[220px]">{a.unidadeLabel}</div>
                        {a.unidadesCount > 1 && (
                          <div className="text-[10px] text-muted-foreground">
                            {a.unidadesCount} unidades
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">{fmtBRL(a.anterior)}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums font-semibold">{fmtBRL(a.atual)}</td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-destructive font-semibold">
                        +{fmtBRL(a.delta)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <VariacaoBadge variacao={a.variacao} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </Card>
      )}

      <Card className="p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-base font-semibold mb-1">Top {top.length} {chaveLabel.toLowerCase()}s — comparação anual</h3>
        <p className="text-xs text-muted-foreground mb-4">Valor pago em cada exercício (barras agrupadas)</p>
        {dataChart.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Sem dados para o comparativo.</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(360, dataChart.length * 28)}>
            <BarChart data={dataChart} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tickFormatter={fmtCompact} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis type="category" dataKey="nome" width={220} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                formatter={(v: number) => fmtBRL(v)}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {anos.map((a, i) => (
                <Bar key={a} dataKey={String(a)} fill={CORES[i % CORES.length]} radius={[0, 4, 4, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-0 overflow-hidden shadow-[var(--shadow-card)]">
        <div className="border-b bg-muted/40 px-4 py-3">
          <h3 className="text-sm font-semibold">Tabela comparativa — {chaveLabel}</h3>
          <p className="text-xs text-muted-foreground">
            Variação calculada entre os dois últimos exercícios disponíveis ({anos.length >= 2 ? `${anos[anos.length - 2]} → ${anos[anos.length - 1]}` : "—"})
          </p>
        </div>
        <ScrollArea className="h-[480px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">{chaveLabel}</th>
                {anos.map((a) => (
                  <th key={a} className="px-3 py-2 text-right">{a}</th>
                ))}
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Var.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {linhas.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="font-medium text-xs truncate max-w-[320px]">{l.rotulo}</div>
                    {l.subtitulo && <div className="text-[10px] text-muted-foreground">{l.subtitulo}</div>}
                  </td>
                  {anos.map((a) => (
                    <td key={a} className="px-3 py-2 text-right text-xs tabular-nums">
                      {(l.porAno[a] ?? 0) > 0 ? fmtBRL(l.porAno[a]) : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">{fmtBRL(l.total)}</td>
                  <td className="px-3 py-2 text-right">
                    <VariacaoBadge variacao={l.variacao} />
                  </td>
                </tr>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={anos.length + 3} className="text-center text-muted-foreground py-12 text-sm">
                    Nenhum dado disponível.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </Card>
    </section>
  );
}

function VariacaoBadge({ variacao }: { variacao: number | null }) {
  if (variacao === null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = (variacao * 100).toFixed(1);
  const positivo = variacao > 0.001;
  const negativo = variacao < -0.001;
  const Icon = positivo ? ArrowUp : negativo ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
        positivo && "bg-destructive/10 text-destructive",
        negativo && "bg-success/15 text-success",
        !positivo && !negativo && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" />
      {pct}%
    </span>
  );
}
