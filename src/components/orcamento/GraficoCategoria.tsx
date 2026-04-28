import { Card } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { fmtBRL } from "@/lib/format";

const COLORS = [
  "hsl(215 60% 35%)",
  "hsl(168 65% 38%)",
  "hsl(38 92% 50%)",
  "hsl(0 75% 55%)",
  "hsl(265 50% 55%)",
  "hsl(195 70% 45%)",
];

export function GraficoCategoria({ data }: { data: { nome: string; valor: number }[] }) {
  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h3 className="text-base font-semibold">Distribuição por Tipo de Unidade</h3>
        <p className="text-xs text-muted-foreground">Composição da despesa</p>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={data} dataKey="valor" nameKey="nome" outerRadius={110} innerRadius={60}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}