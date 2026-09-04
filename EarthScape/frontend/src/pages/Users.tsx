import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { usersApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import { Input, Select } from "../components/ui/Input";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import DataTable, { type Column } from "../components/ui/DataTable";
import Badge from "../components/ui/Badge";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

interface EsUserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  organization?: string;
  is_active: boolean;
  created_at: string;
  avatar_initials: string;
}

export default function Users() {
  const { push } = useToast();
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState<EsUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "Analyst", organization: "" });

  const load = () => {
    setLoading(true);
    usersApi
      .list()
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const createUser = async () => {
    try {
      await usersApi.create(form);
      push("success", "User created.");
      setShowModal(false);
      setForm({ full_name: "", email: "", password: "", role: "Analyst", organization: "" });
      load();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Failed to create user.");
    }
  };

  const changeRole = async (id: string, role: string) => {
    await usersApi.changeRole(id, role);
    load();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await usersApi.setActive(id, !isActive);
    load();
  };

  const removeUser = async (id: string) => {
    if (id === currentUser?.id) {
      push("error", "You cannot delete your own account.");
      return;
    }
    await usersApi.remove(id);
    push("success", "User removed.");
    load();
  };

  const columns: Column<EsUserRow>[] = [
    {
      key: "full_name",
      header: "User",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary-bright">
            {r.avatar_initials}
          </div>
          <div>
            <p className="font-medium">{r.full_name}</p>
            <p className="text-[11px] text-text-muted">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: "organization", header: "Organization" },
    {
      key: "role",
      header: "Role",
      render: (r) => (
        <select
          value={r.role}
          onChange={(e) => changeRole(r.id, e.target.value)}
          className="text-xs bg-surface-2 border border-border-strong rounded px-1.5 py-1"
        >
          <option value="Analyst">Analyst</option>
          <option value="Administrator">Administrator</option>
        </select>
      ),
    },
    { key: "is_active", header: "Status", render: (r) => <Badge label={r.is_active ? "Active" : "Inactive"} tone={r.is_active ? "online" : "offline"} /> },
    { key: "created_at", header: "Joined", render: (r) => <span className="font-mono text-xs">{r.created_at?.slice(0, 10)}</span> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => toggleActive(r.id, r.is_active)} className="text-[11px] text-primary-bright hover:underline">
            {r.is_active ? "Deactivate" : "Activate"}
          </button>
          <button onClick={() => removeUser(r.id)} className="text-[11px] text-danger-bright hover:underline">
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Manage Users"
        subtitle={`${rows.length} registered accounts`}
        actions={
          <Button icon={<UserPlus size={15} />} onClick={() => setShowModal(true)}>
            Add User
          </Button>
        }
      />

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading} />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New User">
        <div className="flex flex-col gap-3">
          <Input label="Full Name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <Input label="Organization" value={form.organization} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} />
          <Select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="Analyst">Analyst</option>
            <option value="Administrator">Administrator</option>
          </Select>
          <Button onClick={createUser}>Create User</Button>
        </div>
      </Modal>
    </div>
  );
}
