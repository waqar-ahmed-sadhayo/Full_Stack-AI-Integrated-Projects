import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileCheck2, AlertTriangle, Database } from "lucide-react";
import { ingestionApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import { LoadingState, EmptyState } from "../components/ui/States";
import { useToast } from "../context/ToastContext";

const SOURCE_TYPES = ["Satellite", "Weather Station", "Environmental Sensor", "IoT Device", "Historical Database"];

export default function Ingestion() {
  const { push } = useToast();
  const [sourceType, setSourceType] = useState(SOURCE_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDatasets = () => {
    setLoading(true);
    ingestionApi
      .datasets()
      .then((res) => setDatasets(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(loadDatasets, []);

  const handleFile = async (file: File) => {
    setUploading(true);
    setLastResult(null);
    try {
      const res = await ingestionApi.upload(file, sourceType);
      setLastResult(res.data);
      push("success", `Ingested ${res.data.record_count} records from ${file.name}`);
      loadDatasets();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      push("error", typeof detail === "string" ? detail : detail?.message || "Ingestion failed validation.");
      if (detail?.errors) setLastResult({ filename: file.name, validation_errors: detail.errors, failed: true });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Data Ingestion" subtitle="Upload climate datasets from satellites, weather stations, sensors and archives" />

      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end mb-4">
          <div className="w-full md:w-64">
            <Select label="Source Type" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              {SOURCE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl py-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border-strong hover:border-primary/40"
          }`}
        >
          <UploadCloud size={32} className="text-primary-bright" />
          <p className="text-sm text-text font-semibold">Drop a CSV, JSON, Excel or TXT file here</p>
          <p className="text-xs text-text-muted">or click to browse (max 50MB)</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".csv,.json,.xlsx,.xls,.txt"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {uploading && <LoadingState label="Validating, cleaning and storing to HDFS..." />}

        {lastResult && !uploading && (
          <div className="mt-5 rounded-lg border border-border-strong p-4">
            <div className="flex items-center gap-2 mb-3">
              {lastResult.failed ? <AlertTriangle size={16} className="text-danger-bright" /> : <FileCheck2 size={16} className="text-secondary-bright" />}
              <span className="font-semibold text-sm text-text">{lastResult.filename}</span>
              {!lastResult.failed && <Badge label={lastResult.validation_status} tone={lastResult.validation_errors?.length ? "flagged" : "validated"} />}
            </div>
            {!lastResult.failed ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono text-text-muted">
                <div>Records ingested: <span className="text-text">{lastResult.record_count}</span></div>
                <div>Duplicates removed: <span className="text-text">{lastResult.duplicates_removed}</span></div>
                <div>Invalid timestamps dropped: <span className="text-text">{lastResult.invalid_timestamps_dropped}</span></div>
                <div>Size: <span className="text-text">{(lastResult.size_bytes / 1024).toFixed(1)} KB</span></div>
                <div className="col-span-2 md:col-span-4">HDFS destination: <span className="text-primary-bright">{lastResult.hdfs_destination}</span></div>
                {lastResult.validation_errors?.length > 0 && (
                  <div className="col-span-2 md:col-span-4 text-warning">Warnings: {lastResult.validation_errors.join("; ")}</div>
                )}
                {lastResult.audit_trail?.length > 0 && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-text-muted">Audit trail:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {lastResult.audit_trail.map((a: string, i: number) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <ul className="text-xs text-danger-bright list-disc list-inside space-y-0.5">
                {lastResult.validation_errors?.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card title="Ingestion History">
        {loading ? (
          <LoadingState />
        ) : datasets.length === 0 ? (
          <EmptyState icon={Database} label="No datasets uploaded yet" />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="border-b border-border-strong text-left text-[11px] text-text-muted uppercase tracking-wider">
                  <th className="py-2 pr-4">Filename</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Records</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Uploaded</th>
                  <th className="py-2 pr-4">HDFS Path</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d._id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4 font-medium">{d.filename}</td>
                    <td className="py-2 pr-4 text-text-muted">{d.source_type}</td>
                    <td className="py-2 pr-4 font-mono">{d.record_count}</td>
                    <td className="py-2 pr-4">
                      <Badge label={d.validation_status} tone={d.validation_errors?.length ? "flagged" : "validated"} />
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-text-muted">{d.uploaded_at?.slice(0, 16).replace("T", " ")}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-primary-bright truncate max-w-[220px]">{d.hdfs_destination}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
