// Agrega dados operacionais em tempo real.
// Quando o Supabase estiver configurado, as funções reais substituem os mocks.

import { NDB, ndbList } from "./nocodb-tool";

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
  id: number;
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
}

// ─────────────────────────────────────────────
//  NocoDB — fetch de clientes (tabela principal)
// ─────────────────────────────────────────────
async function fetchClientesNocoDB(): Promise<ClientSummary[]> {
  try {
    const rows = await ndbList(NDB.tables.clientes, undefined, 200);
    return rows.map((r: any): ClientSummary => ({
      name:             r["Nome do Cliente"] ?? r["Nome"] ?? "—",
      segment:          r["Segmento"] ?? "—",
      bu:               r["BU"] ?? "—",
      gestor:           r["Gestor"] ?? "—",
      status:           r["Status do Cliente"] ?? r["Status"] ?? "—",
      pacote:           r["Pacote"] ?? "—",
      valorMensal:      r["Valor Mensal (R$)"] ?? null,
      nps:              r["NPS"] ?? null,
      canaisAtivos:     Array.isArray(r["Canais Ativos"]) ? r["Canais Ativos"].join(", ") : (r["Canais Ativos"] ?? "—"),
      dataInicio:       r["Data de Início"] ?? "",
      whatsapp:         r["WhatsApp do Cliente"] ?? "",
      // legado
      portfolio:        r["BU"] ?? "—",
      valor:            r["Valor Mensal (R$)"] ?? 0,
      metaAdsAccountId: null,
      escopoMensal:     r["Escopo Mensal"] ?? "—",
      verbaTrafego:     r["Verba Mensal (Tráfego)"] ?? null,
      linkInstagram:    r["Link Instagram"] ?? "",
      linkFacebook:     r["Link Facebook"] ?? "",
      linkDrive:        r["Link Drive"] ?? "",
      linkGrupoWhatsApp:r["Link Grupo WhatsApp"] ?? "",
      diaRelatorio:     r["Dia do Relatório"] ?? null,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
//  NocoDB — fetch de produções de design
// ─────────────────────────────────────────────
async function fetchProducoesDesignNocoDB(): Promise<{
  productions: DesignProductionSummary[];
  metrics: DesignMonthMetrics[];
}> {
  try {
    const rows = await ndbList(NDB.tables.deposito_design, undefined, 1000);

    const productions: DesignProductionSummary[] = rows.map((r: any) => ({
      clientName:          r["Cliente"] ?? "—",
      designerName:        "Bruna Benevides",
      responsible:         r["Responsável Aprovação"] ?? "—",
      itemType:            r["Tipo"] ?? "—",
      quantity:            r["Quantidade"] ?? null,
      status:              r["Status"] ?? "—",
      urgency:             r["Urgência"] ?? "—",
      date:                r["Data"] ?? "—",
      briefing:            r["Briefing"] ?? "—",
      approvalResponsible: r["Responsável Aprovação"] ?? "—",
      deliveryLink:        r["Link de Entrega"] ?? "—",
      deliveryDate:        r["Data de Entrega"] ?? "—",
      neededRevision:      r["Precisou de Alteração?"] ?? "—",
      revisionCount:       r["Nº de Alterações"] ?? null,
      complexity:          r["Complexidade"] ?? "—",
    }));

    // Métricas mensais
    const MONTH_LABELS: Record<string, string> = {
      "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
      "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
      "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro",
    };
    const monthMap: Record<string, {
      totalPlanned: number; delivered: number; inApproval: number;
      withRevision: number; days: Set<string>;
      uniqueTasks: number; uniqueDeliveredTasks: number;
    }> = {};

    for (const r of rows) {
      const date = r["Data"];
      if (!date) continue;
      // Suporta tanto DD-MM-YYYY quanto YYYY-MM-DD
      const isoDate = date.match(/^\d{4}/)
        ? date.slice(0, 10)
        : date.split("-").reverse().join("-");
      const m = isoDate.slice(0, 7);
      if (!monthMap[m]) monthMap[m] = { totalPlanned: 0, delivered: 0, inApproval: 0, withRevision: 0, days: new Set(), uniqueTasks: 0, uniqueDeliveredTasks: 0 };
      const qty = parseInt(r["Quantidade"]) || 1;
      monthMap[m].totalPlanned += qty;
      monthMap[m].uniqueTasks  += 1;
      if (r["Status"] === "Entregue") {
        monthMap[m].delivered            += qty;
        monthMap[m].uniqueDeliveredTasks += 1;
      }
      if (r["Status"] === "Em Aprovação") monthMap[m].inApproval += qty;
      if (r["Precisou de Alteração?"]?.toLowerCase() === "sim") monthMap[m].withRevision += qty;
      monthMap[m].days.add(isoDate);
    }

    const metrics: DesignMonthMetrics[] = Object.keys(monthMap).sort().map(m => {
      const v = monthMap[m];
      const dias = v.days.size;
      const pending = v.totalPlanned - v.delivered - v.inApproval;
      return {
        month: m,
        label: `${MONTH_LABELS[m.slice(5)]}/${m.slice(0, 4)}`,
        totalPlanned:            v.totalPlanned,
        delivered:               v.delivered,
        inApproval:              v.inApproval,
        withRevision:            v.withRevision,
        pending:                 Math.max(0, pending),
        completionPct:           v.totalPlanned > 0 ? Math.round((v.delivered / v.totalPlanned) * 100) : 0,
        uniqueProductionDays:    dias,
        avgDailyProduction:      dias > 0 ? Math.round((v.delivered / dias) * 10) / 10 : 0,
        uniqueTasks:             v.uniqueTasks,
        uniqueDeliveredTasks:    v.uniqueDeliveredTasks,
      };
    });

    return { productions, metrics };
  } catch {
    return { productions: [], metrics: [] };
  }
}

// ─────────────────────────────────────────────
//  NocoDB — fetch de produções de edição (Ana Laura)
// ─────────────────────────────────────────────
async function fetchProducoesEdicaoNocoDB(): Promise<{
  productions: NocoProdSummary[];
  metrics: DesignMonthMetrics[];
}> {
  try {
    const rows = await ndbList(NDB.tables.tasks_edicao, undefined, 500);

    const productions: NocoProdSummary[] = rows.map((r: any) => ({
      clientName:          r["Cliente"] ?? "—",
      itemType:            r["Tarefa"] ?? "—",
      quantity:            r["Nº de Alterações"] ?? null,
      status:              r["Status"] ?? "—",
      urgency:             r["Urgência"] ?? "—",
      date:                r["Prazo de Entrega"] ?? r["Data de Entrega"] ?? "—",
      deliveryDate:        r["Data de Entrega"] ?? r["Prazo de Entrega"] ?? "—",
      neededRevision:      r["Precisou de Alteração?"] ?? "—",
      revisionCount:       r["Nº de Alterações"] ?? null,
      complexity:          r["Complexidade"] ?? "—",
      approvalResponsible: r["Responsável Aprovação"] ?? "—",
      deliveryLink:        r["Link de Entrega"] ?? "—",
      briefing:            r["Briefing Completo"] ?? "—",
    }));

    const MONTH_LABELS: Record<string, string> = {
      "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
      "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
      "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro",
    };
    const monthMap: Record<string, { totalPlanned:number; delivered:number; inApproval:number; withRevision:number; days:Set<string> }> = {};
    for (const r of rows) {
      const date = r["Prazo de Entrega"] ?? r["Data de Entrega"]; if (!date) continue;
      const isoDate = date.match(/^\d{4}/) ? date.slice(0,10) : date.split("-").reverse().join("-");
      const m = isoDate.slice(0,7);
      if (!monthMap[m]) monthMap[m] = { totalPlanned:0, delivered:0, inApproval:0, withRevision:0, days:new Set() };
      monthMap[m].totalPlanned += 1;
      if (r["Status"] === "✅ Entregue")     monthMap[m].delivered  += 1;
      if (r["Status"] === "⏳ Em Aprovação") monthMap[m].inApproval += 1;
      if (r["Precisou de Alteração?"]?.toLowerCase() === "sim") monthMap[m].withRevision += 1;
      monthMap[m].days.add(isoDate);
    }
    const metrics: DesignMonthMetrics[] = Object.keys(monthMap).sort().map(m => {
      const v = monthMap[m];
      const dias = v.days.size;
      return {
        month: m,
        label: `${MONTH_LABELS[m.slice(5)]}/${m.slice(0,4)}`,
        totalPlanned: v.totalPlanned, delivered: v.delivered, inApproval: v.inApproval,
        withRevision: v.withRevision, pending: Math.max(0, v.totalPlanned - v.delivered - v.inApproval),
        completionPct: v.totalPlanned > 0 ? Math.round((v.delivered / v.totalPlanned) * 100) : 0,
        uniqueProductionDays: dias, avgDailyProduction: dias > 0 ? Math.round((v.delivered / dias)*10)/10 : 0,
        uniqueTasks: v.totalPlanned, uniqueDeliveredTasks: v.delivered, // edição: 1 por row
      };
    });
    return { productions, metrics };
  } catch {
    return { productions: [], metrics: [] };
  }
}

// ─────────────────────────────────────────────
//  NocoDB — fetch de tasks (todas as BUs + Design + Edição)
// ─────────────────────────────────────────────
async function fetchTasksNocoDB(): Promise<NocoTaskSummary[]> {
  try {
    const tableMap: Array<[string, string]> = [
      [NDB.tables.tasks_bu1,    "BU1"],
      [NDB.tables.tasks_bu2,    "BU2"],
      [NDB.tables.tasks_design, "Design"],
      [NDB.tables.tasks_edicao, "Edição"],
    ];
    const results = await Promise.all(
      tableMap.map(([tid]) => ndbList(tid, undefined, 200))
    );
    const tasks: NocoTaskSummary[] = [];
    for (let i = 0; i < tableMap.length; i++) {
      const area = tableMap[i][1];
      for (const r of results[i]) {
        tasks.push({
          id:          r["Id"],
          title:       r["Tarefa"] ?? r["Título"] ?? "—",
          area,
          client:      r["Cliente"] ?? "—",
          status:      r["Status"] ?? "—",
          sla:         r["Status SLA"] ?? "—",
          deadline:    r["Prazo de Entrega"] ?? "—",
          daysLeft:    r["Dias até o Prazo"] ?? null,
          responsible: r["Responsável"] ?? "—",
          priority:    r["Prioridade"] ?? "—",
          quantity:    area === "Design" ? (parseInt(r["Quantidade"]) || null) : null,
        });
      }
    }
    return tasks;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
//  Métricas da Bruna combinando duas fontes:
//  - deposito_design: tasks entregues (com Quantidade e data real de entrega)
//  - tasks_design:    tasks abertas (com Quantidade, agrupadas pelo mês do prazo)
// ─────────────────────────────────────────────
function computeDesignMetricsFromTasks(
  openTasks: any[],   // tasks_design — abertas
  delivered: any[],   // deposito_design — entregues
): DesignMonthMetrics[] {
  const MONTH_LABELS: Record<string, string> = {
    "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
    "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
    "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro",
  };

  type MonthBucket = {
    openArtes: number; openTasks: number;
    deliveredArtes: number; deliveredTasks: number;
    inApprovalArtes: number; withRevision: number;
    days: Set<string>;
  };
  const monthMap: Record<string, MonthBucket> = {};

  const bucket = (m: string): MonthBucket => {
    if (!monthMap[m]) monthMap[m] = {
      openArtes: 0, openTasks: 0,
      deliveredArtes: 0, deliveredTasks: 0,
      inApprovalArtes: 0, withRevision: 0,
      days: new Set(),
    };
    return monthMap[m];
  };

  // tasks abertas → agrupadas pelo mês do prazo
  for (const r of openTasks) {
    const date = r["Prazo de Entrega"];
    if (!date) continue;
    const isoDate = date.match(/^\d{4}/) ? date.slice(0, 10) : date.split("-").reverse().join("-");
    const m = isoDate.slice(0, 7);
    const qty = parseInt(r["Quantidade"]) || 1;
    const status = r["Status"] ?? "";
    const b = bucket(m);
    b.openArtes += qty;
    b.openTasks += 1;
    if (status.includes("Aprovação") || status.includes("Revisão")) b.inApprovalArtes += qty;
  }

  // tasks entregues → agrupadas pelo mês da data de entrega
  for (const r of delivered) {
    const date = r["Data"] ?? r["Data de Entrega"];
    if (!date) continue;
    const isoDate = date.match(/^\d{4}/) ? date.slice(0, 10) : date.split("-").reverse().join("-");
    const m = isoDate.slice(0, 7);
    const qty = parseInt(r["Quantidade"]) || 1;
    const b = bucket(m);
    b.deliveredArtes += qty;
    b.deliveredTasks += 1;
    b.days.add(isoDate);
    if (r["Precisou de Alteração?"]?.toLowerCase() === "sim") b.withRevision += qty;
  }

  return Object.keys(monthMap).sort().map(m => {
    const v = monthMap[m];
    const totalArtes = v.deliveredArtes + v.openArtes;
    const dias = v.days.size || 1;
    const pending = v.openArtes - v.inApprovalArtes;
    return {
      month:                m,
      label:                `${MONTH_LABELS[m.slice(5)]}/${m.slice(0, 4)}`,
      totalPlanned:         totalArtes,
      delivered:            v.deliveredArtes,
      inApproval:           v.inApprovalArtes,
      withRevision:         v.withRevision,
      pending:              Math.max(0, pending),
      completionPct:        totalArtes > 0 ? Math.round((v.deliveredArtes / totalArtes) * 100) : 0,
      uniqueProductionDays: v.days.size,
      avgDailyProduction:   v.days.size > 0 ? Math.round((v.deliveredArtes / dias) * 10) / 10 : 0,
      uniqueTasks:          v.deliveredTasks + v.openTasks,
      uniqueDeliveredTasks: v.deliveredTasks,
    };
  });
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

  // Todos os dados NocoDB em paralelo (fonte de verdade)
  const [clients, designData, edicaoData, tasks, rawDesignTasks] = await Promise.all([
    fetchClientesNocoDB(),
    fetchProducoesDesignNocoDB(),
    fetchProducoesEdicaoNocoDB(),
    fetchTasksNocoDB(),
    ndbList(NDB.tables.tasks_design, undefined, 500),
  ]);
  base.clients           = clients;
  base.designProductions = designData.productions;
  // Métricas: open tasks (tasks_design) + entregues (deposito_design) com Quantidade real
  base.designMetrics     = computeDesignMetricsFromTasks(rawDesignTasks, designData.productions.map(p => ({
    "Data": p.date, "Quantidade": p.quantity, "Precisou de Alteração?": p.neededRevision,
  })));
  base.edicaoProductions = edicaoData.productions;
  base.edicaoMetrics     = edicaoData.metrics;
  base.tasks             = tasks;

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

  const GESTOR_MAP: Record<string, string> = { christian: "Christian", junior: "Júnior Monte", none: "Bruno/Armando" };
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

  return { tasksByArea, criticalSLA, awaitingApproval, blocked, hotLeads, wipByArea, alerts: [], clients, designProductions, designMetrics, edicaoProductions: [], edicaoMetrics: [], tasks: [] };
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
    edicaoProductions: [],
    edicaoMetrics: [],
    tasks: [],
  };
}
