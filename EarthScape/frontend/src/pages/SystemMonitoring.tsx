import { useEffect, useState } from "react";
import { Cpu, Database, HardDrive, MemoryStick, Timer, Users, Zap, Server } from "lucide-react";
import { monitoringApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import { Card } from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import { LoadingState } from "../components/ui/States";

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function SystemMonitoring() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    monitoringApi
      .system()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) return <LoadingState label="Reading infrastructure telemetry..." />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="System Monitoring" subtitle="Infrastructure health and performance" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="CPU Usage" value={data.cpu_pct} unit="%" icon={Cpu} accent={data.cpu_pct > 80 ? "danger" : "primary"} />
        <StatCard label="RAM Usage" value={data.ram_pct} unit="%" icon={MemoryStick} accent={data.ram_pct > 85 ? "danger" : "secondary"} />
        <StatCard label="Disk Usage" value={data.disk_pct} unit="%" icon={HardDrive} accent="warning" />
        <StatCard label="HDFS Usage" value={data.hdfs.used_pct} unit="%" icon={Server} accent="primary" />
        <StatCard label="API Response" value={data.api_response_time_ms} unit="ms" icon={Zap} accent="secondary" />
        <StatCard label="Active Users" value={data.active_users} icon={Users} accent="primary" />
        <StatCard label="Running Jobs" value={data.running_jobs} icon={Timer} accent="secondary" />
        <StatCard label="Uptime" value={formatUptime(data.uptime_seconds)} icon={Timer} accent="primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Database">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <Database size={16} /> Mode: <span className="font-mono text-text">{data.database.mode}</span>
            </div>
            <Badge label={data.database.status} tone="online" />
          </div>
        </Card>
        <Card title="Memory">
          <p className="text-sm text-text-muted font-mono">{data.ram_used_gb} GB / {data.ram_total_gb} GB used</p>
          <div className="w-full h-2 bg-surface-2 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-secondary" style={{ width: `${data.ram_pct}%` }} />
          </div>
        </Card>
      </div>
    </div>
  );
}
