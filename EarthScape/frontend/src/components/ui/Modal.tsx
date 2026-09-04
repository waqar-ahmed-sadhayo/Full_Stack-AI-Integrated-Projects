import type { ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative glass-card rounded-2xl w-full ${width} p-6 max-h-[90vh] overflow-y-auto scroll-thin bg-surface`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-display font-bold text-text">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded hover:bg-surface-2">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
