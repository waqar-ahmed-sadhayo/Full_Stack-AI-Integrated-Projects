import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ScanSearch } from "lucide-react";
import { anomalyApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import DataTable, { type Column } from "../components/ui/DataTable";
import { useToast } from "../context/ToastContext";

const METRICS = ["temperature_c", "rainfall_mm", "humidity_pct", "wind_speed_kmh", "pressure_hpa", "co2_ppm"];
const SEVERITY_COLORS: Record<string, string> = { Critical: "#F43F5E", High: "#EF4444", Medium: "#F59E0B", Low: "#4CD7F6", Normal: "#4EDEA3" };

interface Anomaly {
  _id: string;
  location: string;
  timestamp: string;
  parameter: string;
  actual_value: number;
  expected_value: number;
  deviation: number;
  severity: string;
  detection_method: string;
  confidence_score: number;
  status: string;
}

export default function Anomalies() {
  const { push } = useToast();
  const [metric, setMetric] = useState("temperature_c");
  const [severityFilter, setSeverityFilter] = useState("");
  const [rows, setRows] = useState<Anomaly[]>([]);
  const [distribution, setDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([anomalyApi.list({ severity: severityFilter || undefined }), anomalyApi.distribution()])
      .then(([a, d]) => {
        setRows(a.data);
        setDistribution(d.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [severityFilter]);

  const runDetection = async () => {
    setDetecting(true);
    try {
      const res = await anomalyApi.detect(metric);
      push("success", `Detected ${res.data.total_anomalies} anomalies (Z-score: ${res.data.zscore_found}, IQR: ${res.data.iqr_found}, Isolation Forest: ${res.data.isolation_forest_found})`);
      load();
    } catch {
      push("error", "Detection run failed.");
    } finally {
      setDetecting(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    await anomalyApi.setStatus(id, status);
    load();
  };

  const columns: Column<Anomaly>[] = [
    { key: "timestamp", header: "Timestamp", render: (r) => <span className="font-mono text-xs">{r.timestamp?.slice(0, 16).replace("T", " ")}</span> },
    { key: "location", header: "Location" },
    { key: "parameter", header: "Parameter", render: (r) => <span className="font-mono text-xs">{r.parameter}</span> },
    { key: "actual_value", header: "Actual", render: (r) => <span className="font-mono">{r.actual_value}</span> },
    { key: "expected_value", header: "Expected", render: (r) => <span className="font-mono">{r.expected_value}</span> },
    { key: "deviation", header: "Deviation", render: (r) => <span className="font-mono">{r.deviation}</span> },
    { key: "severity", header: "Severity", render: (r) => <Badge label={r.severity} /> },
    { key: "detection_method", header: "Method" },
    { key: "confidence_score", header: "Confidence", render: (r) => <span className="font-mono">{(r.confidence_score * 100).toFixed(0)}%</span> },
    { key: "status", header: "Status", render: (r) => <Badge label={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        r.status === "Open" ? (
          <div className="flex gap-1.5">
            <button onClick={() => setStatus(r._id, "Acknowledged")} className="text-[11px] text-primary-bright hover:underline">
              Acknowledge
            </button>
            <button onClick={() => setStatus(r._id, "Resolved")} className="text-[11px] text-secondary-bright hover:underline">
              Resolve
            </button>
          </div>
        ) : null,
    },
  ];

  const severityData = distribution ? Object.entries(distribution.by_severity).map(([name, value]) => ({ name, value })) : [];
  const methodData = distribution ? Object.entries(distribution.by_method).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Anomaly Detection"
        subtitle="Statistical (Z-Score, IQR) and ML (Isolation Forest) outlier detection"
        actions={
          <>
            <Select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-48">
              {METRICS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Button icon={<ScanSearch size={15} />} onClick={runDetection} loading={detecting}>
              Run Detection
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Distribution by Severity">
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {severityData.map((d, i) => (
                    <Cell key={i} fill={SEVERITY_COLORS[d.name] ?? "#94A3B8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">Run detection to populate results.</div>
          )}
        </Card>
        <Card title="Distribution by Detection Method">
          {methodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={methodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip />
                <Bar dataKey="value" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">No data yet.</div>
          )}
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-48">
          <option value="">All Severities</option>
          {["Critical", "High", "Medium", "Low", "Normal"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r._id} loading={loading} emptyLabel="No anomalies recorded. Run detection above." />
    </div>
  );
}
