import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { analyticsApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Input";
import { LoadingState } from "../components/ui/States";

const METRICS = [
  { key: "temperature_c", label: "Temperature (°C)", color: "#4CD7F6" },
  { key: "rainfall_mm", label: "Rainfall (mm)", color: "#4EDEA3" },
  { key: "humidity_pct", label: "Humidity (%)", color: "#9A9DFF" },
  { key: "wind_speed_kmh", label: "Wind Speed (km/h)", color: "#F59E0B" },
  { key: "pressure_hpa", label: "Pressure (hPa)", color: "#06B6D4" },
  { key: "co2_ppm", label: "CO2 (ppm)", color: "#F43F5E" },
];

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

export default function Analytics() {
  const [metric, setMetric] = useState("temperature_c");
  const [granularity, setGranularity] = useState("month");
  const [trend, setTrend] = useState<any[]>([]);
  const [regional, setRegional] = useState<any[]>([]);
  const [seasonal, setSeasonal] = useState<any[]>([]);
  const [correlation, setCorrelation] = useState<{ metrics: string[]; matrix: number[][] } | null>(null);
  const [loading, setLoading] = useState(true);

  const activeMetric = METRICS.find((m) => m.key === metric)!;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.trend({ metric, granularity }),
      analyticsApi.regional(metric),
      analyticsApi.seasonal(metric),
      analyticsApi.correlation(),
    ])
      .then(([t, r, s, c]) => {
        setTrend(t.data);
        setRegional(r.data);
        setSeasonal(s.data);
        setCorrelation(c.data);
      })
      .finally(() => setLoading(false));
  }, [metric, granularity]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Climate Analytics"
        subtitle="Deep-dive trend, regional, seasonal and correlation analysis"
        actions={
          <>
            <Select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-52">
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Select value={granularity} onChange={(e) => setGranularity(e.target.value)} className="w-36">
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </Select>
          </>
        }
      />

      {loading ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card title={`${activeMetric.label} Trend`} className="xl:col-span-2">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeMetric.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={activeMetric.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="value" name={activeMetric.label} stroke={activeMetric.color} fill="url(#metricGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Regional Comparison">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={regional} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <YAxis dataKey="region" type="category" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={90} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name={activeMetric.label} fill={activeMetric.color} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Seasonal Pattern (by month)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={seasonal}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name={activeMetric.label} fill={activeMetric.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Metric Correlation Matrix" className="xl:col-span-2">
            {correlation && (
              <div className="overflow-x-auto scroll-thin">
                <table className="text-xs font-mono min-w-[520px]">
                  <thead>
                    <tr>
                      <th className="p-2"></th>
                      {correlation.metrics.map((m) => (
                        <th key={m} className="p-2 text-text-muted">
                          {m.split("_")[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlation.matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 text-text-muted">{correlation.metrics[i].split("_")[0]}</td>
                        {row.map((v, j) => {
                          const intensity = Math.abs(v);
                          const bg = v >= 0 ? `rgba(6,182,212,${intensity})` : `rgba(244,63,94,${intensity})`;
                          return (
                            <td key={j} className="p-2 text-center rounded" style={{ background: bg, color: intensity > 0.5 ? "#0B1120" : "#F8FAFC" }}>
                              {v}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
