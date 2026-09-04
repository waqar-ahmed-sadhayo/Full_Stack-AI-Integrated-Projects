import {
  LayoutDashboard,
  Satellite,
  Table2,
  Map,
  Server,
  LineChart,
  ShieldAlert,
  BrainCircuit,
  Radio,
  Bell,
  FileText,
  MessageSquareText,
  Users,
  Activity,
  CloudSun,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Pakistan Weather", path: "/pakistan-weather", icon: CloudSun },
    ],
  },
  {
    title: "Climate Data",
    items: [
      { label: "Data Ingestion", path: "/ingestion", icon: Satellite },
      { label: "Climate Records", path: "/climate-data", icon: Table2 },
      { label: "Climate Map", path: "/map", icon: Map },
      { label: "Climate Analytics", path: "/analytics", icon: LineChart },
      { label: "Anomaly Detection", path: "/anomalies", icon: ShieldAlert },
      { label: "ML Predictions", path: "/ml-predictions", icon: BrainCircuit },
      { label: "Real-Time Monitoring", path: "/realtime", icon: Radio },
      { label: "Alerts", path: "/alerts", icon: Bell },
      { label: "Hadoop / HDFS", path: "/hadoop", icon: Server },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Reports", path: "/reports", icon: FileText },
      { label: "Feedback", path: "/feedback", icon: MessageSquareText },
      { label: "Manage Users", path: "/users", icon: Users, adminOnly: true },
      { label: "System Monitoring", path: "/system", icon: Activity, adminOnly: true },
    ],
  },
];
