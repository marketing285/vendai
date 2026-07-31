// Agrega dados operacionais em tempo real.
// Quando o Supabase estiver configurado, as funções reais substituem os mocks.

// Fonte de dados operacionais: Supabase, tabelas gv_* (sistema gestao-venda).
// O NocoDB antigo (nocodb-tool.ts) saiu de uso — ver [[project_gestao_atividades_bu]].
async function getGvClient(): Promise<any | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url === "https://xxxx.supabase.co") return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key);
}

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
  bu: string;
  gestor: string;
  status: string;
  pacote: string;
  valorMensal: number | null;
  nps: number | null;
  canaisAtivos: string;
  dataInicio: string;
  whatsapp: string;
  // campos herdados / legado
  portfolio: string;
  valor: number;
  metaAdsAccountId: string | null;
  escopoMensal: string;
  verbaTrafego: number | null;
  linkInstagram: string;
  linkFacebook: string;
  linkDrive: string;
  linkGrupoWhatsApp: string;
  diaRelatorio: number | null;
}

export interface NocoProdSummary {
  clientName: string;
  itemType: string;
  quantity: number | null;
  status: string;
  urgency: string;
  date: string;
  deliveryDate: string;
  neededRevision: string;
  revisionCount: number | null;
  complexity: string;
  approvalResponsible: string;
  deliveryLink: string;
  briefing: string;
}

export interface NocoTaskSummary {
  id: string;
  title: string;
  area: string;
  client: string;
  status: string;
  sla: string;
  deadline: string;
  daysLeft: number | null;
  responsible: string;
  priority: string;
  quantity: number | null; // campo Quantidade (Design)
}

export interface DesignMonthMetrics {
  month: string;          // "2026-01"
  label: string;          // "Janeiro/2026"
  totalPlanned: number;   // total de artes (soma de Quantidade)
  delivered: number;      // artes entregues
  inApproval: number;
  withRevision: number;
  pending: number;
  completionPct: number;
  uniqueProductionDays: number;
  avgDailyProduction: number; // artes entregues / dias de produção
  uniqueTasks: number;        // nº de tarefas únicas (linhas no deposito)
  uniqueDeliveredTasks: number; // nº de tarefas únicas entregues
}

export interface DesignProductionSummary {
  clientName: string;
  designerName: string;
  responsible: string;
  itemType: string;
  quantity: number | null;
  status: string;
  urgency: string;
  date: string;
  briefing: string;
  approvalResponsible: string;
  deliveryLink: string;
  deliveryDate: string;
  neededRevision: string;
  revisionCount: number | null;
  complexity: string;
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
  // NocoDB — tempo real
  edicaoProductions: NocoProdSummary[];
  edicaoMetrics: DesignMonthMetrics[];
  tasks: NocoTaskSummary[];
  // Memória do GPIA — decisões e contexto enviados pelos gestores via WhatsApp
  gpiaMemories: string;
}

// ─────────────────────────────────────────────
//  Supabase (gv_*) — fetch de clientes
// ─────────────────────────────────────────────
async function fetchClientesGV(): Promise<ClientSummary[]> {
  try {
    const db = await getGvClient();
    if (!db) return [];
    const { data } = await db
      .from("gv_clients")
      .select("*, gv_business_units(code, name, manager:gv_users!gv_business_units_manager_user_id_fkey(name))")
      .limit(500);

    return (data ?? []).map((r: any): ClientSummary => {
      const buCode = r.gv_business_units?.code ?? "—";
      return {
        name:             r["nome"] ?? "—",
        segment:          r["segment"] ?? "—",
        bu:               buCode,
        gestor:           r.gv_business_units?.manager?.name ?? "—",
        status:           r["status"] ?? "—",
        pacote:           "—",
        valorMensal:      r["valor_mensal"] ?? null,
        nps:              null,
        canaisAtivos:     r["canais_ativos"] ?? "—",
        dataInicio:       "",
        whatsapp:         r["whatsapp"] ?? "",
        // legado
        portfolio:        buCode,
        valor:            r["valor_mensal"] ?? 0,
        metaAdsAccountId: null,
        escopoMensal:     "—",
        verbaTrafego:     null,
        linkInstagram:    r["link_instagram"] ?? "",
        linkFacebook:     r["link_facebook"] ?? "",
        linkDrive:        r["link_drive"] ?? "",
        linkGrupoWhatsApp:r["link_grupo_whatsapp"] ?? "",
        diaRelatorio:     r["dia_relatorio"] ?? null,
      };
    });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
//  Supabase (gv_*) — fetch de demandas (tasks + produções + métricas)
//  Substitui as antigas tabelas do NocoDB (tasks_bu1/2/3, tasks_design,
//  tasks_edicao). Cada demanda tem BU (BU1..BU4) e tipo (arte/vídeo/tráfego).
//  Para preservar a estrutura do dashboard (que só conhece BU1/BU2/BU3 +
//  Design + Edição), cada demanda gera uma linha na coluna da BU dela
//  (quando é BU1/2/3 — BU4 não tem coluna própria no dashboard) e mais uma
//  linha cruzada em "Design" (tipo arte) ou "Edição" (tipo vídeo).
// ─────────────────────────────────────────────
const STATUS_LABEL_GV: Record<string, string> = {
  rascunho:              "⬜ Em Standby",
  em_execucao:           "▶️ Em Andamento",
  aguardando_aprovacao:  "⏳ Em Aprovação",
  refazer:               "🔄 Em Revisão",
  aprovado:              "✅ Entregue",
};

function slaLabelGV(deadline: string | null, closed: boolean): { sla: string; daysLeft: number | null } {
  if (!deadline || closed) return { sla: "—", daysLeft: null };
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diff = Math.ceil((new Date(`${deadline}T00:00:00`).getTime() - hoje.getTime()) / 86_400_000);
  const sla = diff < 0 ? "🔴 Atrasado" : diff <= 2 ? "⚠️ Atenção" : "✅ No Prazo";
  return { sla, daysLeft: diff };
}

type GvDemandRow = {
  id: string; type: "arte" | "video" | "trafego"; title: string; status: string;
  deadline: string | null; priority: string; quantidade: number;
  archived_at: string | null; had_rework: boolean;
  cliente_nome: string; bu_code: string; responsavel: string;
};

async function fetchDemandasGV(): Promise<{
  demands: GvDemandRow[];
  tasks: NocoTaskSummary[];
  designProductions: DesignProductionSummary[];
  edicaoProductions: NocoProdSummary[];
}> {
  try {
    const db = await getGvClient();
    if (!db) return { demands: [], tasks: [], designProductions: [], edicaoProductions: [] };

    // Histórico de refação (passou por "refazer" em algum momento)
    const { data: rows } = await db
      .from("gv_demands")
      .select("*, gv_clients(nome), gv_business_units(code), assignee:gv_users!gv_demands_assigned_to_fkey(name)")
      .order("deadline", { ascending: true })
      .limit(1000);

    const ids = (rows ?? []).map((r: any) => r.id);
    let reworkIds = new Set<string>();
    if (ids.length > 0) {
      const { data: hist } = await db
        .from("gv_demand_status_history")
        .select("demand_id")
        .eq("to_status", "refazer")
        .in("demand_id", ids);
      reworkIds = new Set((hist ?? []).map((h: any) => h.demand_id));
    }

    const demands: GvDemandRow[] = (rows ?? []).map((r: any) => ({
      id: r.id, type: r.type, title: r.title, status: r.status,
      deadline: r.deadline, priority: r.priority, quantidade: r.quantidade ?? 1,
      archived_at: r.archived_at, had_rework: reworkIds.has(r.id),
      cliente_nome: r.gv_clients?.nome ?? "—",
      bu_code: r.gv_business_units?.code ?? "—",
      responsavel: r.assignee?.name ?? "—",
    }));

    const tasks: NocoTaskSummary[] = [];
    for (const d of demands) {
      const closed = d.status === "aprovado";
      const { sla, daysLeft } = slaLabelGV(d.deadline, closed);
      const base = {
        id: d.id,
        title: d.title,
        client: d.cliente_nome,
        status: STATUS_LABEL_GV[d.status] ?? d.status,
        sla,
        deadline: d.deadline ?? "—",
        daysLeft,
        responsible: d.responsavel,
        priority: d.priority,
        quantity: d.type === "arte" ? d.quantidade : null,
      };
      // Coluna da BU — só existe slot pra BU1/BU2/BU3 no dashboard hoje
      if (["BU1", "BU2", "BU3"].includes(d.bu_code)) tasks.push({ ...base, area: d.bu_code });
      // Cruzamento por função — Design (arte) e Edição (vídeo), de qualquer BU
      if (d.type === "arte")  tasks.push({ ...base, area: "Design" });
      if (d.type === "video") tasks.push({ ...base, area: "Edição" });
    }

    const designProductions: DesignProductionSummary[] = demands
      .filter(d => d.type === "arte")
      .map(d => ({
        clientName: d.cliente_nome, designerName: d.responsavel, responsible: d.responsavel,
        itemType: "Arte", quantity: d.quantidade,
        status: STATUS_LABEL_GV[d.status] ?? d.status,
        urgency: d.priority === "P0" ? "Urgente" : d.priority === "P1" ? "Alta" : "Normal",
        date: d.archived_at?.slice(0, 10) ?? d.deadline ?? "—",
        briefing: "—", approvalResponsible: "—", deliveryLink: "—",
        deliveryDate: d.archived_at?.slice(0, 10) ?? "—",
        neededRevision: d.had_rework ? "Sim" : "Não",
        revisionCount: null, complexity: "—",
      }));

    const edicaoProductions: NocoProdSummary[] = demands
      .filter(d => d.type === "video")
      .map(d => ({
        clientName: d.cliente_nome, itemType: "Vídeo", quantity: d.quantidade,
        status: STATUS_LABEL_GV[d.status] ?? d.status,
        urgency: d.priority === "P0" ? "Urgente" : d.priority === "P1" ? "Alta" : "Normal",
        date: d.deadline ?? "—", deliveryDate: d.archived_at?.slice(0, 10) ?? "—",
        neededRevision: d.had_rework ? "Sim" : "Não", revisionCount: null,
        complexity: "—", approvalResponsible: "—", deliveryLink: "—", briefing: "—",
      }));

    return { demands, tasks, designProductions, edicaoProductions };
  } catch {
    return { demands: [], tasks: [], designProductions: [], edicaoProductions: [] };
  }
}

// ─────────────────────────────────────────────
//  Métricas mensais (Design/Edição) a partir das demandas gv_*
// ─────────────────────────────────────────────
const MONTH_LABELS_GV: Record<string, string> = {
  "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
  "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
  "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro",
};

function computeMonthMetricsGV(demands: GvDemandRow[], type: "arte" | "video"): DesignMonthMetrics[] {
  type Bucket = { openQty: number; openTasks: number; deliveredQty: number; deliveredTasks: number; inApprovalQty: number; withRevisionQty: number; days: Set<string> };
  const monthMap: Record<string, Bucket> = {};
  const bucket = (m: string): Bucket => (monthMap[m] ??= { openQty: 0, openTasks: 0, deliveredQty: 0, deliveredTasks: 0, inApprovalQty: 0, withRevisionQty: 0, days: new Set() });

  for (const d of demands) {
    if (d.type !== type) continue;
    if (d.status === "aprovado") {
      if (!d.archived_at) continue;
      const m = d.archived_at.slice(0, 7);
      const b = bucket(m);
      b.deliveredQty += d.quantidade;
      b.deliveredTasks += 1;
      b.days.add(d.archived_at.slice(0, 10));
      if (d.had_rework) b.withRevisionQty += d.quantidade;
    } else {
      if (!d.deadline) continue;
      const m = d.deadline.slice(0, 7);
      const b = bucket(m);
      b.openQty += d.quantidade;
      b.openTasks += 1;
      if (d.status === "aguardando_aprovacao") b.inApprovalQty += d.quantidade;
    }
  }

  return Object.keys(monthMap).sort().map(m => {
    const v = monthMap[m];
    const totalPlanned = v.deliveredQty + v.openQty;
    const pending = v.openQty - v.inApprovalQty;
    const dias = v.days.size;
    return {
      month: m,
      label: `${MONTH_LABELS_GV[m.slice(5)]}/${m.slice(0, 4)}`,
      totalPlanned, delivered: v.deliveredQty, inApproval: v.inApprovalQty,
      withRevision: v.withRevisionQty, pending: Math.max(0, pending),
      completionPct: totalPlanned > 0 ? Math.round((v.deliveredQty / totalPlanned) * 100) : 0,
      uniqueProductionDays: dias,
      avgDailyProduction: dias > 0 ? Math.round((v.deliveredQty / dias) * 10) / 10 : 0,
      uniqueTasks: v.deliveredTasks + v.openTasks,
      uniqueDeliveredTasks: v.deliveredTasks,
    };
  });
}

// ─────────────────────────────────────────────
//  Supabase — memória do GPIA (decisões via WhatsApp)
// ─────────────────────────────────────────────
async function fetchGpiaMemories(): Promise<string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url === "https://xxxx.supabase.co") return "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(url, key);
    const { data } = await db
      .from("gpia_memory")
      .select("bu, tipo, conteudo, cliente, criado_em")
      .order("criado_em", { ascending: false })
      .limit(15);

    if (!data || data.length === 0) return "";

    return data.map((m: any) => {
      const cliente = m.cliente ? ` [${m.cliente}]` : "";
      const data_str = m.criado_em ? new Date(m.criado_em).toLocaleDateString("pt-BR") : "";
      return `• [${(m.tipo ?? "").toUpperCase()}]${cliente} ${m.bu ?? ""} ${data_str}: ${m.conteudo}`;
    }).join("\n");
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────
//  Cache de contexto (TTL: 30s)
// ─────────────────────────────────────────────
let contextCache: { data: OperationalContext; expiresAt: number } | null = null;

export async function buildContext(): Promise<OperationalContext> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (contextCache && Date.now() < contextCache.expiresAt) {
    return contextCache.data;
  }

  let base: OperationalContext;
  if (supabaseUrl && supabaseKey && supabaseUrl !== "https://xxxx.supabase.co") {
    base = await fetchLiveContext(supabaseUrl, supabaseKey);
  } else {
    base = getMockContext();
  }

  // Todos os dados em paralelo (fonte de verdade — Supabase, tabelas gv_*)
  const [clients, demandasData, gpiaMemories] = await Promise.all([
    fetchClientesGV(),
    fetchDemandasGV(),
    fetchGpiaMemories(),
  ]);
  base.clients           = clients;
  base.gpiaMemories      = gpiaMemories;
  base.designProductions = demandasData.designProductions;
  base.designMetrics     = computeMonthMetricsGV(demandasData.demands, "arte");
  base.edicaoProductions = demandasData.edicaoProductions;
  base.edicaoMetrics     = computeMonthMetricsGV(demandasData.demands, "video");
  base.tasks             = demandasData.tasks;

  contextCache = { data: base, expiresAt: Date.now() + 30_000 };
  return base;
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
    db.from("clients").select("name, segment, portfolio, active, meta_ads_account_id").order("name"),
    // Produções de design dos últimos 12 meses (para métricas mensais)
    db.from("design_productions")
      .select("client_name, designer_name, responsible, item_type, quantity, status, urgency, date, briefing, approval_responsible, delivery_link, delivery_date, needed_revision, revision_count, complexity")
      .gte("date", new Date(now.getTime() - 365 * 24 * 3_600_000).toISOString().slice(0, 10))
      .order("date", { ascending: false })
      .limit(2000),
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

  const GESTOR_MAP: Record<string, string> = { christian: "Christian", armando: "Armando Cavazana", bruna: "Bruna Benevides", none: "Bruno/Armando" };
  const clients: ClientSummary[] = (clientsRaw ?? []).map((c: any) => ({
    name: c.name,
    segment: c.segment ?? "—",
    portfolio: c.portfolio,
    gestor: GESTOR_MAP[c.portfolio] ?? "—",
    status: c.active ? "Ativo" : "Pausado",
    valor: 0,
    pacote: "—",
    metaAdsAccountId: c.meta_ads_account_id ?? null,
    bu: c.portfolio ?? "—", valorMensal: null, whatsapp: "",
    canaisAtivos: "—", escopoMensal: "—", verbaTrafego: null,
    linkInstagram: "", linkFacebook: "", linkDrive: "",
    linkGrupoWhatsApp: "", diaRelatorio: null, dataInicio: "", nps: null,
  }));

  // Últimos 30 dias para status atual
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3_600_000).toISOString().slice(0, 10);
  const designProductions: DesignProductionSummary[] = (designRaw ?? [])
    .filter((d: any) => d.date >= thirtyDaysAgo)
    .map((d: any) => ({
      clientName          : d.client_name ?? "—",
      designerName        : d.designer_name ?? "—",
      responsible         : d.responsible ?? "—",
      itemType            : d.item_type ?? "—",
      quantity            : d.quantity ?? null,
      status              : d.status ?? "—",
      urgency             : d.urgency ?? "—",
      date                : d.date ?? "—",
      briefing            : d.briefing ?? "—",
      approvalResponsible : d.approval_responsible ?? "—",
      deliveryLink        : d.delivery_link ?? "—",
      deliveryDate        : d.delivery_date ?? "—",
      neededRevision      : d.needed_revision ?? "—",
      revisionCount       : d.revision_count ?? null,
      complexity          : d.complexity ?? "—",
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
        uniqueProductionDays:    dias,
        avgDailyProduction:      dias > 0 ? Math.round((v.delivered / dias) * 10) / 10 : 0,
        uniqueTasks:             v.totalPlanned,
        uniqueDeliveredTasks:    v.delivered,
      };
    });

  return { tasksByArea, criticalSLA, awaitingApproval, blocked, hotLeads, wipByArea, alerts: [], clients, designProductions, designMetrics, edicaoProductions: [], edicaoMetrics: [], tasks: [], gpiaMemories: "" };
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
        assignee: "Samantha",
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
    edicaoProductions: [],
    edicaoMetrics: [],
    tasks: [],
    gpiaMemories: "",
  };
}
