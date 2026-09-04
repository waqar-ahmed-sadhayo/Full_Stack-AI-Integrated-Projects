import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AppShell from "./layouts/AppShell";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import PakistanWeather from "./pages/PakistanWeather";
import ClimateData from "./pages/ClimateData";
import Ingestion from "./pages/Ingestion";
import ClimateMap from "./pages/ClimateMap";
import Analytics from "./pages/Analytics";
import Anomalies from "./pages/Anomalies";
import MLPredictions from "./pages/MLPredictions";
import Realtime from "./pages/Realtime";
import Alerts from "./pages/Alerts";
import Hadoop from "./pages/Hadoop";
import Reports from "./pages/Reports";
import Feedback from "./pages/Feedback";
import Users from "./pages/Users";
import SystemMonitoring from "./pages/SystemMonitoring";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pakistan-weather" element={<PakistanWeather />} />
                <Route path="/ingestion" element={<Ingestion />} />
                <Route path="/climate-data" element={<ClimateData />} />
                <Route path="/map" element={<ClimateMap />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/anomalies" element={<Anomalies />} />
                <Route path="/ml-predictions" element={<MLPredictions />} />
                <Route path="/realtime" element={<Realtime />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/hadoop" element={<Hadoop />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute adminOnly>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/system"
                  element={
                    <ProtectedRoute adminOnly>
                      <SystemMonitoring />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
