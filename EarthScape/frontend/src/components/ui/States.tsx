import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading telemetry..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
      <Loader2 className="animate-spin text-primary" size={28} />
      <span className="text-sm font-mono">{label}</span>
    </div>
  );
}

export function ErrorState({ message = "Failed to load data from the API.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
      <AlertTriangle className="text-danger-bright" size={28} />
      <span className="text-sm text-text-muted max-w-sm">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-primary-bright hover:underline mt-1">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  label = "No records found",
  icon: Icon = Inbox,
  hint,
}: {
  label?: string;
  icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
      <Icon className="text-text-muted" size={28} />
      <span className="text-sm text-text-muted">{label}</span>
      {hint && <span className="text-xs text-text-muted/70 max-w-sm">{hint}</span>}
    </div>
  );
}
