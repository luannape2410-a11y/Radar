import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, PieChart, Activity, ChevronRight, FileText, FileSpreadsheet, FileType2 } from "lucide-react";
import { fmtBRL, fmtPct } from "@/lib/format";
import {
  alertasAtipicos,
  alertasConcentracao,
  alertasAltoCusto,
  type AlertaItem,
} from "@/lib/alertas";
import { exportarPDF, exportarXLSX, exportarDOCX, type GrupoAlerta } from "@/lib/exportarAlertas";
import { toast } from "@/hooks/use-toast";
import type { Lancamento } from "@/hooks/useOrcamento";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

type TipoAlerta = "concentracao" | "altocusto" | "atipico";

const tiposConfig: Record<
  TipoAlerta,
  { titulo: string; descricao: string; icon: typeof AlertTriangle; tone: string; cor: string }
> = {
  concentracao: {
    titulo: "Concentração de gastos",
    descricao: "Unidades que concentram ≥ 15% do total pago",
    icon: PieChart,
    tone: "text-warning bg-warning/15",
    cor: "hsl(var(--warning))",
  },
  altocusto: {
    titulo: "Subelementos de alto custo",
    descricao: "Categorias que respondem por ≥ 10% do pago",
    icon: AlertTriangle,
    tone: "text-destructive bg-destructive/10",
    cor: "hsl(var(--destructive))",
  },
  atipico: {
    titulo: "Gastos atípicos",
    descricao: "Lançamentos > 2σ acima da média do subelemento",
    icon: Activity,
    tone: "text-primary bg-primary/10",
    cor: "hsl(var(--primary))",
  },
};

export function SecaoAlertas({ lancamentos, exercicio = new Date().getFullYear() }: { lancamentos: Lancamento[]; exercicio?: number }) {
  const concentracao = useMemo(() => alertasConcentracao(lancamentos), [lancamentos]);
  const altocusto = useMemo(() => alertasAltoCusto(lancamentos), [lancamentos]);
  const atipicos = useMemo(() => alertasAtipicos(lancamentos), [lancamentos]);

  const grupos: Record<TipoAlerta, AlertaItem[]> = { concentracao, altocusto, atipico: atipicos };
  const [tipoSel, setTipoSel] = useState<TipoAlerta>(
    concentracao.length ? "concentracao" : altocusto.length ? "altocusto" : "atipico"
  );
  const [itemSel, setItemSel] = useState<AlertaItem | null>(null);

  const itensTipo = grupos[tipoSel];
  const itemAtivo = itemSel ?? itensTipo[0] ?? null;

  const gruposExport: GrupoAlerta[] = (Object.keys(tiposConfig) as TipoAlerta[]).map((tipo) => ({
    chave: tipo,
    titulo: tiposConfig[tipo].titulo,
    descricao: tiposConfig[tipo].descricao,
    itens: grupos[tipo],
  }));

  const handleExport = async (fmt: "pdf" | "xlsx" | "docx") => {
    try {
      if (fmt === "pdf") exportarPDF(gruposExport, exercicio);
      else if (fmt === "xlsx") exportarXLSX(gruposExport, exercicio);
      else await exportarDOCX(gruposExport, exercicio);
      toast({ title: "Relatório gerado", description: `Arquivo .${fmt} baixado com sucesso.` });
    } catch (e) {
      toast({ title: "Erro ao exportar", description: String(e), variant: "destructive" });
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Alertas Gerenciais</h2>
          <p className="text-sm text-muted-foreground">
            Identificação automática de situações críticas na execução orçamentária
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("pdf")}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("xlsx")}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("docx")}>
            <FileType2 className="h-4 w-4" /> Word
          </Button>
        </div>
      </div>

      {/* Cards por tipo */}
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(tiposConfig) as TipoAlerta[]).map((tipo) => {
          const cfg = tiposConfig[tipo];
          const total = grupos[tipo].length;
          const Icon = cfg.icon;
          const ativo = tipoSel === tipo;
          return (
            <button
              key={tipo}
              onClick={() => {
                setTipoSel(tipo);
                setItemSel(null);
              }}
              className={cn(
                "text-left rounded-xl border bg-card p-5 transition-all hover:shadow-[var(--shadow-elevated)]",
                ativo ? "border-primary ring-2 ring-primary/30 shadow-[var(--shadow-elevated)]" : "border-border/60 shadow-[var(--shadow-card)]"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn("rounded-lg p-2.5", cfg.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant={total ? "destructive" : "secondary"} className="text-xs">
                  {total} {total === 1 ? "alerta" : "alertas"}
                </Badge>
              </div>
              <h3 className="mt-4 font-semibold">{cfg.titulo}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{cfg.descricao}</p>
            </button>
          );
        })}
      </div>

      {/* Ranking + Detalhe */}
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="p-0 overflow-hidden shadow-[var(--shadow-card)]">
          <div className="border-b bg-muted/40 px-4 py-3">
            <h3 className="text-sm font-semibold">Ranking — {tiposConfig[tipoSel].titulo}</h3>
            <p className="text-xs text-muted-foreground">Clique para ver detalhes</p>
          </div>
          <ScrollArea className="h-[420px]">
            {itensTipo.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                Nenhuma situação crítica identificada.
              </div>
            ) : (
              <ul className="divide-y">
                {itensTipo.map((it, idx) => {
                  const ativo = itemAtivo?.id === it.id;
                  return (
                    <li key={it.id}>
                      <button
                        onClick={() => setItemSel(it)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3",
                          ativo && "bg-primary/5 border-l-4 border-l-primary"
                        )}
                      >
                        <span className="text-xs font-bold text-muted-foreground w-6">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{it.rotulo}</p>
                          <p className="text-xs text-muted-foreground truncate">{it.detalhe}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{fmtBRL(it.valor)}</p>
                          {tipoSel !== "atipico" && (
                            <p className="text-xs text-muted-foreground">{fmtPct(it.metrica)}</p>
                          )}
                          {tipoSel === "atipico" && (
                            <p className="text-xs text-muted-foreground">{it.metrica.toFixed(1)}σ</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </Card>

        <Card className="p-5 shadow-[var(--shadow-card)]">
          {itemAtivo ? (
            <DetalheAlerta tipo={tipoSel} item={itemAtivo} lancamentos={lancamentos} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Selecione um alerta para ver o detalhamento.
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

function DetalheAlerta({
  tipo,
  item,
  lancamentos,
}: {
  tipo: TipoAlerta;
  item: AlertaItem;
  lancamentos: Lancamento[];
}) {
  const cfg = tiposConfig[tipo];

  // Concentração / Alto custo: comparação com restante + top itens
  if (tipo === "concentracao" || tipo === "altocusto") {
    const ctx = item.contexto as { total: number; pago: number };
    const restante = Math.max(ctx.total - ctx.pago, 0);
    const data = [
      { tipo: tipo === "concentracao" ? "Esta unidade" : "Este subelemento", valor: ctx.pago, fill: "hsl(var(--destructive))" },
      { tipo: "Demais", valor: restante, fill: "hsl(var(--muted-foreground))" },
    ];
    const filhos = lancamentos
      .filter((l) => (tipo === "concentracao" ? l.unidade_id === item.id : l.subelemento_id === item.id))
      .sort((a, b) => Number(b.valor_pago) - Number(a.valor_pago))
      .slice(0, 8);
    return (
      <div className="space-y-4">
        <div>
          <Badge className={cn("mb-2", cfg.tone)} variant="secondary">{cfg.titulo}</Badge>
          <h3 className="text-lg font-bold">{item.rotulo}</h3>
          <p className="text-sm text-muted-foreground">{item.detalhe}</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="tipo" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v/1_000_000).toFixed(1)}M`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div>
          <h4 className="text-sm font-semibold mb-2">
            {tipo === "concentracao" ? "Top subelementos da unidade" : "Top lançamentos do subelemento"}
          </h4>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">{tipo === "concentracao" ? "Código" : "Unidade"}</th>
                  <th className="px-3 py-2 text-left">{tipo === "concentracao" ? "Descrição" : "Fornecedor"}</th>
                  <th className="px-3 py-2 text-right">Valor pago</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filhos.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 text-xs">
                      {tipo === "concentracao" ? (
                        <span className="font-mono">{l.subelementos?.codigo}</span>
                      ) : (
                        l.unidades?.nome
                      )}
                    </td>
                    <td className="px-3 py-2 truncate max-w-[280px] text-xs">
                      {tipo === "concentracao" ? l.subelementos?.descricao : (l.fornecedores?.nome ?? "—")}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{fmtBRL(l.valor_pago)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Atípico: gráfico de distribuição do subelemento com ponto destacado
  const lanc = lancamentos.find((l) => l.id === item.id);
  const ctx = item.contexto as { media: number; desvio: number; subelemento: string };
  const irmaos = lancamentos
    .filter((l) => l.subelemento_id === lanc?.subelemento_id)
    .map((l) => ({
      nome: l.unidades?.nome ?? "—",
      valor: Number(l.valor_pago),
      destaque: l.id === item.id,
    }))
    .sort((a, b) => b.valor - a.valor);
  return (
    <div className="space-y-4">
      <div>
        <Badge className={cn("mb-2", cfg.tone)} variant="secondary">{cfg.titulo}</Badge>
        <h3 className="text-lg font-bold">{item.rotulo}</h3>
        <p className="text-sm text-muted-foreground">{ctx.subelemento}</p>
        <p className="text-sm mt-1">
          Valor <strong>{fmtBRL(item.valor)}</strong> contra média de <strong>{fmtBRL(ctx.media)}</strong> e desvio padrão de <strong>{fmtBRL(ctx.desvio)}</strong>.
        </p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={irmaos} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-30} textAnchor="end" height={80} interval={0} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v/1_000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
          <ReferenceLine y={ctx.media} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Média", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
            {irmaos.map((d, i) => (
              <Cell key={i} fill={d.destaque ? "hsl(var(--destructive))" : "hsl(var(--primary) / 0.6)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground">
        A barra em vermelho representa o lançamento atípico ({item.metrica.toFixed(1)} desvios padrão acima da média do subelemento).
      </p>
    </div>
  );
}