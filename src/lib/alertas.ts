import type { Lancamento } from "@/hooks/useOrcamento";

export type AlertaItem = {
  id: string;
  rotulo: string;
  detalhe: string;
  valor: number;
  metrica: number; // % ou z-score
  contexto: Record<string, unknown>;
};

/** Concentração de gastos: unidades que sozinhas respondem por fatia desproporcional do total pago (>= limite). */
export function alertasConcentracao(lancs: Lancamento[], limite = 0.15): AlertaItem[] {
  const map = new Map<string, { nome: string; pago: number }>();
  let total = 0;
  for (const l of lancs) {
    const v = Number(l.valor_pago);
    total += v;
    const cur = map.get(l.unidade_id) ?? { nome: l.unidades?.nome ?? "—", pago: 0 };
    cur.pago += v;
    map.set(l.unidade_id, cur);
  }
  if (total <= 0) return [];
  const itens: AlertaItem[] = [];
  for (const [id, v] of map) {
    const pct = v.pago / total;
    if (pct >= limite) {
      itens.push({
        id,
        rotulo: v.nome,
        detalhe: `Concentra ${(pct * 100).toFixed(1)}% do total pago`,
        valor: v.pago,
        metrica: pct,
        contexto: { ...v, total },
      });
    }
  }
  return itens.sort((a, b) => b.metrica - a.metrica);
}

/** Subelementos de alto custo: top categorias por valor pago acima de limite (% do total). */
export function alertasAltoCusto(lancs: Lancamento[], limite = 0.1): AlertaItem[] {
  const map = new Map<string, { codigo: string; descricao: string; pago: number }>();
  let total = 0;
  for (const l of lancs) {
    const v = Number(l.valor_pago);
    total += v;
    const cur = map.get(l.subelemento_id) ?? {
      codigo: l.subelementos?.codigo ?? "—",
      descricao: l.subelementos?.descricao ?? "—",
      pago: 0,
    };
    cur.pago += v;
    map.set(l.subelemento_id, cur);
  }
  if (total <= 0) return [];
  const itens: AlertaItem[] = [];
  for (const [id, v] of map) {
    const pct = v.pago / total;
    if (pct >= limite) {
      itens.push({
        id,
        rotulo: `${v.codigo} — ${v.descricao}`,
        detalhe: `${(pct * 100).toFixed(1)}% do total pago`,
        valor: v.pago,
        metrica: pct,
        contexto: { ...v, total },
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