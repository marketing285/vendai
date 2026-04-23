"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NocoTask {
  id: number; title: string; area: string; client: string;
  status: string; sla: string; deadline: string;
  daysLeft: number | null; responsible: string; priority: string;
}
interface Client {
  name: string; segment: string; bu: string; gestor: string;
  status: string; pacote: string; valorMensal: number | null;
  canaisAtivos: string; diaRelatorio: number | null;
  escopoMensal: string; dataInicio: string;
}
interface MonthMetrics {
  month: string; label: string; totalPlanned: number; delivered: number;
  inApproval: number; withRevision: number; pending: number;
  completionPct: number; avgDailyProduction: number;
}
interface Ctx {
  tasks: NocoTask[]; clients: Client[];
  designMetrics: MonthMetrics[]; edicaoMetrics: MonthMetrics[];
  alerts: string[];
}
interface BriefingArea { name: string; score: number; note: string; }
interface BriefingGargalo { severity: "alta" | "media" | "baixa"; text: string; }
interface Briefing {
  score: number; status: string; statusColor: string; summary: string;
  areas: BriefingArea[]; gargalos: BriefingGargalo[]; acoes: string[];
  generatedAt: string;
}

type AreaKey = "BU1" | "BU2" | "BU3" | "Design" | "Edição";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOSED = ["Concluído","Cancelado","✅ Entregue","✅ Concluído","📦 Arquivo","📦 Arquivado"];

const STATUS_COLOR: Record<string, string> = {
  "👤 Atribuído":       "#4A9EFF",
  "⬜ Em Standby":      "#6B7280",
  "▶️ Em Andamento":    "#2DD4A0",
  "🎨 Em Design":       "#A78BFA",
  "🎬 Em Edição":       "#F59E0B",
  "⏳ Em Aprovação":    "#FBBF24",
  "🔎 Revisão Interna": "#FB923C",
  "🔄 Em Revisão":      "#F97316",
  "✅ Entregue":        "#22C55E",
  "📦 Arquivo":         "#4A5060",
  "📦 Arquivado":       "#4A5060",
};

const BOARD: Record<AreaKey, { main: string; bg: string; label: string; gestor: string }> = {
  BU1:    { main:"#4A9EFF", bg:"rgba(74,158,255,0.08)",   label:"BU1",    gestor:"Christian Castilhoni" },
  BU2:    { main:"#2DD4A0", bg:"rgba(45,212,160,0.08)",   label:"BU2",    gestor:"Armando Cavazana" },
  BU3:    { main:"#F472B6", bg:"rgba(244,114,182,0.08)",  label:"BU3",    gestor:"Bruna Benevides" },
  Design: { main:"#A78BFA", bg:"rgba(167,139,250,0.08)",  label:"Design", gestor:"Bruna Benevides" },
  Edição: { main:"#F59E0B", bg:"rgba(245,158,11,0.08)",   label:"Edição", gestor:"Ana Laura" },
};

const AGENTS = [
  { name:"MAX",              role:"Monitor Ativo de Operações",    active:true,  color:"#4A9EFF" },
  { name:"design-sync",     role:"Sincronização Design (Bruna)",  active:true,  color:"#A78BFA" },
  { name:"video-archive",   role:"Sincronização Edição (Ana)",    active:true,  color:"#F59E0B" },
  { name:"CS Supremo",      role:"Triagem e atendimento",         active:false, color:"#FF6B4A" },
  { name:"Agente CMO",      role:"Suporte estratégico ao CMO",    active:false, color:"#2DD4A0" },
  { name:"GPIA1",           role:"Gestão de projetos BU1",        active:false, color:"#4A9EFF" },
  { name:"GPIA2",           role:"Gestão de projetos BU2",        active:false, color:"#2DD4A0" },
  { name:"GTPRO",           role:"Orquestrador de tráfego",       active:false, color:"#FBBF24" },
  { name:"Sênior PerNEW",   role:"Social media sênior",           active:false, color:"#FBBF24" },
  { name:"CrIA",            role:"Criativo e design IA",          active:false, color:"#FBBF24" },
  { name:"Gestora Captação",role:"Logística audiovisual",         active:false, color:"#FBBF24" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [ctx,       setCtx]       = useState<Ctx | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeArea,setActiveArea]= useState<string>("Todas");
  const [drawer,    setDrawer]    = useState<AreaKey | null>(null);
  const [briefing,  setBriefing]  = useState<Briefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/controller/context");
      if (!r.ok) return;
      setCtx(await r.json());
      setUpdatedAt(new Date());
    } finally { setLoading(false); }
  }, []);

  const loadBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const r = await fetch("/api/controller/briefing");
      if (!r.ok) return;
      setBriefing(await r.json());
    } finally { setBriefingLoading(false); }
  }, []);

  useEffect(() => {
    document.body.classList.remove("page-orb");
    document.body.classList.add("page-dashboard");
    return () => {
      document.body.classList.remove("page-dashboard");
      document.body.classList.add("page-orb");
    };
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  // Briefing: carrega ao montar, atualiza a cada 5 min
  useEffect(() => {
    loadBriefing();
    const iv = setInterval(loadBriefing, 300_000);
    return () => clearInterval(iv);
  }, [loadBriefing]);

  // close drawer on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(null); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const tasks     = ctx?.tasks     ?? [];
  const clients   = ctx?.clients   ?? [];
  const ativos    = clients.filter(c => c.status === "Ativo");
  const abertas   = tasks.filter(t => !CLOSED.includes(t.status));
  const atrasadas = abertas.filter(t => t.sla?.includes("Atrasado"));
  const atencao   = abertas.filter(t => t.sla?.includes("Atenção"));
  const aprovacao = abertas.filter(t => t.status?.includes("Aprovação") || t.status?.includes("Revisão Interna"));

  const dm        = ctx?.designMetrics ?? [];
  const em        = ctx?.edicaoMetrics ?? [];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const dmCurrent = [...dm].filter(m => m.month <= thisMonth).sort((a,b) => b.month.localeCompare(a.month))[0];
  const emCurrent = [...em].filter(m => m.month <= thisMonth).sort((a,b) => b.month.localeCompare(a.month))[0];

  const areas     = ["Todas","BU1","BU2","BU3","Design","Edição"];
  const tasksVis  = activeArea === "Todas" ? abertas : abertas.filter(t => t.area === activeArea);

  return (
    <>
      {/* ── Drawer overlay ── */}
      {drawer && (
        <div
          onClick={() => setDrawer(null)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:100,
            backdropFilter:"blur(3px)", transition:"opacity 0.2s" }}
        />
      )}

      {/* ── Drawer panel ── */}
      {drawer && ctx && (
        <DetailDrawer
          area={drawer}
          tasks={tasks}
          clients={clients}
          designMetrics={dm}
          edicaoMetrics={em}
          onClose={() => setDrawer(null)}
        />
      )}

      <div style={{ minHeight:"100vh", background:"#0A0C10", color:"#F0F2F7",
        fontFamily:"'DM Sans','Inter',sans-serif", padding:"28px 2vw 80px",
        maxWidth:"100%", width:"100%" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32 }}>
          <div>
            <div style={{ fontSize:13, letterSpacing:"0.2em", textTransform:"uppercase", color:"#4A9EFF", marginBottom:5 }}>
              Grupo VENDA · Operations
            </div>
            <h1 style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.02em", margin:0, color:"#fff" }}>
              Painel de Controle
            </h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {updatedAt && <span style={{ fontSize:14, color:"#4A5060" }}>{updatedAt.toLocaleTimeString("pt-BR")}</span>}
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:14,
              background:"rgba(45,212,160,0.08)", border:"1px solid rgba(45,212,160,0.2)",
              borderRadius:20, padding:"5px 14px", color:"#2DD4A0" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#2DD4A0",
                display:"inline-block", animation:"pulse 2s infinite" }}/>
              ao vivo · 30s
            </div>
          </div>
        </div>

        {/* ── Alerts ── */}
        {(ctx?.alerts ?? []).filter(a => !a.includes("MODO DEMO")).map((a, i) => (
          <div key={i} style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
            borderRadius:10, padding:"10px 16px", marginBottom:12, fontSize:15, color:"#FCA5A5" }}>{a}</div>
        ))}

        {loading ? (
          <div style={{ textAlign:"center", color:"#4A5060", padding:"100px 0", fontSize:16 }}>
            Carregando dados operacionais...
          </div>
        ) : (
          <>
            {/* ── KPI Strip ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:28 }}>
              <KPI label="Tasks abertas"     value={abertas.length}   color="#4A9EFF" />
              <KPI label="Atrasadas"         value={atrasadas.length} color="#EF4444" accent />
              <KPI label="Atenção"           value={atencao.length}   color="#F59E0B" />
              <KPI label="Aguard. aprovação" value={aprovacao.length} color="#FBBF24" />
              <KPI label="Clientes ativos"   value={ativos.length}    color="#2DD4A0" />
            </div>

            {/* ── MAX Briefing ── */}
            <BriefingCard briefing={briefing} loading={briefingLoading} onRefresh={loadBriefing} />

            {/* ── Board Cards ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:16, marginBottom:28 }}>
              {(["BU1","BU2","BU3","Design","Edição"] as AreaKey[]).map(area => {
                const bTasks   = abertas.filter(t => t.area === area);
                const total    = bTasks.length;
                const late     = bTasks.filter(t => t.sla?.includes("Atrasado")).length;
                const warn     = bTasks.filter(t => t.sla?.includes("Atenção")).length;
                const apr      = bTasks.filter(t => t.status?.includes("Aprovação") || t.status?.includes("Revisão Interna")).length;
                const allArea  = tasks.filter(t => t.area === area);
                const fechadas = allArea.filter(t => CLOSED.includes(t.status)).length;
                const totalAll = allArea.length;
                const pctFech  = totalAll > 0 ? Math.round((fechadas / totalAll) * 100) : 0;

                const statusCounts: Record<string, number> = {};
                for (const t of bTasks) statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
                const topStatuses = Object.entries(statusCounts).sort((a,b) => b[1]-a[1]).slice(0,4);

                const { main, label, gestor } = BOARD[area];

                return (
                  <div key={area}
                    onClick={() => setDrawer(area)}
                    style={{ background:"#111318", border:"1px solid rgba(255,255,255,0.07)",
                      borderRadius:18, padding:"20px", borderTop:`3px solid ${main}`,
                      cursor:"pointer", transition:"border-color 0.15s, transform 0.12s",
                      position:"relative" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = main;
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    }}
                  >
                    {/* Click hint */}
                    <div style={{ position:"absolute", top:14, right:16, fontSize:12,
                      color:"#2A3040", letterSpacing:"0.06em" }}>VER DETALHES →</div>

                    <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.12em",
                      textTransform:"uppercase", color:main, marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:14, color:"#4A5060", marginBottom:14 }}>{gestor}</div>

                    <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
                      <Ring pct={pctFech} color={main} size={70} />
                      <div>
                        <div style={{ fontSize:34, fontWeight:800, lineHeight:1, color:"#fff" }}>{total}</div>
                        <div style={{ fontSize:13, color:"#4A5060", marginTop:3 }}>tasks abertas</div>
                        <div style={{ fontSize:13, color:main, marginTop:2 }}>{pctFech}% concluídas</div>
                      </div>
                    </div>

                    {topStatuses.map(([st, cnt]) => {
                      const pct = total > 0 ? Math.round((cnt/total)*100) : 0;
                      const c   = STATUS_COLOR[st] ?? "#6B7280";
                      return (
                        <div key={st} style={{ marginBottom:5 }}>
                          <div style={{ display:"flex", justifyContent:"space-between",
                            fontSize:12, color:"#6B7280", marginBottom:2 }}>
                            <span style={{ maxWidth:110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{st}</span>
                            <span style={{ color:c, fontWeight:600 }}>{cnt} · {pct}%</span>
                          </div>
                          <div style={{ height:2, background:"rgba(255,255,255,0.06)", borderRadius:2 }}>
                            <div style={{ width:`${pct}%`, height:"100%", background:c, borderRadius:2 }} />
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:12 }}>
                      {late > 0 && <Badge color="#EF4444">{late} atrasada{late>1?"s":""}</Badge>}
                      {warn > 0 && <Badge color="#F59E0B">{warn} atenção</Badge>}
                      {apr  > 0 && <Badge color="#FBBF24">{apr} aprovação</Badge>}
                      {late===0 && warn===0 && apr===0 && total>0 && <Badge color="#22C55E">no prazo</Badge>}
                      {total===0 && <Badge color="#4A5060">sem tasks</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Production Metrics ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:28 }}>
              <ProdCard title="Design — Bruna Benevides" color="#A78BFA" current={dmCurrent}
                history={[...dm].sort((a,b)=>b.month.localeCompare(a.month)).slice(0,6)}
                onClick={() => setDrawer("Design")} />
              <ProdCard title="Edição — Ana Laura" color="#F59E0B" current={emCurrent}
                history={[...em].sort((a,b)=>b.month.localeCompare(a.month)).slice(0,6)}
                onClick={() => setDrawer("Edição")} />
            </div>

            {/* ── Tasks Table + Sidebar ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
              <div style={{ background:"#111318", border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:18, padding:"20px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.12em",
                    textTransform:"uppercase", color:"#4A5060" }}>Tasks em aberto</div>
                  <div style={{ display:"flex", gap:6 }}>
                    {areas.map(a => (
                      <button key={a} onClick={() => setActiveArea(a)} style={{
                        padding:"4px 12px", borderRadius:20, fontSize:14, cursor:"pointer",
                        border:"1px solid", transition:"all 0.15s",
                        borderColor: activeArea===a ? "#4A9EFF" : "rgba(255,255,255,0.08)",
                        background:  activeArea===a ? "rgba(74,158,255,0.12)" : "transparent",
                        color:       activeArea===a ? "#4A9EFF" : "#4A5060",
                      }}>{a}</button>
                    ))}
                  </div>
                </div>
                {tasksVis.length === 0 ? (
                  <div style={{ color:"#4A5060", fontSize:15, textAlign:"center", padding:"40px 0" }}>
                    Nenhuma task aberta{activeArea!=="Todas" ? ` em ${activeArea}` : ""}
                  </div>
                ) : (
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
                    <thead>
                      <tr style={{ color:"#4A5060", textTransform:"uppercase", letterSpacing:"0.08em", fontSize:12 }}>
                        <th style={{ textAlign:"left", padding:"0 8px 10px 0" }}>Tarefa</th>
                        <th style={{ textAlign:"left", padding:"0 8px 10px" }}>Área</th>
                        <th style={{ textAlign:"left", padding:"0 8px 10px" }}>Cliente</th>
                        <th style={{ textAlign:"left", padding:"0 8px 10px" }}>Status</th>
                        <th style={{ textAlign:"left", padding:"0 8px 10px" }}>SLA</th>
                        <th style={{ textAlign:"left", padding:"0 0 10px 8px" }}>Prazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasksVis.map((t, i) => (
                        <tr key={`${t.area}-${t.id}`} style={{
                          borderTop:"1px solid rgba(255,255,255,0.04)",
                          background: i%2 ? "rgba(255,255,255,0.012)" : "transparent",
                        }}>
                          <td style={{ padding:"7px 8px 7px 0", color:"#E5E7EB",
                            maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</td>
                          <td style={{ padding:"7px 8px" }}>
                            <span style={{ color:BOARD[t.area as AreaKey]?.main??"#6B7280",
                              background:BOARD[t.area as AreaKey]?.bg??"transparent",
                              padding:"2px 7px", borderRadius:10, fontSize:13 }}>{t.area}</span>
                          </td>
                          <td style={{ padding:"7px 8px", color:"#6B7280",
                            maxWidth:110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.client}</td>
                          <td style={{ padding:"7px 8px" }}>
                            <span style={{ fontSize:13, padding:"2px 8px", borderRadius:20,
                              background:`${STATUS_COLOR[t.status]??"#6B7280"}18`,
                              color:STATUS_COLOR[t.status]??"#6B7280",
                              border:`1px solid ${STATUS_COLOR[t.status]??"#6B7280"}30`,
                              whiteSpace:"nowrap" }}>{t.status}</span>
                          </td>
                          <td style={{ padding:"7px 8px" }}>
                            {t.sla && t.sla!=="—" ? (
                              <span style={{ color:t.sla.includes("Atrasado")?"#EF4444":t.sla.includes("Atenção")?"#F59E0B":"#22C55E", fontSize:13 }}>{t.sla}</span>
                            ) : <span style={{ color:"#4A5060" }}>—</span>}
                          </td>
                          <td style={{ padding:"7px 0 7px 8px",
                            color:t.daysLeft!=null&&t.daysLeft<0?"#EF4444":"#6B7280", fontSize:13 }}>
                            {t.deadline!=="—" ? t.deadline.slice(0,10) : "—"}
                            {t.daysLeft!=null && <span style={{ marginLeft:4, opacity:0.5 }}>({t.daysLeft}d)</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Sidebar */}
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {/* Agents */}
                <div style={{ background:"#111318", border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:18, padding:"18px 20px" }}>
                  <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.12em",
                    textTransform:"uppercase", color:"#4A5060", marginBottom:14 }}>Agentes</div>
                  {AGENTS.map(a => (
                    <div key={a.name} style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                        background:a.active?a.color:"#1E2330",
                        boxShadow:a.active?`0 0 6px ${a.color}`:"none" }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:a.active?"#D0D5E0":"#3A4055" }}>{a.name}</div>
                        <div style={{ fontSize:12, color:"#3A4055", whiteSpace:"nowrap",
                          overflow:"hidden", textOverflow:"ellipsis" }}>{a.role}</div>
                      </div>
                      <div style={{ fontSize:11, padding:"2px 7px", borderRadius:20, flexShrink:0,
                        background:a.active?"rgba(45,212,160,0.08)":"rgba(255,255,255,0.03)",
                        color:a.active?"#2DD4A0":"#2A3040",
                        border:`1px solid ${a.active?"rgba(45,212,160,0.15)":"rgba(255,255,255,0.05)"}` }}>
                        {a.active?"ATIVO":"PENDENTE"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Clients quick */}
                <div style={{ background:"#111318", border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:18, padding:"18px 20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.12em",
                      textTransform:"uppercase", color:"#4A5060" }}>Clientes</div>
                    <span style={{ fontSize:14, fontWeight:700, color:"#2DD4A0" }}>{ativos.length} ativos</span>
                  </div>
                  {(["BU1","BU2","BU3"] as const).map(bu => {
                    const lista = ativos.filter(c => c.bu === bu);
                    if (!lista.length) return null;
                    return (
                      <div key={bu} style={{ marginBottom:14 }}>
                        <div style={{ fontSize:12, color:BOARD[bu].main, textTransform:"uppercase",
                          letterSpacing:"0.1em", marginBottom:7, fontWeight:700 }}>{bu}</div>
                        {lista.map(c => (
                          <div key={c.name} style={{ padding:"5px 0",
                            borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between" }}>
                              <span style={{ fontSize:14, color:"#C5CAD8", fontWeight:500 }}>{c.name}</span>
                              {c.pacote && c.pacote!=="—" && (
                                <span style={{ fontSize:12, color:"#4A5060" }}>{c.pacote}</span>
                              )}
                            </div>
                            {c.segment && c.segment!=="—" && (
                              <div style={{ fontSize:12, color:"#3A4055", marginTop:1 }}>{c.segment}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        <style>{`
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
          @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
          *{box-sizing:border-box}body{margin:0}
          ::-webkit-scrollbar{width:5px}
          ::-webkit-scrollbar-track{background:#0A0C10}
          ::-webkit-scrollbar-thumb{background:#1E2330;border-radius:3px}
        `}</style>
      </div>
    </>
  );
}

// ─── Briefing Card ───────────────────────────────────────────────────────────

const SEVERITY_COLOR = { alta: "#EF4444", media: "#F59E0B", baixa: "#4A9EFF" };
const AREA_COLOR: Record<string, string> = {
  BU1: "#4A9EFF", BU2: "#2DD4A0", BU3: "#F472B6", Design: "#A78BFA", "Edição": "#F59E0B",
};

function ScoreRing({ score, color, size = 56 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={color}
        fontSize={14} fontWeight={800}>{score}</text>
    </svg>
  );
}

function BriefingCard({ briefing, loading, onRefresh }: {
  briefing: Briefing | null; loading: boolean; onRefresh: () => void;
}) {
  const genTime = briefing?.generatedAt
    ? new Date(briefing.generatedAt).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })
    : null;

  return (
    <div style={{ background:"#111318", border:`1px solid rgba(255,255,255,0.07)`,
      borderRadius:18, padding:"20px 24px", marginBottom:28,
      borderTop: briefing ? `3px solid ${briefing.statusColor}` : "3px solid #1E2330" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: briefing ? 16 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.12em",
            textTransform:"uppercase", color:"#4A5060" }}>MAX · Briefing Operacional</div>
          {briefing && (
            <span style={{ fontSize:12, padding:"2px 8px", borderRadius:20,
              background:`${briefing.statusColor}15`, color:briefing.statusColor,
              border:`1px solid ${briefing.statusColor}30`, fontWeight:600 }}>
              {briefing.status}
            </span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {genTime && <span style={{ fontSize:12, color:"#2A3040" }}>gerado às {genTime}</span>}
          <button onClick={onRefresh} disabled={loading}
            style={{ background:"rgba(74,158,255,0.08)", border:"1px solid rgba(74,158,255,0.2)",
              color: loading ? "#2A3040" : "#4A9EFF", fontSize:12, padding:"4px 12px",
              borderRadius:20, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "analisando..." : "↻ atualizar"}
          </button>
        </div>
      </div>

      {loading && !briefing && (
        <div style={{ color:"#2A3040", fontSize:14, padding:"12px 0" }}>
          MAX está analisando a operação...
        </div>
      )}

      {briefing && (
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:20, alignItems:"start" }}>
          {/* Score geral */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <ScoreRing score={briefing.score} color={briefing.statusColor} size={72} />
            <span style={{ fontSize:11, color:"#4A5060", textTransform:"uppercase", letterSpacing:"0.08em" }}>saúde geral</span>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Summary */}
            <p style={{ margin:0, fontSize:15, color:"#C5CAD8", lineHeight:1.5 }}>{briefing.summary}</p>

            {/* Scores por área */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {briefing.areas.map(a => (
                <div key={a.name} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
                  borderRadius:12, padding:"10px 14px", minWidth:130, flex:"1" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:AREA_COLOR[a.name]??"#6B7280",
                      textTransform:"uppercase", letterSpacing:"0.08em" }}>{a.name}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:AREA_COLOR[a.name]??"#6B7280" }}>{a.score}</span>
                  </div>
                  <div style={{ height:2, background:"rgba(255,255,255,0.05)", borderRadius:2, marginBottom:6 }}>
                    <div style={{ width:`${a.score}%`, height:"100%", borderRadius:2,
                      background:AREA_COLOR[a.name]??"#6B7280" }} />
                  </div>
                  <div style={{ fontSize:12, color:"#4A5060", lineHeight:1.4 }}>{a.note}</div>
                </div>
              ))}
            </div>

            {/* Gargalos + Ações */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {briefing.gargalos.length > 0 && (
                <div>
                  <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.1em", color:"#4A5060", marginBottom:8 }}>Gargalos</div>
                  {briefing.gargalos.map((g, i) => (
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start",
                      padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", flexShrink:0, marginTop:5,
                        background:SEVERITY_COLOR[g.severity] }} />
                      <span style={{ fontSize:13, color:"#8B909E", lineHeight:1.4 }}>{g.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {briefing.acoes.length > 0 && (
                <div>
                  <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:"0.1em", color:"#4A5060", marginBottom:8 }}>Ações Recomendadas</div>
                  {briefing.acoes.map((a, i) => (
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start",
                      padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:13, color:"#4A9EFF", flexShrink:0, marginTop:1 }}>→</span>
                      <span style={{ fontSize:13, color:"#8B909E", lineHeight:1.4 }}>{a}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ area, tasks, clients, designMetrics, edicaoMetrics, onClose }: {
  area: AreaKey; tasks: NocoTask[]; clients: Client[];
  designMetrics: MonthMetrics[]; edicaoMetrics: MonthMetrics[];
  onClose: () => void;
}) {
  const { main, label, gestor } = BOARD[area];
  const allArea   = tasks.filter(t => t.area === area);
  const abertas   = allArea.filter(t => !CLOSED.includes(t.status));
  const fechadas  = allArea.filter(t => CLOSED.includes(t.status));
  const atrasadas = abertas.filter(t => t.sla?.includes("Atrasado"));
  const atencao   = abertas.filter(t => t.sla?.includes("Atenção"));
  const noCliente = abertas.filter(t => t.sla?.includes("No Prazo") || (!t.sla || t.sla==="—"));

  const metrics = area === "Design" ? designMetrics : area === "Edição" ? edicaoMetrics : [];
  const mCurrent = [...metrics].sort((a,b) => b.month.localeCompare(a.month))[0];

  // Group tasks by status
  const byStatus: Record<string, NocoTask[]> = {};
  for (const t of abertas) {
    if (!byStatus[t.status]) byStatus[t.status] = [];
    byStatus[t.status].push(t);
  }

  // BU-specific: tasks by client
  const byClient: Record<string, NocoTask[]> = {};
  if (area === "BU1" || area === "BU2" || area === "BU3") {
    for (const t of abertas) {
      const key = t.client || "—";
      if (!byClient[key]) byClient[key] = [];
      byClient[key].push(t);
    }
  }

  // Clients for BU
  const buClients = clients.filter(c => c.bu === area && c.status === "Ativo");

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ position:"fixed", top:0, right:0, bottom:0, width:"680px", maxWidth:"95vw",
        background:"#0E1016", borderLeft:`1px solid ${main}30`,
        zIndex:101, overflowY:"auto", animation:"slideIn 0.22s ease",
        boxShadow:`-8px 0 40px rgba(0,0,0,0.6)` }}>

      {/* Header */}
      <div style={{ position:"sticky", top:0, background:"#0E1016",
        borderBottom:`1px solid rgba(255,255,255,0.06)`, padding:"20px 28px",
        display:"flex", alignItems:"center", justifyContent:"space-between", zIndex:10 }}>
        <div>
          <div style={{ fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase", color:main, marginBottom:4 }}>
            DETALHAMENTO
          </div>
          <div style={{ fontSize:24, fontWeight:800, color:"#fff" }}>{label}</div>
          <div style={{ fontSize:15, color:"#4A5060", marginTop:2 }}>{gestor}</div>
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)", border:"none",
          color:"#8B909E", fontSize:22, width:36, height:36, borderRadius:8,
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      </div>

      <div style={{ padding:"24px 28px", display:"flex", flexDirection:"column", gap:24 }}>

        {/* KPI row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          <DrawerKPI label="Abertas"  value={abertas.length}   color={main} />
          <DrawerKPI label="Fechadas" value={fechadas.length}  color="#22C55E" />
          <DrawerKPI label="Atrasadas" value={atrasadas.length} color="#EF4444" accent={atrasadas.length>0} />
          <DrawerKPI label="Atenção"  value={atencao.length}   color="#F59E0B" accent={atencao.length>0} />
        </div>

        {/* Production metrics (Design/Edição) */}
        {mCurrent && (
          <Section title={`Produção — ${mCurrent.label}`} color={main}>
            <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:20, alignItems:"center" }}>
              <Ring pct={mCurrent.completionPct} color={mCurrent.completionPct>=80?"#22C55E":mCurrent.completionPct>=50?"#F59E0B":"#EF4444"} size={80} />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                <MiniStat label="Entregues"  value={mCurrent.delivered}    color="#22C55E" />
                <MiniStat label="Total"      value={mCurrent.totalPlanned} color={main} />
                <MiniStat label="Aprovação"  value={mCurrent.inApproval}   color="#FBBF24" />
                <MiniStat label="Revisão"    value={mCurrent.withRevision} color="#F97316" />
                <MiniStat label="Pendentes"  value={mCurrent.pending}      color="#6B7280" />
                <MiniStat label="Média/dia"  value={mCurrent.avgDailyProduction} color="#8B909E" />
              </div>
            </div>
          </Section>
        )}

        {/* Tasks by status (all areas) */}
        {Object.keys(byStatus).length > 0 && (
          <Section title="Tasks por Status" color={main}>
            {Object.entries(byStatus)
              .sort((a,b) => b[1].length - a[1].length)
              .map(([status, list]) => {
                const c = STATUS_COLOR[status] ?? "#6B7280";
                // always expanded in drawer
                return (
                  <div key={status} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }} />
                        <span style={{ fontSize:15, color:"#C5CAD8", fontWeight:600 }}>{status}</span>
                      </div>
                      <span style={{ fontSize:14, fontWeight:700, color:c,
                        background:`${c}18`, padding:"2px 10px", borderRadius:20 }}>{list.length}</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {list.map(t => (
                        <TaskRow key={`${t.area}-${t.id}`} task={t} />
                      ))}
                    </div>
                  </div>
                );
              })}
          </Section>
        )}

        {/* Tasks by client (BU only) */}
        {(area === "BU1" || area === "BU2" || area === "BU3") && Object.keys(byClient).length > 0 && (
          <Section title="Tasks por Cliente" color={main}>
            {Object.entries(byClient)
              .sort((a,b) => b[1].length - a[1].length)
              .map(([client, list]) => (
                <div key={client} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                    <span style={{ fontSize:15, color:"#A0A8B8", fontWeight:600 }}>{client}</span>
                    <span style={{ fontSize:14, color:main }}>{list.length} task{list.length>1?"s":""}</span>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                    {Object.entries(
                      list.reduce<Record<string,number>>((acc,t) => { acc[t.status]=(acc[t.status]??0)+1; return acc; }, {})
                    ).map(([st, cnt]) => (
                      <span key={st} style={{ fontSize:12, padding:"2px 8px", borderRadius:20,
                        background:`${STATUS_COLOR[st]??"#6B7280"}14`,
                        color:STATUS_COLOR[st]??"#6B7280",
                        border:`1px solid ${STATUS_COLOR[st]??"#6B7280"}28` }}>
                        {st} · {cnt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </Section>
        )}

        {/* SLA breakdown */}
        {abertas.length > 0 && (
          <Section title="Distribuição SLA" color={main}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[
                { label:"Atrasadas", tasks:atrasadas, color:"#EF4444" },
                { label:"Atenção",   tasks:atencao,   color:"#F59E0B" },
                { label:"No Prazo",  tasks:noCliente, color:"#22C55E" },
              ].map(({ label: lb, tasks: lt, color: c }) => (
                <div key={lb} style={{ background:"rgba(255,255,255,0.03)", borderRadius:10,
                  padding:"12px 14px", borderTop:`2px solid ${c}` }}>
                  <div style={{ fontSize:26, fontWeight:800, color:c, lineHeight:1, marginBottom:4 }}>{lt.length}</div>
                  <div style={{ fontSize:13, color:"#4A5060" }}>{lb}</div>
                  {lt.length > 0 && (
                    <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:3 }}>
                      {lt.slice(0,3).map(t => (
                        <div key={`${t.area}-${t.id}`} style={{ fontSize:12, color:"#6B7280",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {t.title}
                        </div>
                      ))}
                      {lt.length > 3 && <div style={{ fontSize:12, color:"#4A5060" }}>+{lt.length-3} mais</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Clients (BU only) */}
        {buClients.length > 0 && (
          <Section title={`Clientes Ativos (${buClients.length})`} color={main}>
            {buClients.map(c => (
              <div key={c.name} style={{ padding:"10px 0",
                borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:16, color:"#E5E7EB", fontWeight:600 }}>{c.name}</span>
                  <div style={{ display:"flex", gap:6 }}>
                    {c.pacote && c.pacote!=="—" && (
                      <span style={{ fontSize:12, padding:"2px 8px", borderRadius:20,
                        background:`${main}14`, color:main, border:`1px solid ${main}28` }}>
                        {c.pacote}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                  {c.segment && c.segment!=="—" && (
                    <span style={{ fontSize:13, color:"#4A5060" }}>📁 {c.segment}</span>
                  )}
                  {c.valorMensal && (
                    <span style={{ fontSize:13, color:"#4A5060" }}>
                      💰 R$ {c.valorMensal.toLocaleString("pt-BR")}
                    </span>
                  )}
                  {c.diaRelatorio && (
                    <span style={{ fontSize:13, color:"#4A5060" }}>📅 Relatório dia {c.diaRelatorio}</span>
                  )}
                  {c.canaisAtivos && c.canaisAtivos!=="—" && (
                    <span style={{ fontSize:13, color:"#4A5060" }}>📡 {c.canaisAtivos}</span>
                  )}
                </div>
                {c.escopoMensal && c.escopoMensal!=="—" && (
                  <div style={{ fontSize:13, color:"#3A4055", marginTop:4 }}>Escopo: {c.escopoMensal}</div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* All closed tasks */}
        {fechadas.length > 0 && (
          <Section title={`Concluídas / Arquivadas (${fechadas.length})`} color="#4A5060">
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {fechadas.slice(0,20).map(t => (
                <div key={`${t.area}-${t.id}`} style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", padding:"5px 0",
                  borderBottom:"1px solid rgba(255,255,255,0.04)", opacity:0.6 }}>
                  <span style={{ fontSize:14, color:"#8B909E",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:300 }}>
                    {t.title}
                  </span>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                    <span style={{ fontSize:12, color:"#4A5060" }}>{t.client}</span>
                    <span style={{ fontSize:12, padding:"2px 7px", borderRadius:20,
                      background:"rgba(34,197,94,0.08)", color:"#22C55E" }}>{t.status}</span>
                  </div>
                </div>
              ))}
              {fechadas.length > 20 && (
                <div style={{ fontSize:13, color:"#4A5060", textAlign:"center", padding:"8px 0" }}>
                  +{fechadas.length-20} mais concluídas
                </div>
              )}
            </div>
          </Section>
        )}

        {abertas.length === 0 && fechadas.length === 0 && (
          <div style={{ textAlign:"center", color:"#4A5060", padding:"60px 0", fontSize:16 }}>
            Nenhuma task encontrada para esta área.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({ task: t }: { task: NocoTask }) {
  const c = STATUS_COLOR[t.status] ?? "#6B7280";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
      background:"rgba(255,255,255,0.03)", borderRadius:8,
      borderLeft:`2px solid ${t.sla?.includes("Atrasado")?"#EF4444":t.sla?.includes("Atenção")?"#F59E0B":c}` }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, color:"#D0D5E0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {t.title}
        </div>
        <div style={{ display:"flex", gap:8, marginTop:2 }}>
          {t.client && t.client!=="—" && <span style={{ fontSize:12, color:"#4A5060" }}>{t.client}</span>}
          {t.responsible && t.responsible!=="—" && <span style={{ fontSize:12, color:"#4A5060" }}>· {t.responsible}</span>}
        </div>
      </div>
      <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
        {t.deadline && t.deadline!=="—" && (
          <span style={{ fontSize:12, color:t.daysLeft!=null&&t.daysLeft<0?"#EF4444":"#4A5060" }}>
            {t.deadline.slice(0,10)}
            {t.daysLeft!=null && ` (${t.daysLeft}d)`}
          </span>
        )}
        {t.sla && t.sla!=="—" && (
          <span style={{ fontSize:12, color:t.sla.includes("Atrasado")?"#EF4444":t.sla.includes("Atenção")?"#F59E0B":"#22C55E" }}>
            {t.sla}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Ring({ pct, color, size=72 }: { pct:number; color:string; size?:number }) {
  const inner = size * 0.68;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0, position:"relative",
      background:`conic-gradient(${color} 0% ${pct}%, #1A1E2A ${pct}% 100%)` }}>
      <div style={{ position:"absolute", top:(size-inner)/2, left:(size-inner)/2,
        width:inner, height:inner, borderRadius:"50%", background:"#111318",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:size*0.18, fontWeight:800, color:"#fff", lineHeight:1 }}>{pct}%</span>
      </div>
    </div>
  );
}

function KPI({ label, value, color, accent }: { label:string; value:number; color:string; accent?:boolean }) {
  return (
    <div style={{ background:"#111318", border:`1px solid rgba(255,255,255,${accent&&value>0?0.1:0.05})`,
      borderRadius:14, padding:"16px 18px", borderTop:`3px solid ${accent&&value>0?color:"transparent"}` }}>
      <div style={{ fontSize:34, fontWeight:800, color:accent&&value>0?color:"#fff", lineHeight:1, marginBottom:5 }}>{value}</div>
      <div style={{ fontSize:13, color:"#4A5060" }}>{label}</div>
    </div>
  );
}

function DrawerKPI({ label, value, color, accent }: { label:string; value:number; color:string; accent?:boolean }) {
  return (
    <div style={{ background:`${color}0C`, border:`1px solid ${color}20`,
      borderRadius:10, padding:"12px 14px" }}>
      <div style={{ fontSize:28, fontWeight:800, color:accent&&value>0?color:"#D0D5E0", lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:13, color:"#4A5060" }}>{label}</div>
    </div>
  );
}

function Badge({ color, children }: { color:string; children:React.ReactNode }) {
  return (
    <span style={{ fontSize:12, padding:"2px 8px", borderRadius:20, fontWeight:600,
      background:`${color}14`, color, border:`1px solid ${color}28` }}>{children}</span>
  );
}

function Section({ title, color, children }: { title:string; color:string; children:React.ReactNode }) {
  return (
    <div style={{ background:"#141820", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"18px" }}>
      <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
        color, marginBottom:16 }}>{title}</div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, color }: { label:string; value:number; color:string }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"7px 9px" }}>
      <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1, marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:12, color:"#4A5060" }}>{label}</div>
    </div>
  );
}

function ProdCard({ title, color, current, history, onClick }: {
  title:string; color:string; current?:MonthMetrics; history:MonthMetrics[]; onClick:()=>void;
}) {
  if (!current) return (
    <div style={{ background:"#111318", border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:18, padding:"20px", cursor:"pointer" }} onClick={onClick}>
      <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
        color, marginBottom:16 }}>{title}</div>
      <div style={{ color:"#4A5060", fontSize:15, textAlign:"center", padding:"30px 0" }}>Sem dados</div>
    </div>
  );
  const bar = Math.min(100, current.completionPct);
  const barColor = bar>=80?"#22C55E":bar>=50?"#F59E0B":"#EF4444";
  const maxVal = Math.max(...history.map(m=>m.totalPlanned), 1);
  return (
    <div onClick={onClick} style={{ background:"#111318", border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:18, padding:"20px", borderTop:`3px solid ${color}`, cursor:"pointer",
      transition:"border-color 0.15s, transform 0.12s" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = color;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}>
      <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
        color, marginBottom:16 }}>{title}</div>
      <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:24, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <Ring pct={bar} color={barColor} size={88} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, width:"100%" }}>
            <MiniStat label="Entregues" value={current.delivered}    color="#22C55E" />
            <MiniStat label="Total"     value={current.totalPlanned} color={color} />
            <MiniStat label="Aprovação" value={current.inApproval}   color="#FBBF24" />
            <MiniStat label="Revisão"   value={current.withRevision} color="#F97316" />
          </div>
        </div>
        <div>
          <div style={{ fontSize:13, color:"#4A5060", marginBottom:10 }}>{current.label}</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:80, marginBottom:10 }}>
            {history.map(m => {
              const h    = Math.max(4, Math.round((m.totalPlanned/maxVal)*76));
              const hDel = m.totalPlanned>0 ? Math.round((m.delivered/m.totalPlanned)*h) : 0;
              const isCur= m.month===current.month;
              return (
                <div key={m.month} style={{ flex:1, display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"flex-end", height:80 }}
                  title={`${m.label}: ${m.delivered}/${m.totalPlanned} (${m.completionPct}%)`}>
                  <div style={{ width:"100%", height:h, borderRadius:"3px 3px 0 0",
                    background:"rgba(255,255,255,0.06)", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", bottom:0, width:"100%", height:hDel,
                      background:isCur?color:`${color}70`, borderRadius:"2px 2px 0 0" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:5 }}>
            {history.map(m => (
              <div key={m.month} style={{ flex:1, textAlign:"center", fontSize:11,
                color:m.month===current.month?color:"#3A4055",
                fontWeight:m.month===current.month?700:400 }}>
                {m.label.slice(0,3)}
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, display:"flex", justifyContent:"space-between",
            fontSize:13, color:"#4A5060" }}>
            <span>Média/dia: <b style={{ color:"#8B909E" }}>{current.avgDailyProduction}</b></span>
            <span>Pendentes: <b style={{ color:current.pending>0?"#F59E0B":"#4A5060" }}>{current.pending}</b></span>
          </div>
        </div>
      </div>
    </div>
  );
}
