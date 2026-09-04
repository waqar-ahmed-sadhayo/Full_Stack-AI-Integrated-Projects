import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let counter = 0;

const ICONS: Record<ToastKind, any> = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS: Record<ToastKind, string> = {
  success: "border-secondary/40 text-secondary-bright",
  error: "border-danger/40 text-danger-bright",
  info: "border-primary/40 text-primary-bright",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div key={t.id} className={`glass-card rounded-lg border ${COLORS[t.kind]} px-4 py-3 flex items-start gap-2.5 shadow-lg animate-in`}>
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm text-text flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-text-muted hover:text-text">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
