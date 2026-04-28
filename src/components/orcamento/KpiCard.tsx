import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "warning" | "destructive" | "success";
}

const toneMap = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "primary" }: Props) {
  return (
    <Card className="p-5 shadow-[var(--shadow-card)] border-border/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("rounded-lg p-2.5", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}