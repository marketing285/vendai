// Agrega dados operacionais em tempo real.
// Quando o Supabase estiver configurado, as funções reais substituem os mocks.

export interface TaskSummary {
  protocol: string;
  title: string;
  area: string;
  assignee: string;
  client: string;
  deadline: string;
  hoursWaiting: number;
  blockReason?: string;
}

export interface LeadSummary {
  name: string;
  segment: string;
  lastContact: string;
}

export interface WipInfo {
  current: number;
  limit: number;
}

export interface ClientSummary {
  name: string;
  segment: string;
  portfolio: string;
  gestor: string;
  status: string;
  valor: number;
  pacote: string;
}

export interface DesignMonthMetrics {
  month: string;          // "2026-01"
  label: string;          // "Janeiro/2026"
  totalPlanned: number;
  delivered: number;
  inApproval: number;
  withRevision: number;
  pending: number;
  completionPct: number;
  uniqueProductionDays: number;
  avgDailyProduction: number;
}

export interface DesignProductionSummary {
  clientName: string;
  itemType: string;
  status: string;
  urgency: string;
  date: string;
  neededRevision: string;
  revisionCount: number | null;
  complexity: string;
  approvalResponsible: string;
}

export interface OperationalContext {
  tasksByArea: Record<string, number>;
  criticalSLA: TaskSummary[];
  awaitingApproval: TaskSummary[];
  blocked: TaskSummary[];
  hotLeads: LeadSummary[];
  wipByArea: Record<string, WipInfo>;
  alerts: string[];
  clients: ClientSummary[];
  designProductions: DesignProductionSummary[];
  designMetrics: DesignMonthMetrics[];
}

// ─────────────────────────────────────────────
//  Cache de contexto (TTL: 30s)
// ─────────────────────────────────────────────
let contextCache: { data: OperationalContext; expiresAt: number } | null = null;

export async function buildContext(): Promise<OperationalContext> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey && supabaseUrl !== "https://xxxx.supabase.co") {
    if (contextCache && Date.now() < contextCache.expiresAt) {
      return contextCache.data;
    }
    const data = await fetchLiveContext(supabaseUrl, supabaseKey);
    contextCache = { data, expiresAt: Date.now() + 30_000 };
    return data;
  }

  return getMockContext();
}

// ─────────────────────────────────────────────
//  Contexto real via Supabase
// ─────────────────────────────────────────────
async function fetchLiveContext(url: string, key: string): Promise<OperationalContext> {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key);

  const now = new Date();
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Todas as queries em paralelo — sem waterfall
  const [
    { data: openTasks },
    { data: criticalRaw },
    { data: approvalRaw },
    { data: blockedRaw },
    { data: leadsRaw },
    { data: wipRaw },
    { data: clientsRaw },
    { data: designRaw },
  ] = await Promise.all([
    db.from("tasks").select("area").not("status", "in", '("concluido","pausado_bloqueado")'),
    db.from("tasks")
      .select("protocol_id, title, area, deadline, assigned_to(name), client_id(name)")
      .not("status", "in", '("concluido","pausado_bloqueado")')
      .lte("deadline", in4h)
      .gte("deadline", now.toISOString()),
    db.from("tasks")
      .select("protocol_id, title, area, updated_at, client_id(name)")
      .eq("status", "aprovacao_cliente")
      .lte("updated_at", ago24h),
    db.from("tasks").select("protocol_id, title, area").eq("status", "pausado_bloqueado"),
    db.from("leads").select("name, segment, updated_at").eq("temperature", "hot").lte("updated_at", ago24h),
    db.from("tasks").select("area").eq("status", "em_producao"),
    db.from("clients").select("name, segment, portfolio, active").order("name"),
    // Produções de design dos últimos 12 meses (para métricas mensais)
    db.from("design_productions")
      .select("client_name, item_type, status, urgency, date, needed_revision, revision_count, complexity, quantity, approval_responsible")
      .gte("date", new Date(now.getTime() - 365 * 24 * 3_600_000).toISOString().slice(0, 10))
      .order("date", { ascending: false }),
  ]);

  // Tasks por área
  const tasksByArea: Record<string, number> = {};
  for (const t of openTasks ?? []) {
    tasksByArea[t.area] = (tasksByArea[t.area] || 0) + 1;
  }

  const criticalSLA: TaskSummary[] = (criticalRaw ?? []).map((t: any) => ({
    protocol: t.protocol_id,
    title: t.title,
    area: t.area,
    assignee: t.assigned_to?.name ?? "Sem responsável",
    client: t.client_id?.name ?? "—",
    deadline: new Date(t.deadline).toLocaleString("pt-BR"),
    hoursWaiting: 0,
  }));

  const awaitingApproval: TaskSummary[] = (approvalRaw ?? []).map((t: any) => ({
    protocol: t.protocol_id,
    title: t.title,
    area: t.area,
    assignee: "—",
    client: t.client_id?.name ?? "—",
    deadline: "—",
    hoursWaiting: Math.round((now.getTime() - new Date(t.updated_at).getTime()) / 3_600_000),
  }));

  const blocked: TaskSummary[] = (blockedRaw ?? []).map((t: any) => ({
    protocol: t.protocol_id,
    title: t.title,
    area: t.area,
    assignee: "—",
    client: "—",
    deadline: "—",
    hoursWaiting: 0,
  }));

  const hotLeads: LeadSummary[] = (leadsRaw ?? []).map((l: any) => ({
    name: l.name,
    segment: l.segment ?? "—",
    lastContact: new Date(l.updated_at).toLocaleDateString("pt-BR"),
  }));

  // WIP agrupado no JS — 1 query no lugar de 6
  const WIP_LIMITS: Record<string, number> = { design: 5, video: 3, capture: 2, content: 6, traffic: 4, commercial: 3 };
  const wipByArea: Record<string, WipInfo> = Object.fromEntries(
    Object.keys(WIP_LIMITS).map(a => [a, { current: 0, limit: WIP_LIMITS[a] }])
  );
  for (const t of wipRaw ?? []) {
    if (wipByArea[t.area]) wipByArea[t.area].current++;
  }

  const GESTOR_MAP: Record<string, string> = { christian: "Christian", junior: "Júnior Monte", none: "Bruno/Armando" };
  const clients: ClientSummary[] = (clientsRaw ?? []).map((c: any) => ({
    name: c.name,
    segment: c.segment ?? "—",
    portfolio: c.portfolio,
    gestor: GESTOR_MAP[c.portfolio] ?? "—",
    status: c.active ? "Ativo" : "Pausado",
    valor: 0,
    pacote: "—",
  }));

  // Últimos 7 dias para status atual
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3_600_000).toISOString().slice(0, 10);
  const designProductions: DesignProductionSummary[] = (designRaw ?? [])
    .filter((d: any) => d.date >= sevenDaysAgo)
    .map((d: any) => ({
      clientName    : d.client_name ?? "—",
      itemType      : d.item_type ?? "—",
      status        : d.status ?? "—",
      urgency       : d.urgency ?? "—",
      date          : d.date ?? "—",
      neededRevision      : d.needed_revision ?? "—",
      revisionCount       : d.revision_count ?? null,
      complexity          : d.complexity ?? "—",
      approvalResponsible : d.approval_responsible ?? "—",
    }));

  // Métricas mensais agrupadas
  const MONTH_LABELS: Record<string, string> = {
    "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
    "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
    "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro",
  };
  const monthMap: Record<string, {
    totalPlanned:number; delivered:number; inApproval:number;
    withRevision:number; days:Set<string>;
  }> = {};

  for (const d of designRaw ?? []) {
    if (!d.date) continue;
    const m = d.date.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = { totalPlanned:0, delivered:0, inApproval:0, withRevision:0, days:new Set() };
    const qty = parseInt(d.quantity) || 1;
    monthMap[m].totalPlanned += qty;
    if (d.status === "Entregue")       monthMap[m].delivered  += qty;
    if (d.status === "Em Aprovação")   monthMap[m].inApproval += qty;
    if (d.needed_revision?.toLowerCase() === "sim") monthMap[m].withRevision += qty;
    monthMap[m].days.add(d.date);
  }

  const designMetrics: DesignMonthMetrics[] = Object.keys(monthMap)
    .sort()
    .map(m => {
      const v = monthMap[m];
      const dias = v.days.size;
      const pending = v.totalPlanned - v.delivered - v.inApproval;
      return {
        month: m,
        label: `${MONTH_LABELS[m.slice(5)]}/${m.slice(0,4)}`,
        totalPlanned        : v.totalPlanned,
        delivered           : v.delivered,
        inApproval          : v.inApproval,
        withRevision        : v.withRevision,
        pending             : Math.max(0, pending),
        completionPct       : v.totalPlanned > 0 ? Math.round((v.delivered / v.totalPlanned) * 100) : 0,
        uniqueProductionDays: dias,
        avgDailyProduction  : dias > 0 ? Math.round((v.delivered / dias) * 10) / 10 : 0,
      };
    });

  return { tasksByArea, criticalSLA, awaitingApproval, blocked, hotLeads, wipByArea, alerts: [], clients, designProductions, designMetrics };
}

// ─────────────────────────────────────────────
//  Mock — usado antes do Supabase estar pronto
// ─────────────────────────────────────────────
function getMockContext(): OperationalContext {
  return {
    tasksByArea: {
      design: 4,
      video: 2,
      content: 7,
      traffic: 3,
      capture: 1,
      commercial: 2,
    },
    criticalSLA: [
      {
        protocol: "2026-03-03-0012",
        title: "Carrossel Black Friday — Instagram",
        area: "design",
        assignee: "Bruna",
        client: "Cliente Demo",
        deadline: new Date(Date.now() + 2 * 3_600_000).toLocaleString("pt-BR"),
        hoursWaiting: 0,
      },
    ],
    awaitingApproval: [
      {
        protocol: "2026-03-03-0009",
        title: "Reels produto novo",
        area: "video",
        assignee: "Ana Laura",
        client: "Cliente Demo",
        deadline: "—",
        hoursWaiting: 31,
      },
    ],
    blocked: [],
    hotLeads: [
      { name: "João Silva", segment: "E-commerce", lastContact: "01/03/2026" },
    ],
    wipByArea: {
      design: { current: 3, limit: 5 },
      video: { current: 2, limit: 3 },
      content: { current: 4, limit: 6 },
      traffic: { current: 2, limit: 4 },
      capture: { current: 1, limit: 2 },
      commercial: { current: 1, limit: 3 },
    },
    alerts: [
      "⚠️ MODO DEMO — Supabase não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env para dados reais.",
    ],
    clients: [],
    designProductions: [],
    designMetrics: [],
  };
}
