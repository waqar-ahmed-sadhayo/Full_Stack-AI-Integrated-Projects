import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { reportsApi } from "../api/endpoints";
import { API_BASE_URL } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Input";
import Button from "../components/ui/Button";
import DataTable, { type Column } from "../components/ui/DataTable";
import { useToast } from "../context/ToastContext";

const REPORT_LABELS: Record<string, string> = {
  climate_trend: "Climate Trend Report",
  anomaly: "Anomaly Report",
  prediction: "Prediction Report",
  regional: "Regional Report",
  data_processing: "Data Processing Report",
  data_quality: "Data Quality Report",
};

interface ReportDoc {
  _id: string;
  report_type: string;
  format: string;
  filename: string;
  row_count: number;
  generated_at: string;
  size_bytes: number;
}

export default function Reports() {
  const { push } = useToast();
  const [reportType, setReportType] = useState("climate_trend");
  const [format, setFormat] = useState("pdf");
  const [rows, setRows] = useState<ReportDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    setLoading(true);
    reportsApi
      .list()
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const generate = async () => {
    setGenerating(true);
    try {
      await reportsApi.generate(reportType, format);
      push("success", "Report generated.");
      load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Report generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const download = (id: string, filename: string) => {
    const token = localStorage.getItem("es_access_token");
    fetch(`${API_BASE_URL}${reportsApi.downloadUrl(id)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
      });
  };

  const columns: Column<ReportDoc>[] = [
    { key: "filename", header: "Filename" },
    { key: "report_type", header: "Type", render: (r) => REPORT_LABELS[r.report_type] ?? r.report_type },
    { key: "format", header: "Format", render: (r) => <span className="uppercase font-mono text-xs">{r.format}</span> },
    { key: "row_count", header: "Rows", render: (r) => <span className="font-mono">{r.row_count}</span> },
    { key: "size_bytes", header: "Size", render: (r) => <span className="font-mono">{(r.size_bytes / 1024).toFixed(1)} KB</span> },
    { key: "generated_at", header: "Generated", render: (r) => <span className="font-mono text-xs">{r.generated_at?.slice(0, 16).replace("T", " ")}</span> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button onClick={() => download(r._id, r.filename)} className="text-primary-bright hover:underline flex items-center gap-1 text-xs">
          <Download size={13} /> Download
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" subtitle="Generate reports from real processed data" />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Select label="Report Type" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {Object.entries(REPORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select label="Format" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </Select>
          <Button icon={<FileText size={15} />} loading={generating} onClick={generate}>
            Generate Report
          </Button>
        </div>
      </Card>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r._id} loading={loading} emptyLabel="No reports generated yet." />
    </div>
  );
}
