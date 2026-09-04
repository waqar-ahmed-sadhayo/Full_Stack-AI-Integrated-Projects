import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { mapApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import { Select } from "../components/ui/Input";
import { LoadingState } from "../components/ui/States";

const METRIC_OPTIONS = [
  { key: "temperature_c", label: "Temperature (°C)" },
  { key: "rainfall_mm", label: "Rainfall (mm)" },
  { key: "co2_ppm", label: "CO2 (ppm)" },
];

function colorFor(metric: string, value: number, isAnomaly: boolean) {
  if (isAnomaly) return "#F43F5E";
  if (metric === "temperature_c") return value > 25 ? "#F59E0B" : value > 12 ? "#4EDEA3" : "#4CD7F6";
  if (metric === "rainfall_mm") return value > 8 ? "#06B6D4" : "#4EDEA3";
  return value > 425 ? "#F43F5E" : "#4EDEA3";
}

export default function ClimateMap() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("temperature_c");

  useEffect(() => {
    mapApi
      .stations()
      .then((res) => setStations(res.data))
      .finally(() => setLoading(false));
  }, []);

  const anomalyCount = useMemo(() => stations.filter((s) => s.is_anomaly).length, [stations]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Climate Map"
        subtitle={`${stations.length} monitoring stations · ${anomalyCount} flagged anomalies`}
        actions={
          <Select value={metric} onChange={(e) => setMetric(e.target.value)} className="w-56">
            {METRIC_OPTIONS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </Select>
        }
      />

      <div className="glass-card rounded-xl overflow-hidden" style={{ height: "62vh" }}>
        {loading ? (
          <LoadingState label="Loading sensor constellation..." />
        ) : (
          <MapContainer center={[15, 20]} zoom={2} style={{ height: "100%", width: "100%", background: "#0d1322" }} worldCopyJump>
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
              className="map-tiles-dark"
            />
            {stations.map((s) => (
              <CircleMarker
                key={s.sensor_id}
                center={[s.latitude, s.longitude]}
                radius={s.is_anomaly ? 10 : 7}
                pathOptions={{ color: colorFor(metric, s[metric], s.is_anomaly), fillColor: colorFor(metric, s[metric], s.is_anomaly), fillOpacity: 0.7, weight: 1.5 }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold">{s.city}, {s.country}</p>
                    <p>Sensor: {s.sensor_id}</p>
                    <p>Coords: {s.latitude.toFixed(2)}, {s.longitude.toFixed(2)}</p>
                    <p>Temp: {s.temperature_c}°C &bull; Humidity: {s.humidity_pct}%</p>
                    <p>Rainfall: {s.rainfall_mm}mm &bull; CO2: {s.co2_ppm}ppm</p>
                    <p>Source: {s.data_source}</p>
                    <p>Status: {s.status} {s.is_anomaly ? "(ANOMALY)" : ""}</p>
                    <p className="text-[10px] text-gray-400">{s.timestamp}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-text-muted font-mono">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4CD7F6] inline-block" /> Normal / Cool</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4EDEA3] inline-block" /> Moderate</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block" /> Elevated</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] inline-block" /> Anomaly</span>
      </div>
    </div>
  );
}
