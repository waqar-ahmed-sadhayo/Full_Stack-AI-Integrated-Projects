import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge as BadgeIcon, Key, ArrowRight, Eye, EyeOff } from "lucide-react";
import AuthLayout from "./AuthLayout";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function Login() {
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@earthscape.io");
  const [password, setPassword] = useState("Admin@12345");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      push("success", "Signed in successfully.");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout badge="SECURE-PORTAL">
      <h1 className="font-display text-2xl font-bold text-text tracking-tight text-center">Welcome back</h1>
      <p className="font-body text-sm text-text-muted mt-1 text-center mb-6">Sign in to your climate monitoring dashboard</p>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5" htmlFor="email">
            Work Email or Agency ID
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <BadgeIcon size={16} />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@earthscape.io"
              className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-background/80 border border-border-strong text-text placeholder-text-muted/60 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-text-muted" htmlFor="password">
              Security Key / Password
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Key size={16} />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-background/80 border border-border-strong text-text placeholder-text-muted/60 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-danger-bright bg-danger/10 border border-danger/25 rounded-lg px-3 py-2">{error}</p>}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-secondary to-success text-[#00160f] font-display text-[0.95rem] font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:shadow-[0_0_28px_rgba(34,197,94,0.6)] hover:brightness-110 active:scale-[0.99] transition-all duration-200 disabled:opacity-60"
          >
            <span>{loading ? "Signing in..." : "Sign In"}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </div>
      </form>

      <div className="mt-5 text-center">
        <p className="text-sm text-text-muted">
          Don't have an account?
          <Link to="/register" className="font-semibold text-primary-bright hover:underline ml-1">
            Register
          </Link>
        </p>
      </div>
      <div className="mt-3 text-center">
        <p className="text-[11px] text-text-muted/70 font-mono">Demo: admin@earthscape.io / Admin@12345 &bull; analyst@earthscape.io / Analyst@12345</p>
      </div>
    </AuthLayout>
  );
}
