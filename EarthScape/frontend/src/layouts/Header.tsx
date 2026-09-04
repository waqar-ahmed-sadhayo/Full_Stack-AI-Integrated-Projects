import { useEffect, useState } from "react";
import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { alertsApi } from "../api/endpoints";
import { Link } from "react-router-dom";

export default function Header({ title, subtitle, onMenuClick }: { title: string; subtitle?: string; onMenuClick: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [activeAlerts, setActiveAlerts] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = () => alertsApi.list({ status_filter: "Active" }).then((res) => mounted && setActiveAlerts(res.data.length)).catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} className="lg:hidden text-text-muted hover:text-text p-1.5 rounded hover:bg-surface-2">
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h2 className="text-base font-display font-bold text-text truncate">{title}</h2>
          {subtitle && <p className="text-xs text-text-muted truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="h-9 w-9 rounded-lg border border-border-strong bg-surface-2/60 hover:bg-surface-2 hover:text-primary transition-all flex items-center justify-center text-text-muted"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <Link
          to="/alerts"
          className="relative h-9 w-9 rounded-lg border border-border-strong bg-surface-2/60 hover:bg-surface-2 hover:text-primary transition-all flex items-center justify-center text-text-muted"
        >
          <Bell size={16} />
          {activeAlerts > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {activeAlerts > 9 ? "9+" : activeAlerts}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
