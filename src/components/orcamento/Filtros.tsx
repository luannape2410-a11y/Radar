import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FiltroState = {
  exercicio: number;
  unidadeId: string;
  tipoUnidade: string;
  busca: string;
  periodicidade: "anual" | "quadrimestral" | "bimestral" | "mensal";
  periodoIndex: number; // 0 = todos; senão índice 1..N do bucket dentro do ano
  funcao: string;
};

interface Props {
  state: FiltroState;
  onChange: (s: FiltroState) => void;
  unidades: { id: string; nome: string; tipo: string }[];
  exercicios: number[];
  funcoes: string[];
}

const PERIODOS: Record<FiltroState["periodicidade"], string[]> = {
  anual: ["Ano inteiro"],
  quadrimestral: ["1º quadrimestre (Jan-Abr)", "2º quadrimestre (Mai-Ago)", "3º quadrimestre (Set-Dez)"],
  bimestral: ["1º bim (Jan-Fev)", "2º bim (Mar-Abr)", "3º bim (Mai-Jun)", "4º bim (Jul-Ago)", "5º bim (Set-Out)", "6º bim (Nov-Dez)"],
  mensal: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
};

export function bucketsParaMeses(p: FiltroState["periodicidade"], idx: number): number[] {
  if (idx === 0) return Array.from({ length: 12 }, (_, i) => i + 1);
  if (p === "anual") return Array.from({ length: 12 }, (_, i) => i + 1);
  if (p === "quadrimestral") {
    const start = (idx - 1) * 4 + 1;
    return [start, start + 1, start + 2, start + 3];
  }
  if (p === "bimestral") {
    const start = (idx - 1) * 2 + 1;
    return [start, start + 1];
  }
  return [idx];
}

export function Filtros({ state, onChange, unidades, exercicios, funcoes }: Props) {
  const tipos = Array.from(new Set(unidades.map((u) => u.tipo)));
  const unidadesFiltradas = state.tipoUnidade === "todos"
    ? unidades
    : unidades.filter((u) => u.tipo === state.tipoUnidade);
  const periodos = PERIODOS[state.periodicidade];
  return (
    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-7 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Exercício</Label>
        <Select value={String(state.exercicio)} onValueChange={(v) => onChange({ ...state, exercicio: Number(v) })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {exercicios.map((e) => <SelectItem key={e} value={String(e)}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Periodicidade</Label>
        <Select
          value={state.periodicidade}
          onValueChange={(v) => onChange({ ...state, periodicidade: v as FiltroState["periodicidade"], periodoIndex: 0 })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="anual">Anual</SelectItem>
            <SelectItem value="quadrimestral">Quadrimestral</SelectItem>
            <SelectItem value="bimestral">Bimestral</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Período</Label>
        <Select
          value={String(state.periodoIndex)}
          onValueChange={(v) => onChange({ ...state, periodoIndex: Number(v) })}
          disabled={state.periodicidade === "anual"}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Todos</SelectItem>
            {periodos.map((p, i) => (
              <SelectItem key={i} value={String(i + 1)}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo de unidade</Label>
        <Select value={state.tipoUnidade} onValueChange={(v) => onChange({ ...state, tipoUnidade: v, unidadeId: "todos" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Unidade</Label>
        <Select value={state.unidadeId} onValueChange={(v) => onChange({ ...state, unidadeId: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {unidadesFiltradas.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Função</Label>
        <Select value={state.funcao} onValueChange={(v) => onChange({ ...state, funcao: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {funcoes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Busca (subelemento / fornecedor)</Label>
        <Input value={state.busca} onChange={(e) => onChange({ ...state, busca: e.target.value })} placeholder="Ex.: 3.3.90 ou nome..." />
      </div>
    </div>
  );
}