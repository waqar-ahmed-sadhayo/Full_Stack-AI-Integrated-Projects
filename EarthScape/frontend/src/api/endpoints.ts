import client from "./client";

// ---------- Auth ----------
export const authApi = {
  login: (email: string, password: string) => client.post("/api/v1/auth/login", { email, password }),
  register: (payload: { full_name: string; email: string; password: string; role: string; organization?: string }) =>
    client.post("/api/v1/auth/register", payload),
  me: () => client.get("/api/v1/auth/me"),
  logout: () => client.post("/api/v1/auth/logout"),
};

// ---------- Dashboard ----------
export const dashboardApi = {
  kpis: () => client.get("/api/v1/dashboard/kpis"),
  overview: () => client.get("/api/v1/dashboard/overview"),
};

// ---------- Climate Data ----------
export const climateDataApi = {
  list: (params: Record<string, any>) => client.get("/api/v1/climate-data", { params }),
  summary: () => client.get("/api/v1/climate-data/summary"),
  exportUrl: (params: Record<string, any>) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "")).toString();
    return `/api/v1/climate-data/export?${qs}`;
  },
};

// ---------- Ingestion ----------
export const ingestionApi = {
  upload: (file: File, sourceType: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("source_type", sourceType);
    return client.post("/api/v1/ingestion/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  datasets: (limit = 50) => client.get("/api/v1/ingestion/datasets", { params: { limit } }),
};

// ---------- Hadoop / HDFS ----------
export const hadoopApi = {
  hdfsHealth: () => client.get("/api/v1/hadoop/hdfs/health"),
  hdfsStorage: () => client.get("/api/v1/hadoop/hdfs/storage"),
  hdfsFiles: (zone: string) => client.get("/api/v1/hadoop/hdfs/files", { params: { zone } }),
  jobs: (limit = 100) => client.get("/api/v1/hadoop/jobs", { params: { limit } }),
  jobDefinitions: () => client.get("/api/v1/hadoop/jobs/definitions"),
  startJob: (job_type: string) => client.post("/api/v1/hadoop/jobs/start", { job_type }),
};

// ---------- Analytics ----------
export const analyticsApi = {
  trend: (params: Record<string, any>) => client.get("/api/v1/analytics/trend", { params }),
  multiTrend: (params: Record<string, any>) => client.get("/api/v1/analytics/multi-trend", { params }),
  regional: (metric: string) => client.get("/api/v1/analytics/regional-comparison", { params: { metric } }),
  seasonal: (metric: string) => client.get("/api/v1/analytics/seasonal-trend", { params: { metric } }),
  sourceBreakdown: () => client.get("/api/v1/analytics/source-breakdown"),
  statusBreakdown: () => client.get("/api/v1/analytics/status-breakdown"),
  correlation: () => client.get("/api/v1/analytics/correlation"),
};

// ---------- Anomalies ----------
export const anomalyApi = {
  detect: (metric: string) => client.post("/api/v1/anomalies/detect", { metric }),
  list: (params: Record<string, any>) => client.get("/api/v1/anomalies", { params }),
  distribution: () => client.get("/api/v1/anomalies/distribution"),
  setStatus: (id: string, status: string) => client.patch(`/api/v1/anomalies/${id}/status`, { status }),
};

// ---------- ML ----------
export const mlApi = {
  models: () => client.get("/api/v1/ml/models"),
  train: (model_type: string) => client.post("/api/v1/ml/train", { model_type }),
  predict: (payload: { model_type: string; location: string; start_date: string; horizon_days: number }) =>
    client.post("/api/v1/ml/predict", payload),
};

// ---------- Real-time ----------
export const realtimeApi = {
  sensors: () => client.get("/api/v1/realtime/sensors"),
};

// ---------- Alerts ----------
export const alertsApi = {
  list: (params: Record<string, any> = {}) => client.get("/api/v1/alerts", { params }),
  create: (payload: any) => client.post("/api/v1/alerts", payload),
  resolve: (id: string) => client.patch(`/api/v1/alerts/${id}/resolve`),
  thresholds: () => client.get("/api/v1/alerts/thresholds"),
  createThreshold: (payload: any) => client.post("/api/v1/alerts/thresholds", payload),
  deleteThreshold: (id: string) => client.delete(`/api/v1/alerts/thresholds/${id}`),
};

// ---------- Reports ----------
export const reportsApi = {
  list: (limit = 100) => client.get("/api/v1/reports", { params: { limit } }),
  types: () => client.get("/api/v1/reports/types"),
  generate: (report_type: string, format: string) => client.post("/api/v1/reports/generate", { report_type, format }),
  downloadUrl: (id: string) => `/api/v1/reports/${id}/download`,
};

// ---------- Users ----------
export const usersApi = {
  list: () => client.get("/api/v1/users"),
  create: (payload: any) => client.post("/api/v1/users", payload),
  changeRole: (id: string, role: string) => client.patch(`/api/v1/users/${id}/role`, { role }),
  setActive: (id: string, is_active: boolean) => client.patch(`/api/v1/users/${id}/active`, { is_active }),
  remove: (id: string) => client.delete(`/api/v1/users/${id}`),
};

// ---------- Feedback ----------
export const feedbackApi = {
  list: () => client.get("/api/v1/feedback"),
  create: (payload: any) => client.post("/api/v1/feedback", payload),
  setStatus: (id: string, status: string) => client.patch(`/api/v1/feedback/${id}/status`, { status }),
};

// ---------- Monitoring ----------
export const monitoringApi = {
  system: () => client.get("/api/v1/monitoring/system"),
};

// ---------- Map ----------
export const mapApi = {
  stations: () => client.get("/api/v1/map/stations"),
  anomalies: () => client.get("/api/v1/map/anomalies"),
};

// ---------- System ----------
export const systemApi = {
  info: () => client.get("/api/v1/system/info"),
};

// ---------- Live Weather (Pakistan) ----------
export const liveWeatherApi = {
  pakistan: (refresh = false) => client.get("/api/v1/live-weather/pakistan", { params: { refresh } }),
};
