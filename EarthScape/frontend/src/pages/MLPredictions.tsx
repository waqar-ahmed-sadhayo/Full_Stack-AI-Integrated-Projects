import { useEffect, useState } from "react";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { BrainCircuit, RefreshCw, Sparkles } from "lucide-react";
import { mlApi } from "../api/endpoints";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/PageHeader";
import { Input, Select } from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CITIES } from "../constants/geo";
import { LoadingState } from "../components/ui/States";

const MODEL_META: Record<string, { label: string; description: string }> = {
  temperature_predictor: { label: "Temperature Predictor", description: "RandomForestRegressor — seasonal + geo features" },
  rainfall_predictor: { label: "Rainfall Predictor", description: "RandomForestRegressor — seasonal + geo features" },
  climate_trend: { label: "Climate Trend Model", description: "LinearRegression — long-horizon CO2 drift" },
  anomaly_detector: { label: "Anomaly Detector", description: "RandomForestClassifier — supervised outlier classification" },
};

export default function MLPredictions() {
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState<string | null>(null);

  const [form, setForm] = useState({
    model_type: "temperature_predictor",
    location: "Tokyo",
    start_date: new Date().toISOString().slice(0, 10),
    horizon_days: 14,
  });
  const [prediction, setPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState(false);

  const loadModels = () => {
    setLoading(true);
    mlApi
      .models()
      .then((res) => setModels(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(loadModels, []);

  const train = async (modelType: string) => {
    setTraining(modelType);
    try {
      const res = await mlApi.train(modelType);
      push("success", `${MODEL_META[modelType].label} trained (v${res.data.version}).`);
      loadModels();
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Training failed.");
    } finally {
      setTraining(null);
    }
  };

  const runPrediction = async () => {
    setPredicting(true);
    setPrediction(null);
    try {
      const res = await mlApi.predict(form);
      setPrediction(res.data);
    } catch (err: any) {
      push("error", err?.response?.data?.detail || "Prediction failed. Train the model first.");
    } finally {
      setPredicting(false);
    }
  };

  const chartData = prediction
    ? [
        ...prediction.history.map((h: any) => ({ date: h.date, actual: h.actual_value })),
        ...prediction.forecasts.map((f: any) => ({
          date: f.date,
          predicted: f.predicted_value,
          band: [f.confidence_lower, f.confidence_upper],
        })),
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="ML Predictions" subtitle="Model performance, training and forward forecasting" />

      {loading ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Object.keys(MODEL_META).map((type) => {
            const doc = models.find((m) => m.model_type === type);
            return (
              <Card key={type}>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary-bright">
                    <BrainCircuit size={17} />
                  </div>
                  <Badge label={doc ? "Ready" : "Untrained"} tone={doc ? "validated" : "pending"} />
                </div>
                <h3 className="text-sm font-semibold text-text">{MODEL_META[type].label}</h3>
                <p className="text-[11px] text-text-muted mt-0.5 mb-3">{MODEL_META[type].description}</p>
                {doc ? (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono text-text-muted mb-3">
                    <span>Version: <span className="text-text">v{doc.version}</span></span>
                    <span>Records: <span className="text-text">{doc.training_records}</span></span>
                    {Object.entries(doc.metrics).map(([k, v]) => (
                      <span key={k}>{k.toUpperCase()}: <span className="text-text">{v as any}</span></span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted mb-3">Not trained yet.</p>
                )}
                {isAdmin && (
                  <Button variant="secondary" className="w-full" icon={<RefreshCw size={13} />} loading={training === type} onClick={() => train(type)}>
                    {doc ? "Retrain" : "Train"}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card title="Forecast Explorer">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5">
          <Select label="Model" value={form.model_type} onChange={(e) => setForm((f) => ({ ...f, model_type: e.target.value }))}>
            {Object.keys(MODEL_META)
              .filter((t) => t !== "anomaly_detector")
              .map((t) => (
                <option key={t} value={t}>
                  {MODEL_META[t].label}
                </option>
              ))}
          </Select>
          <Select label="Location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          <Input
            label="Horizon (days)"
            type="number"
            min={1}
            max={60}
            value={form.horizon_days}
            onChange={(e) => setForm((f) => ({ ...f, horizon_days: Number(e.target.value) }))}
          />
          <div className="flex items-end">
            <Button className="w-full" icon={<Sparkles size={15} />} loading={predicting} onClick={runPrediction}>
              Predict
            </Button>
          </div>
        </div>

        {prediction && (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area dataKey="band" name="Confidence Band" fill="#06B6D4" fillOpacity={0.12} stroke="none" />
              <Line type="monotone" dataKey="actual" name="Historical" stroke="#4EDEA3" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#4CD7F6" strokeDasharray="4 4" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
