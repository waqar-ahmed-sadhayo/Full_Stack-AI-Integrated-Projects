import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { LoadingState, EmptyState } from "./States";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyLabel?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
  onSort?: (field: string) => void;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  rowKey,
  loading,
  emptyLabel,
  sortField,
  sortDir,
  onSort,
}: Props<T>) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-border-strong bg-surface-2/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider select-none ${
                    col.sortable ? "cursor-pointer hover:text-text" : ""
                  } ${col.className ?? ""}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortField === col.key && (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading &&
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-text/90 whitespace-nowrap ${col.className ?? ""}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {loading && <LoadingState />}
      {!loading && rows.length === 0 && <EmptyState label={emptyLabel} />}
    </div>
  );
}
