import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { NAV_SECTIONS } from "./navConfig";

const SUBTITLES: Record<string, string> = {
  "/dashboard": "Planetary telemetry at a glance",
  "/pakistan-weather": "Live current conditions across Pakistan",
  "/ingestion": "Upload and validate climate datasets",
  "/climate-data": "Browse the unified climate records store",
  "/map": "Live sensor constellation & anomaly geography",
  "/analytics": "Deep-dive trends, seasonality & correlation",
  "/anomalies": "Statistical & ML-driven outlier detection",
  "/ml-predictions": "Model performance and forecasting",
  "/realtime": "Live streaming sensor telemetry",
  "/alerts": "Threshold breaches & broadcast notices",
  "/hadoop": "HDFS storage & MapReduce job monitoring",
  "/reports": "Generate and download climate reports",
  "/feedback": "Support tickets & platform feedback",
  "/users": "Administer platform accounts & roles",
  "/system": "Infrastructure health & performance",
};

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const activeItem = NAV_SECTIONS.flatMap((s) => s.items).find((i) => location.pathname.startsWith(i.path));

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-secondary/5 rounded-full blur-[160px]" />
        <div className="absolute -bottom-20 left-1/4 w-[700px] h-[700px] bg-sub-surface/30 rounded-full blur-[150px]" />
      </div>
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="lg:pl-64 relative z-10 flex flex-col min-h-screen">
        <Header title={activeItem?.label ?? "EarthScape"} subtitle={SUBTITLES[location.pathname]} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 max-w-[1760px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
