import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
  loading?: boolean;
}

const VARIANTS: Record<string, string> = {
  primary:
    "bg-gradient-to-r from-secondary to-success text-[#00160f] hover:brightness-110 shadow-[0_0_18px_rgba(20,184,166,0.35)] font-bold",
  secondary: "border border-border-strong bg-surface-2/70 text-text hover:bg-surface-2 hover:border-primary/40",
  ghost: "text-text-muted hover:text-text hover:bg-surface-2/60",
  danger: "bg-danger/15 text-danger-bright border border-danger/30 hover:bg-danger/25",
};

export default function Button({ variant = "primary", icon, loading, children, className = "", disabled, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : icon}
      {children}
    </button>
  );
}
