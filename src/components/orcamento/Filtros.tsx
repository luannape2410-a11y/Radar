import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FiltroState = {
  exercicio: number;
  unidadeId: string;
  tipoUnidade: string;
  busca: string;
};

interface Props {
  state: FiltroState;
  onChange: (s: FiltroState) => void;
  unidades: { id: string; nome: string; tipo: string }[];
  exercicios: number[];
}

export function Filtros({ state, onChange, unidades, exercicios }: Props) {
  const tipos = Array.from(new Set(unidades.map((u) => u.tipo)));
  const unidadesFiltradas = state.tipoUnidade === "todos"
    ? unidades
    : unidades.filter((u) => u.tipo === state.tipoUnidade);
  return (
    <div className="grid gap-3 md:grid-cols-4 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
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
        <Label className="text-xs text-muted-foreground mb-1.5 block">Busca (subelemento / fornecedor)</Label>
        <Input value={state.busca} onChange={(e) => onChange({ ...state, busca: e.target.value })} placeholder="Ex.: 3.3.90 ou nome..." />
      </div>
    </div>
  );
}