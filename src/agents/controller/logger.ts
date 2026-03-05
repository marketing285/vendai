export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  ts: string;
  level: LogLevel;
  msg: string;
  data?: string;
}

let seq = 0;
const MAX_ENTRIES = 300;
const logs: LogEntry[] = [];

export function log(level: LogLevel, msg: string, data?: any) {
  const entry: LogEntry = {
    id: ++seq,
    ts: new Date().toISOString(),
    level,
    msg,
    data: data !== undefined ? (typeof data === "string" ? data : JSON.stringify(data)) : undefined,
  };
  logs.push(entry);
  if (logs.length > MAX_ENTRIES) logs.splice(0, logs.length - MAX_ENTRIES);

  if (level === "error") console.error(`[MAX] ${msg}`, data ?? "");
  else if (level === "warn") console.warn(`[MAX] ${msg}`, data ?? "");
  else console.log(`[MAX] ${msg}`, data ?? "");
}

export function getLogs(since?: number): LogEntry[] {
  if (since !== undefined) return logs.filter(l => l.id > since).slice(-100);
  return [...logs].slice(-100);
}
