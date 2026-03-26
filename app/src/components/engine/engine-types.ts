export interface HealthData {
  status: string;
  version: string;
  packaged?: boolean;
  // Node engine fields
  process?: {
    pid: number;
    ppid: number;
    startedAt: string;
    uptimeSec: number;
    argv: string[];
    cwd: string;
    tty: string | null;
    nodeVersion: string;
  };
  services?: Array<{
    id: string;
    label: string;
    status: "ok" | "degraded" | "down";
    detail?: string;
  }>;
  database?: {
    path: string;
    sizeBytes: number;
    migrations: number;
  };
  // Elixir OTP engine fields
  engine?: string;
  aiConfigured?: boolean;
  platform?: string;
  arch?: string;
  uptime?: number;
  firstRun?: boolean;
}

export interface InstalledMcp {
  id: string;
  name: string;
  namespace: string;
  version: string;
  enabled: number;
  command: string;
  targets: string;
}

export interface LogLine {
  ts: string;
  level?: string;
  msg: string;
}
