import { useEffect, useState } from "react";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { climateDataApi } from "../api/endpoints";
import { API_BASE_URL } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import DataTable, { type Column } from "../components/ui/DataTable";
import Pagination from "../components/ui/Pagination";
import Badge from "../components/ui/Badge";
import { REGIONS, DATA_SOURCES } from "../constants/geo";

interface Record {
  _id: string;
  timestamp: string;
  location: string;
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  humidity_pct: number;
  rainfall_mm: number;
  wind_speed_kmh: number;
  pressure_hpa: number;
  co2_ppm: number;
  sensor_id: string;
  data_source: string;
  status: string;
}

const ALL_COLUMNS: Column<Record>[] = [
  { key: "timestamp", header: "Date", sortable: true, render: (r) => <span className="font-mono text-xs">{r.timestamp?.slice(0, 10)}</span> },
  { key: "location", header: "Location" },
  { key: "country", header: "Country" },
  { key: "region", header: "Region" },
  { key: "city", header: "City" },
  { key: "latitude", header: "Lat/Lon", render: (r) => <span className="font-mono text-xs">{r.latitude?.toFixed(2)}, {r.longitude?.toFixed(2)}</span> },
  { key: "temperature_c", header: "Temp (°C)", sortable: true, render: (r) => <span className="font-mono">{r.temperature_c}</span> },
  { key: "humidity_pct", header: "Humidity (%)", render: (r) => <span className="font-mono">{r.humidity_pct}</span> },
  { key: "rainfall_mm", header: "Rainfall (mm)", render: (r) => <span className="font-mono">{r.rainfall_mm}</span> },
  { key: "wind_speed_kmh", header: "Wind (km/h)", render: (r) => <span className="font-mono">{r.wind_speed_kmh}</span> },
  { key: "pressure_hpa", header: "Pressure (hPa)", render: (r) => <span className="font-mono">{r.pressure_hpa}</span> },
  { key: "co2_ppm", header: "CO2 (ppm)", render: (r) => <span className="font-mono">{r.co2_ppm}</span> },
  { key: "sensor_id", header: "Sensor ID", render: (r) => <span className="font-mono text-xs">{r.sensor_id}</span> },
  { key: "data_source", header: "Source" },
  { key: "status", header: "Status", render: (r) => <Badge label={r.status} /> },
];

export default function ClimateData() {
  const [rows, setRows] = useState<Record[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [dataSource, setDataSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));

  const load = () => {
    setLoading(true);
    climateDataApi
      .list({
        page,
        page_size: 20,
        sort_field: sortField,
        sort_dir: sortDir === "asc" ? 1 : -1,
        search: search || undefined,
        region: region || undefined,
        data_source: dataSource || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      .then((res) => {
        setRows(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.total_pages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, sortField, sortDir]);

  const applyFilters = () => {
    setPage(1);
    load();
  };

  const onSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const toggleCol = (key: string) =>
    setVisibleCols((cols) => (cols.includes(key) ? cols.filter((c) => c !== key) : [...cols, key]));

  const columns = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key));

  const exportCsv = () => {
    const params = { search, region, data_source: dataSource, date_from: dateFrom, date_to: dateTo };
    const url = `${API_BASE_URL}${climateDataApi.exportUrl(params)}`;
    const token = localStorage.getItem("es_access_token");
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "climate_data_export.csv";
        link.click();
      });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Climate Records"
        subtitle={`${total.toLocaleString()} records in the unified data store`}
        actions={
          <>
            <Button variant="secondary" icon={<SlidersHorizontal size={15} />} onClick={() => setShowFilters((s) => !s)}>
              Filters
            </Button>
            <Button variant="secondary" icon={<Download size={15} />} onClick={exportCsv}>
              Export CSV
            </Button>
          </>
        }
      />

      <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              icon={<Search size={15} />}
              placeholder="Search location, sensor, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <Button variant="primary" onClick={applyFilters}>
            Apply
          </Button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border">
            <Select label="Region" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">All Regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            <Select label="Data Source" value={dataSource} onChange={(e) => setDataSource(e.target.value)}>
              <option value="">All Sources</option>
              {DATA_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Input label="From Date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input label="To Date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <div className="col-span-2 md:col-span-4">
              <span className="block text-xs font-semibold text-text-muted mb-1.5">Visible Columns</span>
              <div className="flex flex-wrap gap-2">
                {ALL_COLUMNS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => toggleCol(c.key)}
                    className={`text-[11px] px-2 py-1 rounded border font-mono ${
                      visibleCols.includes(c.key) ? "border-primary/40 text-primary-bright bg-primary/10" : "border-border-strong text-text-muted"
                    }`}
                  >
                    {c.header}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r._id} loading={loading} sortField={sortField} sortDir={sortDir} onSort={onSort} />
      <div className="glass-card rounded-xl">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
