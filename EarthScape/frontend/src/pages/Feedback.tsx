import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { feedbackApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import { Input, Select, Textarea } from "../components/ui/Input";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import DataTable, { type Column } from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const CATEGORIES = ["Bug Report", "Feature Request", "Data Quality", "Access / Account", "General Question"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Open", "In Progress", "Resolved"];

interface Ticket {
  _id: string;
  category: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  submitted_by_name: string;
  created_at: string;
}

export default function Feedback() {
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: CATEGORIES[0], subject: "", message: "", priority: "Medium" });

  const load = () => {
    setLoading(true);
    feedbackApi
      .list()
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async () => {
    try {
      await feedbackApi.create(form);
      push("success", "Ticket submitted.");
      setShowModal(false);
      setForm({ category: CATEGORIES[0], subject: "", message: "", priority: "Medium" });
      load();
    } catch {
      push("error", "Failed to submit ticket.");
    }
  };

  const changeStatus = async (id: string, status: string) => {
    await feedbackApi.setStatus(id, status);
    load();
  };

  const columns: Column<Ticket>[] = [
    { key: "subject", header: "Subject" },
    { key: "category", header: "Category" },
    { key: "priority", header: "Priority", render: (r) => <Badge label={r.priority} tone={r.priority === "Urgent" ? "critical" : r.priority === "High" ? "high" : "medium"} /> },
    { key: "status", header: "Status", render: (r) => <Badge label={r.status} /> },
    ...(isAdmin ? [{ key: "submitted_by_name", header: "Submitted By" } as Column<Ticket>] : []),
    { key: "created_at", header: "Created", render: (r) => <span className="font-mono text-xs">{r.created_at?.slice(0, 10)}</span> },
    ...(isAdmin
      ? [
          {
            key: "actions",
            header: "Update Status",
            render: (r: Ticket) => (
              <select
                value={r.status}
                onChange={(e) => changeStatus(r._id, e.target.value)}
                className="text-xs bg-surface-2 border border-border-strong rounded px-1.5 py-1"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ),
          } as Column<Ticket>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Feedback & Support"
        subtitle={isAdmin ? "All submitted tickets" : "Your submitted tickets"}
        actions={
          <Button icon={<MessageSquarePlus size={15} />} onClick={() => setShowModal(true)}>
            New Ticket
          </Button>
        }
      />

      <DataTable columns={columns} rows={rows} rowKey={(r) => r._id} loading={loading} emptyLabel="No tickets yet." />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Submit Feedback">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select label="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <Input label="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          <Textarea label="Message" rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
          <Button onClick={submit}>Submit</Button>
        </div>
      </Modal>
    </div>
  );
}
