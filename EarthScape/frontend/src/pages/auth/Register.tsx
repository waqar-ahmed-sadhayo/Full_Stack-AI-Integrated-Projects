import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Key, ArrowRight, Building2 } from "lucide-react";
import AuthLayout from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function Register() {
  const { register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", organization: "", role: "Analyst" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key: string) => (e: any) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      push("success", "Account created. Welcome to EarthScape.");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout badge="NEW-AGENT">
      <h1 className="font-display text-2xl font-bold text-text tracking-tight text-center">Create your account</h1>
      <p className="text-sm text-text-muted mt-1 text-center mb-6">Join the climate monitoring network</p>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <User size={16} />
            </div>
            <input
              required
              value={form.full_name}
              onChange={update("full_name")}
              placeholder="Dr. Jane Doe"
              className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-background/80 border border-border-strong text-text placeholder-text-muted/60 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">Work Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Mail size={16} />
            </div>
            <input
              required
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="analyst@climate.agency"
              className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-background/80 border border-border-strong text-text placeholder-text-muted/60 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">Organization (optional)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Building2 size={16} />
            </div>
            <input
              value={form.organization}
              onChange={update("organization")}
              placeholder="EarthScape Climate Agency"
              className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-background/80 border border-border-strong text-text placeholder-text-muted/60 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Key size={16} />
            </div>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={update("password")}
              placeholder="At least 8 characters"
              className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-background/80 border border-border-strong text-text placeholder-text-muted/60 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">Role</label>
          <div className="grid grid-cols-2 gap-2">
            {["Analyst", "Administrator"].map((role) => (
              <button
                type="button"
                key={role}
                onClick={() => setForm((f) => ({ ...f, role }))}
                className={`h-11 rounded-xl border text-sm font-semibold transition-all ${
                  form.role === role
                    ? "border-primary bg-primary/10 text-primary-bright"
                    : "border-border-strong text-text-muted hover:text-text hover:bg-surface-2/60"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-danger-bright bg-danger/10 border border-danger/25 rounded-lg px-3 py-2">{error}</p>}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-secondary to-success text-[#00160f] font-display text-[0.95rem] font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:brightness-110 active:scale-[0.99] transition-all duration-200 disabled:opacity-60"
          >
            <span>{loading ? "Creating account..." : "Create Account"}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </div>
      </form>

      <div className="mt-5 text-center">
        <p className="text-sm text-text-muted">
          Already have an account?
          <Link to="/login" className="font-semibold text-primary-bright hover:underline ml-1">
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
