import type { ReactNode } from "react";
import { Globe2, Lock, ShieldCheck } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function AuthLayout({ children, badge }: { children: ReactNode; badge: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden relative bg-background text-text">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1120] via-[#0D1322] to-[#1E1B4B] opacity-100 [html.light_&]:opacity-0" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundSize: "40px 40px",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          }}
        />
        <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-48 -right-32 w-[700px] h-[700px] bg-secondary/10 rounded-full blur-[160px]" />
      </div>

      <header className="relative z-20 w-full bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="w-full px-4 md:px-10 h-16 max-w-[1760px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Globe2 size={16} className="text-[#00121a]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-base font-bold text-text">EarthScape</span>
                <span className="text-[10px] font-mono text-secondary-bright tracking-wider font-semibold">LEO-FEED</span>
              </div>
              <span className="text-[10px] font-mono text-text-muted -mt-1">Climate Agency</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 bg-background/60 border border-border px-3 py-1.5 rounded-full">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
              </span>
              <span className="font-mono text-[11px] text-text-muted font-medium">Live Sensor Constellation:</span>
              <span className="font-mono text-[11px] text-secondary-bright font-semibold">Online</span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="h-9 w-9 rounded-lg border border-border-strong bg-surface-2/60 hover:bg-surface-2 hover:text-primary transition-all flex items-center justify-center text-text-muted"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary-bright to-secondary rounded-2xl blur-lg opacity-20" />
          <div className="relative glass-card border border-secondary/30 rounded-2xl overflow-hidden p-6 sm:p-8 bg-surface">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative mb-3.5">
                <div className="w-16 h-16 rounded-xl bg-background/80 border border-border flex items-center justify-center shadow-inner">
                  <Globe2 size={30} className="text-primary-bright" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-secondary/20 text-secondary-bright text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-secondary/40">
                  OPS
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-display text-lg font-bold text-text">EarthScape</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-primary-bright font-mono">{badge}</span>
              </div>
              <span className="font-mono text-text-muted uppercase tracking-wider text-[10px] mb-4">Climate Agency Infrastructure</span>
            </div>
            {children}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-center gap-2 text-center">
              <ShieldCheck size={13} className="text-secondary-bright" />
              <span className="font-mono text-text-muted text-[10px] tracking-wide">256-bit AES Climate Stream Encryption &bull; ISO-14064 Compliant</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-20 w-full bg-surface/90 backdrop-blur-md border-t border-border">
        <div className="w-full py-2.5 px-4 md:px-10 max-w-[1760px] mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-text-muted">
            <div className="flex items-center gap-1.5">
              <Lock size={11} className="text-primary-bright" />
              <span>STATION PROTOCOL v4.1</span>
            </div>
            <span className="text-border-strong hidden sm:inline">&bull;</span>
            <span>Trusted by 450+ climate research institutes worldwide</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
