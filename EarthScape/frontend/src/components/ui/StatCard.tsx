import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "primary" | "secondary" | "warning" | "danger";
  trend?: number;
  unit?: string;
}

const ACCENTS: Record<string, string> = {
  primary: "text-primary-bright bg-primary/10 border-primary/25",
  secondary: "text-secondary-bright bg-secondary/10 border-secondary/25",
  warning: "text-warning bg-warning/10 border-warning/25",
  danger: "text-danger-bright bg-danger/10 border-danger/25",
};

export default function StatCard({ label, value, icon: Icon, accent = "primary", trend, unit }: Props) {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${ACCENTS[accent]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="telemetry-value text-2xl text-text">{value}</span>
        {unit && <span className="text-xs text-text-muted font-mono">{unit}</span>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${trend >= 0 ? "text-secondary-bright" : "text-danger-bright"}`}>
          {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span>{Math.abs(trend)}% vs last period</span>
        </div>
      )}
    </div>
  );
}
