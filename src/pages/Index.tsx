import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Building2, ListChecks, CheckCircle2, Layers, Receipt, GitCompareArrows } from "lucide-react";
import { useLancamentos, useUnidades } from "@/hooks/useOrcamento";
import { Filtros, bucketsParaMeses, type FiltroState } from "@/components/orcamento/Filtros";
import { KpiCard } from "@/components/orcamento/KpiCard";
import { GraficoUnidades } from "@/components/orcamento/GraficoUnidades";
import { GraficoCategoria } from "@/components/orcamento/GraficoCategoria";
import { SecaoAlertas } from "@/components/orcamento/SecaoAlertas";
import { SecaoComparativo } from "@/components/orcamento/SecaoComparativo";
import { TabelaLancamentos } from "@/components/orcamento/TabelaLancamentos";
import { ImportadorPlanilha } from "@/components/orcamento/ImportadorPlanilha";
import { fmtBRL } from "@/lib/format";

const Index = () => {
  const [filtro, setFiltro] = useState<FiltroState>({
    exercicio: 2025,
    unidadeId: "todos",
    tipoUnidade: "todos",
    busca: "",
    periodicidade: "anual",
    periodoIndex: 0,
    funcao: "todas",
  });

  const { data: unidades = [] } = useUnidades();
  // Carrega TODOS os exercícios para suportar o comparativo entre anos.
  const { data: lancamentosTodos = [], isLoading } = useLancamentos();

  // Lista de funções disponíveis para o filtro
  const funcoes = useMemo(() => {
    const set = new Set<string>();
    lancamentosTodos.forEach((l) => l.funcao && set.add(l.funcao));
    return Array.from(set).sort();
  }, [lancamentosTodos]);

  // Aplica filtros COMUNS (unidade, tipo, função, busca, período) — exceto exercício
  const filtradosSemAno = useMemo(() => {
    const meses = new Set(bucketsParaMeses(filtro.periodicidade, filtro.periodoIndex));
    const q = filtro.busca.trim().toLowerCase();
    return lancamentosTodos.filter((l) => {
      if (filtro.unidadeId !== "todos" && l.unidade_id !== filtro.unidadeId) return false;
      if (filtro.tipoUnidade !== "todos" && l.unidades?.tipo !== filtro.tipoUnidade) return false;
      if (filtro.funcao !== "todas" && l.funcao !== filtro.funcao) return false;
      if (!meses.has(l.mes)) return false;
      if (q) {
        const hay = `${l.subelementos?.codigo ?? ""} ${l.subelementos?.descricao ?? ""} ${l.fornecedores?.nome ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [lancamentosTodos, filtro]);

  // Para todas as seções (exceto comparativo) também restringe ao exercício selecionado
  const filtrados = useMemo(
    () => filtradosSemAno.filter((l) => l.exercicio === filtro.exercicio),
    [filtradosSemAno, filtro.exercicio]
  );

  const totais = useMemo(() => {
    const pago = filtrados.reduce((acc, l) => acc + Number(l.valor_pago), 0);
    const unidades = new Set(filtrados.map((l) => l.unidade_id)).size;
    const subs = new Set(filtrados.map((l) => l.subelemento_id)).size;
    const ticket = filtrados.length ? pago / filtrados.length : 0;
    return { pago, unidades, subs, ticket, registros: filtrados.length };
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
    lancamentosTodos.forEach((l) => set.add(l.exercicio));
    return Array.from(set).sort((a, b) => b - a);
  }, [lancamentosTodos]);

  const exerciciosComDados = useMemo(() => {
    const set = new Set<number>();
    lancamentosTodos.forEach((l) => set.add(l.exercicio));
    return Array.from(set).sort((a, b) => a - b);
  }, [lancamentosTodos]);

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
        <Filtros
          state={filtro}
          onChange={setFiltro}
          unidades={unidades as any}
          exercicios={exercicios}
          funcoes={funcoes}
        />

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total pago" value={fmtBRL(totais.pago)} icon={CheckCircle2} tone="success" />
          <KpiCard label="Unidades" value={String(totais.unidades)} hint="Secretarias / fundos" icon={Building2} tone="primary" />
          <KpiCard label="Subelementos" value={String(totais.subs)} hint="Naturezas de despesa" icon={Layers} tone="accent" />
          <KpiCard label="Ticket médio" value={fmtBRL(totais.ticket)} hint={`${totais.registros} registros`} icon={Receipt} tone="warning" />
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard"><Building2 className="h-4 w-4 mr-1.5" /> Dashboard</TabsTrigger>
            <TabsTrigger value="alertas"><AlertTriangle className="h-4 w-4 mr-1.5" /> Alertas</TabsTrigger>
            <TabsTrigger value="comparativo"><GitCompareArrows className="h-4 w-4 mr-1.5" /> Comparativo</TabsTrigger>
            <TabsTrigger value="lancamentos"><ListChecks className="h-4 w-4 mr-1.5" /> Lançamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
              <GraficoUnidades data={dataUnidades} />
              <GraficoCategoria data={dataTipos} />
            </div>
          </TabsContent>

          <TabsContent value="alertas" className="mt-4">
            <SecaoAlertas lancamentos={filtrados} exercicio={filtro.exercicio} />
          </TabsContent>

          <TabsContent value="comparativo" className="mt-4">
            <SecaoComparativo lancamentos={filtradosSemAno} exercicios={exerciciosComDados} />
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
