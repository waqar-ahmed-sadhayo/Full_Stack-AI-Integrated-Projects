import { NavLink } from "react-router-dom";
import { Globe2, LogOut } from "lucide-react";
import { NAV_SECTIONS } from "./navConfig";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={`fixed left-0 top-0 h-screen flex flex-col justify-between py-4 px-3 border-r border-border bg-surface/95 backdrop-blur-xl z-50 w-64 shadow-lg transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-6 overflow-y-auto scroll-thin">
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_16px_rgba(6,182,212,0.4)]">
              <Globe2 size={20} className="text-[#00121a]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-display font-bold text-primary-bright tracking-tight">EarthScape</span>
              <span className="text-[10px] font-mono text-text-muted tracking-wider uppercase">Climate Telemetry Console</span>
            </div>
          </div>

          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((i) => !i.adminOnly || isAdmin);
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="flex flex-col gap-1">
                <div className="px-3 text-[10px] font-mono text-text-muted/70 uppercase tracking-wider mb-1">{section.title}</div>
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                        isActive
                          ? "bg-surface-2 text-primary-bright font-semibold border-l-2 border-primary"
                          : "text-text-muted hover:text-text hover:bg-surface-2/60 border-l-2 border-transparent"
                      }`
                    }
                  >
                    <item.icon size={17} className="shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-surface-2 to-primary/20 border border-primary/40 flex items-center justify-center text-primary-bright font-bold text-xs">
                {user?.avatar_initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-text leading-tight truncate">{user?.full_name}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary animate-pulse-dot" />
                  <span className="text-[10px] font-mono text-secondary-bright font-medium tracking-wide">{user?.role}</span>
                </div>
              </div>
            </div>
            <button onClick={logout} title="Log Out" className="text-text-muted hover:text-danger-bright transition-colors p-1.5 rounded hover:bg-surface-2 shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
