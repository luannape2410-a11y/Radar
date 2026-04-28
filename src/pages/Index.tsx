import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, FileSpreadsheet, AlertTriangle, Building2, ListChecks, TrendingUp, CheckCircle2 } from "lucide-react";
import { useLancamentos, useUnidades } from "@/hooks/useOrcamento";
import { Filtros, type FiltroState } from "@/components/orcamento/Filtros";
import { KpiCard } from "@/components/orcamento/KpiCard";
import { GraficoUnidades } from "@/components/orcamento/GraficoUnidades";
import { GraficoCategoria } from "@/components/orcamento/GraficoCategoria";
import { SecaoAlertas } from "@/components/orcamento/SecaoAlertas";
import { TabelaLancamentos } from "@/components/orcamento/TabelaLancamentos";
import { ImportadorPlanilha } from "@/components/orcamento/ImportadorPlanilha";
import { fmtBRL, fmtPct } from "@/lib/format";

const Index = () => {
  const [filtro, setFiltro] = useState<FiltroState>({
    exercicio: 2025,
    unidadeId: "todos",
    tipoUnidade: "todos",
    busca: "",
  });

  const { data: unidades = [] } = useUnidades();
  const { data: lancamentos = [], isLoading } = useLancamentos(filtro.exercicio);

  const filtrados = useMemo(() => {
    const q = filtro.busca.trim().toLowerCase();
    return lancamentos.filter((l) => {
      if (filtro.unidadeId !== "todos" && l.unidade_id !== filtro.unidadeId) return false;
      if (filtro.tipoUnidade !== "todos" && l.unidades?.tipo !== filtro.tipoUnidade) return false;
      if (q) {
        const hay = `${l.subelementos?.codigo ?? ""} ${l.subelementos?.descricao ?? ""} ${l.fornecedores?.nome ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [lancamentos, filtro]);

  const totais = useMemo(() => {
    const t = filtrados.reduce(
      (acc, l) => ({
        dotacao: acc.dotacao + Number(l.valor_dotacao),
        empenhado: acc.empenhado + Number(l.valor_empenhado),
        liquidado: acc.liquidado + Number(l.valor_liquidado),
        pago: acc.pago + Number(l.valor_pago),
      }),
      { dotacao: 0, empenhado: 0, liquidado: 0, pago: 0 }
    );
    const base = t.dotacao || t.empenhado;
    return { ...t, execPct: base ? t.pago / base : 0 };
  }, [filtrados]);

  const dataUnidades = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of filtrados) {
      const k = l.unidades?.nome ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(l.valor_pago));
    }
    return Array.from(map, ([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [filtrados]);

  const dataTipos = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of filtrados) {
      const k = l.unidades?.tipo ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(l.valor_pago));
    }
    return Array.from(map, ([nome, valor]) => ({ nome, valor }));
  }, [filtrados]);

  const exercicios = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear(), 2025]);
    lancamentos.forEach((l) => set.add(l.exercicio));
    return Array.from(set).sort((a, b) => b - a);
  }, [lancamentos]);

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="border-b bg-card">
        <div className="container flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Prefeitura Municipal</p>
            <h1 className="text-2xl font-bold">Painel de Execução Orçamentária</h1>
            <p className="text-sm text-muted-foreground">Monitoramento gerencial — exercício {filtro.exercicio}</p>
          </div>
          <div className="flex gap-2">
            <ImportadorPlanilha />
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Filtros state={filtro} onChange={setFiltro} unidades={unidades as any} exercicios={exercicios} />

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Dotação" value={fmtBRL(totais.dotacao)} icon={Wallet} tone="primary" />
          <KpiCard label="Empenhado" value={fmtBRL(totais.empenhado)} icon={FileSpreadsheet} tone="accent" />
          <KpiCard label="Liquidado" value={fmtBRL(totais.liquidado)} icon={ListChecks} tone="success" />
          <KpiCard label="Pago" value={fmtBRL(totais.pago)} icon={CheckCircle2} tone="success" />
          <KpiCard label="% Execução" value={fmtPct(totais.execPct)} hint="Pago / Dotação" icon={TrendingUp} tone="warning" />
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard"><Building2 className="h-4 w-4 mr-1.5" /> Dashboard</TabsTrigger>
            <TabsTrigger value="alertas"><AlertTriangle className="h-4 w-4 mr-1.5" /> Alertas</TabsTrigger>
            <TabsTrigger value="lancamentos"><ListChecks className="h-4 w-4 mr-1.5" /> Lançamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
              <GraficoUnidades data={dataUnidades} />
              <GraficoCategoria data={dataTipos} />
            </div>
          </TabsContent>

          <TabsContent value="alertas" className="mt-4">
            <SecaoAlertas lancamentos={filtrados} />
          </TabsContent>

          <TabsContent value="lancamentos" className="mt-4">
            <TabelaLancamentos lancamentos={filtrados} />
          </TabsContent>
        </Tabs>

        {isLoading && <p className="text-center text-sm text-muted-foreground">Carregando dados…</p>}
      </main>
    </div>
  );
};

export default Index;
