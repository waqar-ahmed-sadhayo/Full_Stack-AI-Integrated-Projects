import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
}

export function Input({ label, icon, className = "", ...rest }: InputProps) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide">{label}</span>}
      <div className="relative">
        {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted pointer-events-none">{icon}</div>}
        <input
          className={`w-full h-10 ${icon ? "pl-9" : "pl-3.5"} pr-3.5 rounded-lg bg-background/80 border border-border-strong text-text placeholder-text-muted/60 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all ${className}`}
          {...rest}
        />
      </div>
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className = "", children, ...rest }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide">{label}</span>}
      <select
        className={`w-full h-10 px-3.5 rounded-lg bg-background/80 border border-border-strong text-text text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all ${className}`}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = "", ...rest }: TextareaProps) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-text-muted mb-1.5 tracking-wide">{label}</span>}
      <textarea
        className={`w-full px-3.5 py-2.5 rounded-lg bg-background/80 border border-border-strong text-text placeholder-text-muted/60 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all resize-none ${className}`}
        {...rest}
      />
    </label>
  );
}
