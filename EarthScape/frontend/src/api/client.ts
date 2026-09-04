import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("es_access_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem("es_refresh_token");
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refresh_token: refreshToken });
    localStorage.setItem("es_access_token", res.data.access_token);
    localStorage.setItem("es_refresh_token", res.data.refresh_token);
    return res.data.access_token;
  } catch {
    return null;
  }
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = tryRefresh().finally(() => {
          refreshing = null;
        });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      }
      localStorage.removeItem("es_access_token");
      localStorage.removeItem("es_refresh_token");
      localStorage.removeItem("es_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;
