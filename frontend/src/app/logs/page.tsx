"use client";

import { useEffect, useRef, useState } from "react";

interface LogEntry {
  id: number;
  ts: string;
  level: "info" | "warn" | "error";
  msg: string;
  data?: string;
}

const LEVEL_COLOR: Record<string, string> = {
  info:  "#7dd3fc",
  warn:  "#fde68a",
  error: "#fca5a5",
};

const LEVEL_BG: Record<string, string> = {
  info:  "transparent",
  warn:  "rgba(253,230,138,0.06)",
  error: "rgba(252,165,165,0.10)",
};

export default function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [paused,  setPaused]  = useState(false);
  const sinceRef  = useRef<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    async function poll() {
      if (pausedRef.current) return;
      try {
        const url = sinceRef.current
          ? `/api/controller/logs?since=${sinceRef.current}`
          : `/api/controller/logs`;
        const res  = await fetch(url);
        if (!res.ok) return;
        const data: LogEntry[] = await res.json();
        if (data.length > 0) {
          sinceRef.current = data[data.length - 1].id;
          setEntries(prev => {
            const combined = [...prev, ...data].slice(-500);
            return combined;
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      } catch (_) {}
    }

    poll();
    const iv = setInterval(poll, 1500);
    return () => clearInterval(iv);
  }, []);

  function clear() {
    setEntries([]);
    sinceRef.current = 0;
  }

  function fmt(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString("pt-BR", { hour12: false }) + "." +
      String(d.getMilliseconds()).padStart(3, "0");
  }

  return (
    <div style={{
      background: "#080810", minHeight: "100vh", color: "#e2e8f0",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "13px",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 20px", borderBottom: "1px solid #1e293b",
        display: "flex", alignItems: "center", gap: "12px",
        background: "#0f0f1a", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ color: "#7dd3fc", fontWeight: 700, fontSize: "15px" }}>
          MAX — Logs
        </span>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: paused ? "#6b7280" : "#22c55e",
          display: "inline-block",
          boxShadow: paused ? "none" : "0 0 6px #22c55e",
        }} />
        <span style={{ color: "#64748b", fontSize: "12px" }}>
          {paused ? "pausado" : "ao vivo"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button onClick={() => setPaused(p => !p)} style={{
            background: "#1e293b", border: "1px solid #334155", color: "#cbd5e1",
            borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "12px",
          }}>
            {paused ? "▶ Retomar" : "⏸ Pausar"}
          </button>
          <button onClick={clear} style={{
            background: "#1e293b", border: "1px solid #334155", color: "#cbd5e1",
            borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "12px",
          }}>
            🗑 Limpar
          </button>
          <a href="/" style={{
            background: "#1e293b", border: "1px solid #334155", color: "#cbd5e1",
            borderRadius: "6px", padding: "4px 12px", cursor: "pointer", fontSize: "12px",
            textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}>
            ← MAX
          </a>
        </div>
      </div>

      {/* Log list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {entries.length === 0 && (
          <div style={{ color: "#475569", padding: "40px", textAlign: "center" }}>
            Aguardando logs... Faça uma pergunta ao MAX.
          </div>
        )}
        {entries.map(e => (
          <div key={e.id} style={{
            display: "grid", gridTemplateColumns: "80px 48px 1fr",
            gap: "0 12px", padding: "3px 20px",
            background: LEVEL_BG[e.level],
            borderLeft: e.level !== "info" ? `2px solid ${LEVEL_COLOR[e.level]}` : "2px solid transparent",
          }}>
            <span style={{ color: "#475569", userSelect: "none" }}>{fmt(e.ts)}</span>
            <span style={{ color: LEVEL_COLOR[e.level], fontWeight: 600, textTransform: "uppercase", fontSize: "11px" }}>
              {e.level}
            </span>
            <span style={{ color: "#e2e8f0", wordBreak: "break-all" }}>
              {e.msg}
              {e.data && (
                <span style={{ color: "#64748b", marginLeft: "8px" }}>
                  {e.data}
                </span>
              )}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
