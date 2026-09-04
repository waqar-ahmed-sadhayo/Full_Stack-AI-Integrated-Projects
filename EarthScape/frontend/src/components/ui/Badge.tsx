const SEVERITY_MAP: Record<string, string> = {
  critical: "bg-danger/15 text-danger-bright border-danger/30",
  high: "bg-danger/10 text-danger-bright border-danger/25",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-primary/10 text-primary-bright border-primary/25",
  normal: "bg-secondary/10 text-secondary-bright border-secondary/25",
  active: "bg-danger/15 text-danger-bright border-danger/30",
  open: "bg-warning/15 text-warning border-warning/30",
  resolved: "bg-secondary/10 text-secondary-bright border-secondary/25",
  acknowledged: "bg-primary/10 text-primary-bright border-primary/25",
  online: "bg-secondary/10 text-secondary-bright border-secondary/25",
  degraded: "bg-warning/15 text-warning border-warning/30",
  offline: "bg-danger/15 text-danger-bright border-danger/30",
  completed: "bg-secondary/10 text-secondary-bright border-secondary/25",
  running: "bg-primary/10 text-primary-bright border-primary/25",
  queued: "bg-text-muted/10 text-text-muted border-border-strong",
  failed: "bg-danger/15 text-danger-bright border-danger/30",
  validated: "bg-secondary/10 text-secondary-bright border-secondary/25",
  processed: "bg-primary/10 text-primary-bright border-primary/25",
  flagged: "bg-warning/15 text-warning border-warning/30",
  pending: "bg-text-muted/10 text-text-muted border-border-strong",
  administrator: "bg-primary/10 text-primary-bright border-primary/25",
  analyst: "bg-secondary/10 text-secondary-bright border-secondary/25",
};

export default function Badge({ label, tone }: { label: string; tone?: string }) {
  const key = (tone ?? label).toLowerCase();
  const cls = SEVERITY_MAP[key] ?? "bg-surface-2 text-text-muted border-border-strong";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wide border ${cls}`}>
      {label}
    </span>
  );
}
