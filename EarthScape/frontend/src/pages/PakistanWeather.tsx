import { useCallback, useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Gauge,
  MapPin,
  Moon,
  RefreshCw,
  Sun,
  Wind,
} from "lucide-react";
import { liveWeatherApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { LoadingState, ErrorState } from "../components/ui/States";

const ICONS: Record<string, any> = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

interface CityWeather {
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  feels_like_c: number;
  humidity_pct: number;
  precipitation_mm: number;
  pressure_hpa: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  is_day: boolean;
  weather_label: string;
  weather_icon: string;
  observed_at: string;
  timezone: string;
}

interface WeatherResponse {
  source: string;
  fetched_at: string;
  cache_age_seconds: number;
  stale: boolean;
  error: string | null;
  cities: CityWeather[];
}

function windDirectionLabel(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export default function PakistanWeather() {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback((refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(false);
    liveWeatherApi
      .pakistan(refresh)
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <LoadingState label="Fetching live weather for Pakistan..." />;
  if (error || !data) return <ErrorState message="Could not reach the live weather provider (Open-Meteo)." onRetry={() => load(false)} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pakistan Weather"
        subtitle="Live current conditions for major Pakistani cities — Open-Meteo, not simulated"
        actions={
          <>
            <div className="flex items-center gap-2 bg-surface-2/60 border border-border-strong px-3 py-1.5 rounded-full">
              <span className={`w-2 h-2 rounded-full ${data.stale ? "bg-warning" : "bg-secondary animate-pulse-dot"}`} />
              <span className="text-xs font-mono text-text-muted">
                {data.stale ? "Stale (provider unreachable)" : `Live · updated ${Math.round(data.cache_age_seconds)}s ago`}
              </span>
            </div>
            <Button variant="secondary" icon={<RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />} loading={refreshing} onClick={() => load(true)}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.cities.map((c) => {
          const Icon = ICONS[c.weather_icon] ?? Cloud;
          return (
            <div key={c.city} className="glass-card rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-text font-display font-bold text-lg">
                    <MapPin size={15} className="text-primary-bright" />
                    {c.city}
                  </div>
                  <span className="text-xs text-text-muted">{c.province}, Pakistan</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-muted">
                  {c.is_day ? <Sun size={14} className="text-warning" /> : <Moon size={14} className="text-primary-bright" />}
                  <Icon size={28} className="text-primary-bright" />
                </div>
              </div>

              <div className="flex items-end gap-3">
                <span className="telemetry-value text-4xl text-text">{Math.round(c.temperature_c)}°</span>
                <div className="flex flex-col mb-1">
                  <span className="text-xs text-text-muted">Feels {Math.round(c.feels_like_c)}°C</span>
                  <span className="text-xs font-semibold text-primary-bright">{c.weather_label}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-text-muted border-t border-border pt-3">
                <div className="flex items-center gap-1.5">
                  <Droplets size={13} className="text-secondary-bright" />
                  {c.humidity_pct}%
                </div>
                <div className="flex items-center gap-1.5">
                  <Wind size={13} className="text-primary-bright" />
                  {Math.round(c.wind_speed_kmh)} km/h {windDirectionLabel(c.wind_direction_deg)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Gauge size={13} className="text-warning" />
                  {Math.round(c.pressure_hpa)} hPa
                </div>
              </div>

              <p className="text-[10px] text-text-muted/70 font-mono">
                Observed {c.observed_at?.replace("T", " ")} ({c.timezone})
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-text-muted/70 font-mono text-center">
        Source: {data.source} &bull; auto-refreshes every 5 minutes
      </p>
    </div>
  );
}
