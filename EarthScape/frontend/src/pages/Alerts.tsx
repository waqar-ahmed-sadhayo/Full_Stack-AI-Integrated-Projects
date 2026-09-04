import { useEffect, useState } from "react";
import { Bell, Plus, Sliders } from "lucide-react";
import { alertsApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Input, Select, Textarea } from "../components/ui/Input";
import DataTable, { type Column } from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const METRICS = ["temperature_c", "rainfall_mm", "humidity_pct", "wind_speed_kmh", "pressure_hpa", "co2_ppm"];
const SEVERITIES = ["low", "medium", "high", "critical"];

interface Alert {
  _id: string;
  title: string;
  severity: string;
  message: string;
  related_metric?: string;
  status: string;
  source: string;
  created_at: string;
}

export default function Alerts() {
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState<Alert[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  const [form, setForm] = useState({ title: "", severity: "medium", message: "", related_metric: "temperature_c", threshold: "", broadcast: true });
  const [thresholdForm, setThresholdForm] = useState({ metric: "temperature_c", operator: "gt", value: 40, severity: "high" });

  const load = () => {
    setLoading(true);
    Promise.all([alertsApi.list(), isAdmin ? alertsApi.thresholds() : Promise.resolve({ data: [] })])
      .then(([a, t]) => {
        setRows(a.data);
        setThresholds(t.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [isAdmin]);

  const createAlert = async () => {
    try {
      await alertsApi.create({ ...form, threshold: form.threshold ? Number(form.threshold) : undefined });
      push("success", "Alert broadcast.");
      setShowCreate(false);
      setForm({ title: "", severity: "medium", message: "", related_metric: "temperature_c", threshold: "", broadcast: true });
      load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to create alert.");
    }
  };

  const resolve = async (id: string) => {
    await alertsApi.resolve(id);
    load();
  };

  const createThreshold = async () => {
    await alertsApi.createThreshold(thresholdForm);
    push("success", "Threshold configured.");
    load();
  };

  const deleteThreshold = async (id: string) => {
    await alertsApi.deleteThreshold(id);
    load();
  };

  const columns: Column<Alert>[] = [
    { key: "title", header: "Title" },
    { key: "severity", header: "Severity", render: (r) => <Badge label={r.severity} /> },
    { key: "message", header: "Message", render: (r) => <div className="max-w-[320px] whitespace-normal break-words">{r.message}</div> },
    { key: "source", header: "Source" },
    { key: "status", header: "Status", render: (r) => <Badge label={r.status} /> },
    { key: "created_at", header: "Created", render: (r) => <span className="font-mono text-xs">{r.created_at?.slice(0, 16).replace("T", " ")}</span> },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        r.status === "Active" ? (
          <button onClick={() => resolve(r._id)} className="text-[11px] text-secondary-bright hover:underline">
            Resolve
          </button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alerts & Notifications"
        subtitle="Threshold breaches and broadcast notices"
        actions={
          isAdmin && (
            <>
              <Button variant="secondary" icon={<Sliders size={15} />} onClick={() => setShowThresholds(true)}>
                Thresholds
              </Button>
              <Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>
                Create Alert
              </Button>
            </>
          )
        }
      />

      <DataTable columns={columns} rows={rows} rowKey={(r) => r._id} loading={loading} emptyLabel="No alerts yet." />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Broadcast New Alert">
        <div className="flex flex-col gap-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Severity" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select label="Related Metric" value={form.related_metric} onChange={(e) => setForm((f) => ({ ...f, related_metric: e.target.value }))}>
              {METRICS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <Input label="Threshold (optional)" type="number" value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} />
          <Textarea label="Message" rows={3} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input type="checkbox" checked={form.broadcast} onChange={(e) => setForm((f) => ({ ...f, broadcast: e.target.checked }))} />
            Broadcast to all users
          </label>
          <Button onClick={createAlert} icon={<Bell size={15} />}>
            Send Alert
          </Button>
        </div>
      </Modal>

      <Modal open={showThresholds} onClose={() => setShowThresholds(false)} title="Alert Thresholds">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Metric" value={thresholdForm.metric} onChange={(e) => setThresholdForm((f) => ({ ...f, metric: e.target.value }))}>
              {METRICS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Select label="Operator" value={thresholdForm.operator} onChange={(e) => setThresholdForm((f) => ({ ...f, operator: e.target.value }))}>
              <option value="gt">Above (&gt;)</option>
              <option value="lt">Below (&lt;)</option>
            </Select>
            <Input label="Value" type="number" value={thresholdForm.value} onChange={(e) => setThresholdForm((f) => ({ ...f, value: Number(e.target.value) }))} />
            <Select label="Severity" value={thresholdForm.severity} onChange={(e) => setThresholdForm((f) => ({ ...f, severity: e.target.value }))}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" onClick={createThreshold}>
            Add Threshold
          </Button>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto scroll-thin">
            {thresholds.map((t) => (
              <div key={t._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2/50 border border-border text-xs font-mono">
                <span>
                  {t.metric} {t.operator === "gt" ? ">" : "<"} {t.value} → <Badge label={t.severity} />
                </span>
                <button onClick={() => deleteThreshold(t._id)} className="text-danger-bright hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
