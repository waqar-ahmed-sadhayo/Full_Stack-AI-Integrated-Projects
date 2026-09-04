import { useEffect, useState } from "react";
import {
  Thermometer,
  Droplets,
  Wind,
  Database,
  Cpu,
  ShieldAlert,
  BrainCircuit,
  Server,
  Activity,
  CloudRain,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardApi } from "../api/endpoints";
import StatCard from "../components/ui/StatCard";
import { Card } from "../components/ui/PageHeader";
import { LoadingState, ErrorState } from "../components/ui/States";

const CHART_COLORS = ["#4CD7F6", "#4EDEA3", "#F59E0B", "#F43F5E", "#9A9DFF", "#10B981"];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs bg-surface border border-border-strong">
      <p className="text-text-muted font-mono mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-mono" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(false);
    dashboardApi
      .overview()
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <LoadingState label="Loading dashboard telemetry..." />;
  if (error || !data) return <ErrorState onRetry={load} />;

  const { kpis, temperature_trend, rainfall_trend, co2_trend, regional_comparison, seasonal_trend, anomaly_distribution } = data;

  const severityData = Object.entries(anomaly_distribution?.by_severity ?? {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Total Records" value={kpis.total_records.toLocaleString()} icon={Database} accent="primary" />
        <StatCard label="Processed" value={kpis.processed_records.toLocaleString()} icon={Server} accent="secondary" />
        <StatCard label="Active Sensors" value={kpis.active_sensors} icon={Activity} accent="primary" />
        <StatCard label="Anomalies" value={kpis.anomaly_count} icon={ShieldAlert} accent="danger" />
        <StatCard label="Avg Temperature" value={kpis.avg_temperature_c} unit="°C" icon={Thermometer} accent="warning" />
        <StatCard label="Avg Rainfall" value={kpis.avg_rainfall_mm} unit="mm" icon={CloudRain} accent="primary" />
        <StatCard label="Avg CO2" value={kpis.avg_co2_ppm} unit="ppm" icon={Wind} accent="secondary" />
        <StatCard
          label="Prediction Accuracy"
          value={kpis.prediction_accuracy_pct !== null ? `${kpis.prediction_accuracy_pct}` : "—"}
          unit="%"
          icon={BrainCircuit}
          accent="secondary"
        />
        <StatCard label="HDFS Usage" value={kpis.hdfs_used_pct} unit="%" icon={Droplets} accent="warning" />
        <StatCard label="Active Jobs" value={kpis.active_processing_jobs} icon={Cpu} accent="primary" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Temperature Trend (30d)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={temperature_trend}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4CD7F6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#4CD7F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" name="°C" stroke="#4CD7F6" fill="url(#tempGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Rainfall Trend (30d)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rainfall_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="mm" fill="#4EDEA3" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Regional Temperature Comparison">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={regional_comparison} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <YAxis dataKey="region" type="category" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="°C" fill="#06B6D4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Anomaly Distribution by Severity">
          {severityData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-text-muted text-sm">
              No anomalies detected yet — run detection from the Anomaly Detection screen.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {severityData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Seasonal Temperature Trend">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={seasonal_trend}>
              <defs>
                <linearGradient id="seasonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4EDEA3" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4EDEA3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" name="°C" stroke="#4EDEA3" fill="url(#seasonGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="CO2 Concentration Trend (monthly)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={co2_trend}>
              <defs>
                <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={32} domain={["auto", "auto"]} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="value" name="ppm" stroke="#F59E0B" fill="url(#co2Grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
