import { Card } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtBRL, fmtCompact } from "@/lib/format";

export function GraficoUnidades({ data }: { data: { nome: string; valor: number }[] }) {
  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h3 className="text-base font-semibold">Despesa por Unidade Administrativa</h3>
        <p className="text-xs text-muted-foreground">Total pago por secretaria, fundo ou órgão</p>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tickFormatter={fmtCompact} stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis type="category" dataKey="nome" width={170} stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <Tooltip
            formatter={(v: number) => fmtBRL(v)}
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}