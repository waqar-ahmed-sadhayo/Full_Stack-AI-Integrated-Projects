import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border-strong">
      <span className="text-xs text-text-muted font-mono">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="w-8 h-8 rounded-lg border border-border-strong flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="w-8 h-8 rounded-lg border border-border-strong flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
