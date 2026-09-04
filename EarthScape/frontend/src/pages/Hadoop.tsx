import { useEffect, useState } from "react";
import { Play, Server, HardDrive, Activity } from "lucide-react";
import { hadoopApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import DataTable, { type Column } from "../components/ui/DataTable";
import { useToast } from "../context/ToastContext";

interface Job {
  _id: string;
  job_id: string;
  name: string;
  status: string;
  mapper_status: string;
  reducer_status: string;
  input_records: number;
  output_records: number;
  start_time: string;
  end_time: string | null;
  execution_time_ms: number | null;
}

function bytesToGb(b: number) {
  return (b / 1024 ** 3).toFixed(1);
}

export default function Hadoop() {
  const { push } = useToast();
  const [health, setHealth] = useState<any>(null);
  const [storage, setStorage] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([hadoopApi.hdfsHealth(), hadoopApi.hdfsStorage(), hadoopApi.jobs(), hadoopApi.jobDefinitions()])
      .then(([h, s, j, d]) => {
        setHealth(h.data);
        setStorage(s.data);
        setJobs(j.data);
        setDefinitions(d.data);
        if (!selectedJob && d.data.length) setSelectedJob(d.data[0].job_type);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startJob = async () => {
    setStarting(true);
    try {
      await hadoopApi.startJob(selectedJob);
      push("success", "MapReduce job submitted.");
      setTimeout(load, 1200);
    } catch {
      push("error", "Failed to start job.");
    } finally {
      setStarting(false);
    }
  };

  const columns: Column<Job>[] = [
    { key: "job_id", header: "Job ID", render: (r) => <span className="font-mono text-xs">{r.job_id}</span> },
    { key: "name", header: "Name" },
    { key: "input_records", header: "Input", render: (r) => <span className="font-mono">{r.input_records}</span> },
    { key: "output_records", header: "Output", render: (r) => <span className="font-mono">{r.output_records}</span> },
    { key: "mapper_status", header: "Mapper", render: (r) => <Badge label={r.mapper_status} /> },
    { key: "reducer_status", header: "Reducer", render: (r) => <Badge label={r.reducer_status} /> },
    { key: "status", header: "Status", render: (r) => <Badge label={r.status} /> },
    { key: "execution_time_ms", header: "Exec Time", render: (r) => <span className="font-mono text-xs">{r.execution_time_ms ? `${r.execution_time_ms}ms` : "—"}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hadoop / HDFS Monitoring"
        subtitle={health?.simulated ? "DEMO_MODE: simulated HDFS + MapReduce on local filesystem" : "Connected to live Hadoop cluster"}
        actions={
          <>
            <Select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} className="w-64">
              {definitions.map((d) => (
                <option key={d.job_type} value={d.job_type}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Button icon={<Play size={15} />} loading={starting} onClick={startJob}>
              Start Job
            </Button>
          </>
        }
      />

      {storage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-2 text-text-muted text-xs mb-2"><HardDrive size={14} /> HDFS Used</div>
            <span className="telemetry-value text-xl text-text">{storage.used_pct}%</span>
            <p className="text-[11px] text-text-muted mt-1 font-mono">{bytesToGb(storage.used_bytes)} / {bytesToGb(storage.total_capacity_bytes)} GB</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-text-muted text-xs mb-2"><Server size={14} /> Files Tracked</div>
            <span className="telemetry-value text-xl text-text">{storage.file_count}</span>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-text-muted text-xs mb-2"><Activity size={14} /> Replication Factor</div>
            <span className="telemetry-value text-xl text-text">{storage.replication_factor}x</span>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-text-muted text-xs mb-2"><Server size={14} /> Cluster Health</div>
            <Badge label={health?.status ?? "unknown"} tone="online" />
          </Card>
        </div>
      )}

      {storage && (
        <Card title="HDFS Zone Breakdown (/earthscape/{zone})">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(storage.zones).map(([zone, stats]: any) => (
              <div key={zone} className="rounded-lg border border-border bg-surface-2/40 p-3">
                <p className="text-xs font-mono text-primary-bright">/{zone}</p>
                <p className="text-lg font-mono text-text mt-1">{stats.files}</p>
                <p className="text-[10px] text-text-muted">files &bull; {(stats.size_bytes / 1024).toFixed(1)} KB</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <DataTable columns={columns} rows={jobs} rowKey={(r) => r._id} loading={loading} emptyLabel="No MapReduce jobs run yet." />
    </div>
  );
}
