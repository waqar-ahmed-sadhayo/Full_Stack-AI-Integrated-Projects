import { useEffect, useRef, useState } from "react";
import { WS_BASE_URL } from "../api/client";

export interface RealtimeEvent {
  type: "sensor_reading" | "anomaly_event" | "alert_event" | "processing_event";
  data: any;
}

export function useRealtimeFeed(maxEvents = 60) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("es_access_token");
    if (!token) return;
    let closedByUs = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/realtime?token=${token}`);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closedByUs) retryTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          setEvents((prev) => [parsed, ...prev].slice(0, maxEvents));
        } catch {
          /* ignore */
        }
      };
    };
    connect();

    return () => {
      closedByUs = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [maxEvents]);

  return { events, connected };
}
