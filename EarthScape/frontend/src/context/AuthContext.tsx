import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "../api/endpoints";

export interface EsUser {
  id: string;
  full_name: string;
  email: string;
  role: "Administrator" | "Analyst";
  organization?: string | null;
  is_active: boolean;
  created_at: string;
  avatar_initials: string;
}

interface AuthContextValue {
  user: EsUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { full_name: string; email: string; password: string; role: string; organization?: string }) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<EsUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("es_user");
    const token = localStorage.getItem("es_access_token");
    if (stored && token) {
      setUser(JSON.parse(stored));
      authApi
        .me()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem("es_user", JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem("es_access_token");
          localStorage.removeItem("es_refresh_token");
          localStorage.removeItem("es_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const persist = (data: any) => {
    localStorage.setItem("es_access_token", data.access_token);
    localStorage.setItem("es_refresh_token", data.refresh_token);
    localStorage.setItem("es_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    persist(res.data);
  };

  const register = async (payload: { full_name: string; email: string; password: string; role: string; organization?: string }) => {
    const res = await authApi.register(payload);
    persist(res.data);
  };

  const logout = () => {
    localStorage.removeItem("es_access_token");
    localStorage.removeItem("es_refresh_token");
    localStorage.removeItem("es_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === "Administrator" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
