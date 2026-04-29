import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  lancamentos: Lancamento[]; // todos os anos (já filtrados por unidade/função/busca, mas SEM filtro de exercício)
  exercicios: number[];
};

const CORES = ["hsl(215 60% 35%)", "hsl(168 65% 38%)", "hsl(38 92% 50%)", "hsl(0 75% 55%)", "hsl(265 50% 55%)"];

export function SecaoComparativo({ lancamentos, exercicios }: Props) {
  const [modo, setModo] = useState<"subelemento" | "unidade">("subelemento");
  const anos = exercicios.length ? exercicios.slice().sort((a, b) => a - b) : [new Date().getFullYear()];

  // Agrega valor pago por (chave, ano)
  const { linhas, chaveLabel } = useMemo(() => {
    const chaveLabel = modo === "subelemento" ? "Subelemento" : "Unidade";
    const map = new Map<string, { rotulo: string; subtitulo?: string; porAno: Record<number, number> }>();
    for (const l of lancamentos) {
      const id = modo === "subelemento" ? l.subelemento_id : l.unidade_id;
      const rotulo =
        modo === "subelemento"
          ? `${l.subelementos?.codigo ?? ""} — ${l.subelementos?.descricao ?? "—"}`
          : l.unidades?.nome ?? "—";
      const subtitulo = modo === "subelemento" ? l.subelementos?.categoria ?? undefined : l.unidades?.tipo;
      const cur = map.get(id) ?? { rotulo, subtitulo, porAno: {} };
      cur.porAno[l.exercicio] = (cur.porAno[l.exercicio] ?? 0) + Number(l.valor_pago);
      map.set(id, cur);
    }
    const linhas = Array.from(map.entries())
      .map(([id, v]) => {
        const totais = anos.map((a) => v.porAno[a] ?? 0);
        const total = totais.reduce((s, x) => s + x, 0);
        const ultimo = totais[totais.length - 1] ?? 0;
        const penultimo = totais[totais.length - 2] ?? 0;
        const variacao = penultimo > 0 ? (ultimo - penultimo) / penultimo : null;
        return { id, ...v, totais, total, variacao };
      })
      .sort((a, b) => b.total - a.total);
    return { linhas, chaveLabel };
  }, [lancamentos, modo, anos]);

  const top = linhas.slice(0, 12);
  const dataChart = top.map((l) => {
    const row: Record<string, string | number> = { nome: l.rotulo.length > 32 ? l.rotulo.slice(0, 30) + "…" : l.rotulo };
    anos.forEach((a) => (row[String(a)] = l.porAno[a] ?? 0));
    return row;
  });

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
          <div className="flex items-end gap-3">
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
