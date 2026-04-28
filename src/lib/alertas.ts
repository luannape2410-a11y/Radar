import type { Lancamento } from "@/hooks/useOrcamento";

export type AlertaItem = {
  id: string;
  rotulo: string;
  detalhe: string;
  valor: number;
  metrica: number; // % ou z-score
  contexto: Record<string, unknown>;
};

/** Baixa execução: unidade com % pago/dotação < limite. Se dotação=0, usa pago/empenhado. */
export function alertasBaixaExecucao(lancs: Lancamento[], limite = 0.3): AlertaItem[] {
  const map = new Map<string, { nome: string; pago: number; empenhado: number; dotacao: number }>();
  for (const l of lancs) {
    const key = l.unidade_id;
    const cur = map.get(key) ?? { nome: l.unidades?.nome ?? "—", pago: 0, empenhado: 0, dotacao: 0 };
    cur.pago += Number(l.valor_pago);
    cur.empenhado += Number(l.valor_empenhado);
    cur.dotacao += Number(l.valor_dotacao);
    map.set(key, cur);
  }
  const itens: AlertaItem[] = [];
  for (const [id, v] of map) {
    const base = v.dotacao > 0 ? v.dotacao : v.empenhado;
    if (base <= 0) continue;
    const pct = v.pago / base;
    if (pct < limite) {
      itens.push({
        id,
        rotulo: v.nome,
        detalhe: `Execução ${(pct * 100).toFixed(1)}% — abaixo do esperado`,
        valor: v.pago,
        metrica: pct,
        contexto: { ...v, base },
      });
    }
  }
  return itens.sort((a, b) => a.metrica - b.metrica);
}

/** Excesso de empenhos: empenhado/dotação >= 90% (apenas onde há dotação). */
export function alertasExcessoEmpenho(lancs: Lancamento[], limite = 0.9): AlertaItem[] {
  const map = new Map<string, { nome: string; empenhado: number; dotacao: number }>();
  for (const l of lancs) {
    const key = l.unidade_id;
    const cur = map.get(key) ?? { nome: l.unidades?.nome ?? "—", empenhado: 0, dotacao: 0 };
    cur.empenhado += Number(l.valor_empenhado);
    cur.dotacao += Number(l.valor_dotacao);
    map.set(key, cur);
  }
  const itens: AlertaItem[] = [];
  for (const [id, v] of map) {
    if (v.dotacao <= 0) continue;
    const pct = v.empenhado / v.dotacao;
    if (pct >= limite) {
      itens.push({
        id,
        rotulo: v.nome,
        detalhe: `Empenhado ${(pct * 100).toFixed(1)}% da dotação`,
        valor: v.empenhado,
        metrica: pct,
        contexto: v,
      });
    }
  }
  return itens.sort((a, b) => b.metrica - a.metrica);
}

/** Gastos atípicos: lançamentos com z-score > 2 dentro do mesmo subelemento. */
export function alertasAtipicos(lancs: Lancamento[], zLimite = 2): AlertaItem[] {
  const grupos = new Map<string, Lancamento[]>();
  for (const l of lancs) {
    const k = l.subelemento_id;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(l);
  }
  const itens: AlertaItem[] = [];
  for (const [, arr] of grupos) {
    if (arr.length < 4) continue;
    const vals = arr.map((a) => Number(a.valor_pago));
    const m = vals.reduce((s, x) => s + x, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, x) => s + (x - m) ** 2, 0) / vals.length);
    if (sd === 0) continue;
    for (const l of arr) {
      const z = (Number(l.valor_pago) - m) / sd;
      if (z > zLimite) {
        itens.push({
          id: l.id,
          rotulo: `${l.subelementos?.codigo} — ${l.unidades?.nome}`,
          detalhe: `Valor ${z.toFixed(1)}σ acima da média do subelemento`,
          valor: Number(l.valor_pago),
          metrica: z,
          contexto: { media: m, desvio: sd, subelemento: l.subelementos?.descricao },
        });
      }
    }
  }
  return itens.sort((a, b) => b.metrica - a.metrica);
}