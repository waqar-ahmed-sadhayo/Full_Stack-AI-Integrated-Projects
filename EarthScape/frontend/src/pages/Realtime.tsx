import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Radio, Satellite, ShieldAlert, Cpu } from "lucide-react";
import { useRealtimeFeed } from "../hooks/useRealtimeFeed";
import { realtimeApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import { LoadingState } from "../components/ui/States";

export default function Realtime() {
  const { events, connected } = useRealtimeFeed(80);
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    realtimeApi
      .sensors()
      .then((res) => setSensors(res.data))
      .finally(() => setLoading(false));
  }, []);

  const readings = useMemo(
    () =>
      events
        .filter((e) => e.type === "sensor_reading")
        .slice(0, 30)
        .reverse()
        .map((e) => ({
          time: e.data.timestamp?.slice(11, 19),
          temperature_c: e.data.temperature_c,
          humidity_pct: e.data.humidity_pct,
          co2_ppm: e.data.co2_ppm,
        })),
    [events]
  );

  const latest = events.find((e) => e.type === "sensor_reading")?.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Real-Time Monitoring"
        subtitle="Live streaming sensor telemetry over WebSocket"
        actions={
          <div className="flex items-center gap-2 bg-surface-2/60 border border-border-strong px-3 py-1.5 rounded-full">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-secondary animate-pulse-dot" : "bg-danger"}`} />
            <span className="text-xs font-mono text-text-muted">{connected ? "Live" : "Reconnecting..."}</span>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-2 text-text-muted text-xs mb-2"><Satellite size={14} /> Live Temp</div>
          <span className="telemetry-value text-xl text-primary-bright">{latest?.temperature_c ?? "—"}°C</span>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-text-muted text-xs mb-2"><Radio size={14} /> Live CO2</div>
          <span className="telemetry-value text-xl text-secondary-bright">{latest?.co2_ppm ?? "—"} ppm</span>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-text-muted text-xs mb-2"><Cpu size={14} /> Active Sensors</div>
          <span className="telemetry-value text-xl text-text">{sensors.filter((s) => s.status === "Online").length}/{sensors.length}</span>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-text-muted text-xs mb-2"><ShieldAlert size={14} /> Anomaly Events</div>
          <span className="telemetry-value text-xl text-danger-bright">{events.filter((e) => e.type === "anomaly_event").length}</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Live Temperature & CO2 Stream">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={readings}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="temp"
                tick={{ fontSize: 10, fill: "#4CD7F6" }}
                tickLine={false}
                axisLine={false}
                width={36}
                domain={["auto", "auto"]}
              />
              <YAxis
                yAxisId="co2"
                orientation="right"
                tick={{ fontSize: 10, fill: "#F59E0B" }}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={["auto", "auto"]}
              />
              <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
              <Line yAxisId="temp" type="monotone" dataKey="temperature_c" name="°C" stroke="#4CD7F6" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line yAxisId="co2" type="monotone" dataKey="co2_ppm" name="ppm" stroke="#F59E0B" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Live Event Stream">
          <div className="h-[260px] overflow-y-auto scroll-thin flex flex-col gap-1.5 font-mono text-xs">
            {events.length === 0 && <p className="text-text-muted">Waiting for events...</p>}
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-border/60 pb-1.5">
                <Badge
                  label={e.type.replace("_event", "").replace("_", " ")}
                  tone={e.type === "alert_event" ? "flagged" : e.type === "anomaly_event" ? "high" : "processed"}
                />
                <span className="text-text-muted truncate flex-1">
                  {e.type === "sensor_reading" && `${e.data.location} · ${e.data.temperature_c}°C · ${e.data.sensor_id}`}
                  {e.type === "anomaly_event" && `${e.data.location} · ${e.data.kind} · ${e.data.parameter}`}
                  {e.type === "alert_event" && `${e.data.title}`}
                  {e.type === "processing_event" && e.data.message}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Sensor Constellation Status">
        {loading ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
            {sensors.map((s) => (
              <div key={s.sensor_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2/50 border border-border">
                <span className="text-[11px] font-mono text-text truncate">{s.sensor_id}</span>
                <Badge label={s.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
