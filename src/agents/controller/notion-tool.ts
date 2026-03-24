import { Client } from "@notionhq/client";
import { log } from "./logger";

// ─── Database IDs ─────────────────────────────────────────────────────────────
export const NOTION_DBS = {
  tasks_bu1:           "32c16e0ee44681ed831dd961006e3448",
  tasks_bu2:           "32c16e0ee4468179a1d6d0d1a177ca21",
  tasks_geral:         "32c16e0ee44681f1b68fc40800474631",
  editorial_bu1:       "32c16e0ee44681819164c91477a3fbbc",
  editorial_bu2:       "32c16e0ee4468163ac81d3f4d4dbd0d6",
  resultados:          "32c16e0ee44681799552f87d30884235",
  design_bruna:        "32d16e0ee446815ab216c4820125556d",
  tasks_design_bruna:  "32d16e0ee4468158bd78d43a46d92851",
} as const;

// ─── Tool definition (para o Anthropic tool_use) ─────────────────────────────
export const notionTasksTool = {
  name: "query_notion_tasks",
  description:
    "Busca tasks reais do Notion (BU1, BU2 ou geral). Use quando alguém perguntar sobre tarefas, " +
    "demandas, status de projetos, SLA, carga de trabalho, tasks em atraso ou qualquer consulta " +
    "operacional sobre o que está acontecendo no Notion. Retorna lista de tasks com status, área, " +
    "responsável, cliente, prazo e SLA.",
  input_schema: {
    type: "object" as const,
    properties: {
      banco: {
        type: "string",
        enum: ["bu1", "bu2", "geral"],
        description: "Qual banco consultar: bu1 (Christian), bu2 (Junior), geral (todos)",
      },
      filtro_status: {
        type: "string",
        description:
          "Filtrar por status específico. Valores: 'Inbox', 'Triagem', 'Atribuído', " +
          "'Em Produção', 'Revisão Interna', 'Aprovação Cliente', 'Ajustes', 'Concluído', 'Pausado/Bloqueado'. " +
          "Deixe vazio para retornar todos os status abertos.",
      },
      filtro_area: {
        type: "string",
        description:
          "Filtrar por área: 'Design', 'Vídeo', 'Tráfego', 'Conteúdo', 'Captação', " +
          "'Atendimento', 'Operações', 'Comercial', 'Financeiro'",
      },
      filtro_sla: {
        type: "string",
        enum: ["critico", "vencido", "atencao"],
        description: "Filtrar por urgência de SLA: critico (<=1 dia), vencido (passou), atencao (<=2 dias)",
      },
      filtro_prioridade: {
        type: "string",
        enum: ["P0", "P1", "P2"],
        description: "Filtrar por prioridade",
      },
      limite: {
        type: "number",
        description: "Número máximo de tasks a retornar (padrão: 20)",
      },
    },
    required: ["banco"],
  },
};

// ─── Execução ─────────────────────────────────────────────────────────────────
export async function queryNotionTasks(input: {
  banco: "bu1" | "bu2" | "geral";
  filtro_status?: string;
  filtro_area?: string;
  filtro_sla?: "critico" | "vencido" | "atencao";
  filtro_prioridade?: string;
  limite?: number;
}): Promise<string> {
  const apiKey = process.env.NOTION_TOKEN;
  if (!apiKey) {
    return "Notion não configurado — NOTION_TOKEN não encontrado no .env.";
  }

  const notion = new Client({ auth: apiKey });
  const dbId = input.banco === "bu1" ? NOTION_DBS.tasks_bu1
             : input.banco === "bu2" ? NOTION_DBS.tasks_bu2
             : NOTION_DBS.tasks_geral;

  const limite = input.limite ?? 20;

  // Monta filtros
  const filters: any[] = [];

  // Status
  if (input.filtro_status) {
    const statusMap: Record<string, string> = {
      "Inbox":              "📥 Inbox",
      "Triagem":            "🔍 Triagem",
      "Atribuído":          "👤 Atribuído",
      "Em Produção":        "⚙️ Em Produção",
      "Revisão Interna":    "🔎 Revisão Interna",
      "Aprovação Cliente":  "⏳ Aprovação Cliente",
      "Ajustes":            "✏️ Ajustes",
      "Concluído":          "✅ Concluído",
      "Pausado/Bloqueado":  "⏸️ Pausado/Bloqueado",
    };
    const statusValue = statusMap[input.filtro_status] ?? input.filtro_status;
    filters.push({ property: "Status", select: { equals: statusValue } });
  } else {
    // Por padrão, exclui concluídas
    filters.push({
      property: "Status",
      select: { does_not_equal: "✅ Concluído" },
    });
  }

  // Área
  if (input.filtro_area) {
    filters.push({ property: "Área", select: { equals: input.filtro_area } });
  }

  // SLA
  if (input.filtro_sla) {
    const today = new Date();
    const slaFilters: Record<string, any> = {
      vencido: { property: "Prazo de Entrega", date: { before: today.toISOString() } },
      critico: { property: "Prazo de Entrega", date: { before: new Date(today.getTime() + 24 * 3600 * 1000).toISOString() } },
      atencao: { property: "Prazo de Entrega", date: { before: new Date(today.getTime() + 48 * 3600 * 1000).toISOString() } },
    };
    if (slaFilters[input.filtro_sla]) {
      filters.push(slaFilters[input.filtro_sla]);
    }
  }

  // Prioridade
  if (input.filtro_prioridade) {
    const prioMap: Record<string, string> = {
      "P0": "🔴 P0 — Emergência",
      "P1": "🟠 P1 — Alta",
      "P2": "🟡 P2 — Normal",
    };
    filters.push({ property: "Prioridade", select: { equals: prioMap[input.filtro_prioridade] ?? input.filtro_prioridade } });
  }

  const filter = filters.length === 1 ? filters[0]
               : filters.length > 1   ? { and: filters }
               : undefined;

  log("info", `[notion] query banco=${input.banco} filtros=${JSON.stringify(input)}`);

  try {
    const response = await notion.databases.query({
      database_id: dbId,
      filter,
      sorts: [{ property: "Prazo de Entrega", direction: "ascending" }],
      page_size: Math.min(limite, 50),
    });

    if (response.results.length === 0) {
      return `Nenhuma task encontrada no banco ${input.banco.toUpperCase()} com os filtros aplicados.`;
    }

    const lines: string[] = [
      `Tasks encontradas (${input.banco.toUpperCase()}): ${response.results.length}`,
      "",
    ];

    for (const page of response.results) {
      if (page.object !== "page") continue;
      const props = (page as any).properties;

      const tarefa     = props["Tarefa"]?.title?.[0]?.text?.content ?? "Sem título";
      const status     = props["Status"]?.select?.name ?? "—";
      const area       = props["Área"]?.select?.name ?? "—";
      const prioridade = props["Prioridade"]?.select?.name ?? "—";
      const sla        = props["Status SLA"]?.formula?.string ?? "—";
      const prazo      = props["Prazo de Entrega"]?.date?.start
                         ? new Date(props["Prazo de Entrega"].date.start).toLocaleDateString("pt-BR")
                         : "Sem prazo";
      const protocolo  = props["Protocolo"]?.rich_text?.[0]?.text?.content ?? "—";

      // Responsável (people)
      const responsaveis = (props["Responsável"]?.people ?? [])
        .map((p: any) => p.name).join(", ") || "Sem responsável";

      // Motivo bloqueio
      const bloqueio = props["Motivo de Bloqueio"]?.rich_text?.[0]?.text?.content ?? "";

      lines.push(
        `• ${tarefa}` +
        `\n  Status: ${status} | Área: ${area} | Prioridade: ${prioridade}` +
        `\n  SLA: ${sla} | Prazo: ${prazo} | Responsável: ${responsaveis}` +
        (protocolo !== "—" ? `\n  Protocolo: ${protocolo}` : "") +
        (bloqueio ? `\n  Bloqueio: ${bloqueio}` : "")
      );
    }

    if (response.has_more) {
      lines.push(`\n... e mais tasks não exibidas. Use filtros para refinar.`);
    }

    return lines.join("\n");

  } catch (err: any) {
    const msg = err?.message || String(err);
    log("error", `[notion] query falhou: ${msg}`);
    return `Erro ao consultar o Notion: ${msg}`;
  }
}

// ─── Tool: Produções de Design da Bruna ───────────────────────────────────────
export const designProductionsTool = {
  name: "query_design_productions",
  description:
    "Consulta as produções de design da Bruna Benevides. Use quando perguntarem sobre artes, " +
    "peças criadas, produção da Bruna, quantas artes foram feitas, desempenho de design, " +
    "revisões, itens por cliente, tipos de peça ou histórico de produção criativa. " +
    "Retorna registros com cliente, tipo de peça, status, urgência, responsável, revisões e links.",
  input_schema: {
    type: "object" as const,
    properties: {
      filtro_cliente: {
        type: "string",
        description: "Filtrar por nome do cliente (ex: 'Moura leite', 'Geezer', 'DNA')",
      },
      filtro_status: {
        type: "string",
        description: "Filtrar por status: 'Entregue', 'Em Aprovação', 'Em StandBy'",
      },
      filtro_urgencia: {
        type: "string",
        enum: ["Urgente", "Média", "Suave"],
        description: "Filtrar por urgência",
      },
      filtro_tipo: {
        type: "string",
        description: "Filtrar por tipo de peça (ex: 'Feed', 'Story', 'Carrosel', 'Capa')",
      },
      filtro_data_inicio: {
        type: "string",
        description: "Data inicial no formato YYYY-MM-DD",
      },
      filtro_data_fim: {
        type: "string",
        description: "Data final no formato YYYY-MM-DD",
      },
      apenas_com_revisao: {
        type: "boolean",
        description: "Se true, retorna apenas itens que precisaram de revisão",
      },
      limite: {
        type: "number",
        description: "Número máximo de registros (padrão: 30)",
      },
    },
    required: [],
  },
};

export async function queryDesignProductions(input: {
  filtro_cliente?:    string;
  filtro_status?:     string;
  filtro_urgencia?:   string;
  filtro_tipo?:       string;
  filtro_data_inicio?: string;
  filtro_data_fim?:   string;
  apenas_com_revisao?: boolean;
  limite?:            number;
}): Promise<string> {
  const apiKey = process.env.NOTION_TOKEN;
  if (!apiKey) return "Notion não configurado — NOTION_TOKEN ausente.";

  const notion = new Client({ auth: apiKey });
  const limite = input.limite ?? 30;
  const filters: any[] = [];

  if (input.filtro_cliente)
    filters.push({ property: "Cliente", select: { equals: input.filtro_cliente } });

  if (input.filtro_status)
    filters.push({ property: "Status", select: { equals: input.filtro_status } });

  if (input.filtro_urgencia)
    filters.push({ property: "Urgência", select: { equals: input.filtro_urgencia } });

  if (input.filtro_tipo)
    filters.push({ property: "Tipo", select: { equals: input.filtro_tipo } });

  if (input.filtro_data_inicio)
    filters.push({ property: "Data", date: { on_or_after: input.filtro_data_inicio } });

  if (input.filtro_data_fim)
    filters.push({ property: "Data", date: { on_or_before: input.filtro_data_fim } });

  if (input.apenas_com_revisao)
    filters.push({ property: "Precisou de Alteração?", select: { equals: "Sim" } });

  const filter = filters.length === 0 ? undefined
               : filters.length === 1 ? filters[0]
               : { and: filters };

  log("info", `[design] query filtros=${JSON.stringify(input)}`);

  try {
    const response = await notion.databases.query({
      database_id: NOTION_DBS.design_bruna,
      filter,
      sorts: [{ property: "Data", direction: "descending" }],
      page_size: Math.min(limite, 50),
    });

    if (response.results.length === 0)
      return "Nenhuma produção encontrada com os filtros aplicados.";

    // Calcula totais para resumo
    let totalPecas = 0;
    let totalRevisoes = 0;

    const lines: string[] = [`Produções de design — Bruna Benevides: ${response.results.length} registros`, ""];

    for (const page of response.results) {
      if (page.object !== "page") continue;
      const p = (page as any).properties;

      const tarefa  = p["Tarefa"]?.title?.[0]?.text?.content ?? "—";
      const cliente = p["Cliente"]?.select?.name ?? "—";
      const data    = p["Data"]?.date?.start
                      ? new Date(p["Data"].date.start).toLocaleDateString("pt-BR") : "—";
      const tipo    = p["Tipo"]?.select?.name ?? "—";
      const qtd     = p["Quantidade"]?.number ?? 1;
      const status  = p["Status"]?.select?.name ?? "—";
      const urg     = p["Urgência"]?.select?.name ?? "—";
      const rev     = p["Precisou de Alteração?"]?.select?.name ?? "—";
      const nRev    = p["Nº de Alterações"]?.number ?? 0;
      const comp    = p["Complexidade"]?.select?.name ?? "—";
      const aprov   = p["Responsável Aprovação"]?.select?.name ?? "—";

      totalPecas += qtd;
      if (rev === "Sim") totalRevisoes += nRev;

      const revInfo = rev === "Sim" ? ` | ${nRev}x revisão` : "";
      const aprovInfo = aprov && aprov !== "—" ? ` | aprova: ${aprov}` : "";

      lines.push(
        `• [${data}] ${cliente} — ${tipo} x${qtd} | ${status} | ${urg} | ${comp}${revInfo}${aprovInfo}`
      );
    }

    lines.push("");
    lines.push(`Resumo: ${totalPecas} peças no total | ${totalRevisoes} revisões acumuladas`);

    if (response.has_more)
      lines.push(`... mais registros existem. Use filtros para refinar.`);

    return lines.join("\n");

  } catch (err: any) {
    const msg = err?.message || String(err);
    log("error", `[design] query falhou: ${msg}`);
    return `Erro ao consultar produções de design: ${msg}`;
  }
}

// ─── Tool: Tasks de Design — Bruna (quadro operacional diário) ────────────────
export const designTasksTool = {
  name: "query_design_tasks",
  description:
    "Consulta as tasks de design ativas da Bruna Benevides — quadro operacional do dia a dia, " +
    "equivalente ao quadro BU1/BU2 mas para design. Use quando perguntarem sobre tarefas abertas " +
    "da Bruna, o que ela está produzindo agora, quantas tasks tem no dia, tasks em atraso, " +
    "tasks de um cliente específico, carga de trabalho atual ou qualquer consulta operacional sobre " +
    "o trabalho em andamento da Bruna. Retorna tasks com status, cliente, tipo de peça, prazo, " +
    "urgência, prioridade e origem (Manual/BU1/BU2).",
  input_schema: {
    type: "object" as const,
    properties: {
      filtro_status: {
        type: "string",
        description:
          "Filtrar por status: 'Inbox', 'Atribuído', 'Em Produção', 'Revisão Interna', " +
          "'Aprovação Cliente', 'Ajustes', 'Entregue', 'Pausado/Bloqueado'. " +
          "Vazio = retorna todos exceto Entregue.",
      },
      filtro_cliente: {
        type: "string",
        description: "Filtrar por nome do cliente",
      },
      filtro_urgencia: {
        type: "string",
        enum: ["Urgente", "Média", "Suave"],
        description: "Filtrar por urgência",
      },
      filtro_prioridade: {
        type: "string",
        enum: ["P0", "P1", "P2", "P3"],
        description: "Filtrar por prioridade",
      },
      filtro_origem: {
        type: "string",
        enum: ["Manual", "BU1", "BU2"],
        description: "Filtrar por origem da task",
      },
      filtro_sla: {
        type: "string",
        enum: ["vencido", "critico", "atencao"],
        description: "Filtrar por SLA: vencido (passou do prazo), critico (<=1 dia), atencao (<=2 dias)",
      },
      limite: {
        type: "number",
        description: "Número máximo de tasks (padrão: 25)",
      },
    },
    required: [],
  },
};

export async function queryDesignTasks(input: {
  filtro_status?:    string;
  filtro_cliente?:   string;
  filtro_urgencia?:  string;
  filtro_prioridade?: string;
  filtro_origem?:    string;
  filtro_sla?:       "vencido" | "critico" | "atencao";
  limite?:           number;
}): Promise<string> {
  const apiKey = process.env.NOTION_TOKEN;
  if (!apiKey) return "Notion não configurado — NOTION_TOKEN ausente.";

  const dbId = NOTION_DBS.tasks_design_bruna;
  if (!dbId) return "Tasks de Design ainda não configurado — rode o script setup-design-tasks.ts primeiro.";

  const notion = new Client({ auth: apiKey });
  const limite = input.limite ?? 25;
  const filters: any[] = [];

  // Status
  if (input.filtro_status) {
    const statusMap: Record<string, string> = {
      "Inbox":              "📥 Inbox",
      "Atribuído":          "👤 Atribuído",
      "Em Produção":        "⚙️ Em Produção",
      "Revisão Interna":    "🔎 Revisão Interna",
      "Aprovação Cliente":  "⏳ Aprovação Cliente",
      "Ajustes":            "✏️ Ajustes",
      "Entregue":           "✅ Entregue",
      "Pausado/Bloqueado":  "⏸️ Pausado/Bloqueado",
    };
    filters.push({ property: "Status", select: { equals: statusMap[input.filtro_status] ?? input.filtro_status } });
  } else {
    // Por padrão, exclui entregues
    filters.push({ property: "Status", select: { does_not_equal: "✅ Entregue" } });
  }

  if (input.filtro_cliente)
    filters.push({ property: "Cliente", select: { equals: input.filtro_cliente } });

  if (input.filtro_urgencia)
    filters.push({ property: "Urgência", select: { equals: input.filtro_urgencia } });

  if (input.filtro_prioridade) {
    const prioMap: Record<string, string> = {
      "P0": "🔴 P0 — Emergência",
      "P1": "🟠 P1 — Alta",
      "P2": "🟡 P2 — Normal",
      "P3": "🟢 P3 — Baixa",
    };
    filters.push({ property: "Prioridade", select: { equals: prioMap[input.filtro_prioridade] ?? input.filtro_prioridade } });
  }

  if (input.filtro_origem)
    filters.push({ property: "Origem", select: { equals: input.filtro_origem } });

  if (input.filtro_sla) {
    const today = new Date();
    const slaFilters: Record<string, any> = {
      vencido: { property: "Prazo de Entrega", date: { before: today.toISOString() } },
      critico: { property: "Prazo de Entrega", date: { before: new Date(today.getTime() + 24 * 3600 * 1000).toISOString() } },
      atencao: { property: "Prazo de Entrega", date: { before: new Date(today.getTime() + 48 * 3600 * 1000).toISOString() } },
    };
    if (slaFilters[input.filtro_sla]) filters.push(slaFilters[input.filtro_sla]);
  }

  const filter = filters.length === 1 ? filters[0]
               : filters.length > 1   ? { and: filters }
               : undefined;

  log("info", `[design-tasks] query filtros=${JSON.stringify(input)}`);

  try {
    const response = await notion.databases.query({
      database_id: dbId,
      filter,
      sorts: [{ property: "Prazo de Entrega", direction: "ascending" }],
      page_size: Math.min(limite, 50),
    });

    if (response.results.length === 0)
      return "Nenhuma task de design encontrada com os filtros aplicados.";

    const lines: string[] = [
      `Tasks de Design — Bruna: ${response.results.length} task(s)`,
      "",
    ];

    for (const page of response.results) {
      if (page.object !== "page") continue;
      const p = (page as any).properties;

      const tarefa    = p["Tarefa"]?.title?.[0]?.text?.content ?? "Sem título";
      const status    = p["Status"]?.select?.name ?? "—";
      const cliente   = p["Cliente"]?.select?.name ?? "—";
      const tipo      = p["Tipo de Peça"]?.select?.name ?? "—";
      const qtd       = p["Quantidade"]?.number ?? 1;
      const urg       = p["Urgência"]?.select?.name ?? "—";
      const prio      = p["Prioridade"]?.select?.name ?? "—";
      const origem    = p["Origem"]?.select?.name ?? "—";
      const prazo     = p["Prazo de Entrega"]?.date?.start
                        ? new Date(p["Prazo de Entrega"].date.start).toLocaleDateString("pt-BR")
                        : "Sem prazo";
      const taskOrig  = p["Task Origem"]?.rich_text?.[0]?.text?.content ?? "";

      lines.push(
        `• ${tarefa}` +
        `\n  Status: ${status} | Cliente: ${cliente} | Tipo: ${tipo} x${qtd}` +
        `\n  Urgência: ${urg} | Prioridade: ${prio} | Prazo: ${prazo} | Origem: ${origem}` +
        (taskOrig ? `\n  Task origem: ${taskOrig}` : "")
      );
    }

    if (response.has_more)
      lines.push(`\n... mais tasks existem. Use filtros para refinar.`);

    return lines.join("\n");

  } catch (err: any) {
    const msg = err?.message || String(err);
    log("error", `[design-tasks] query falhou: ${msg}`);
    return `Erro ao consultar tasks de design: ${msg}`;
  }
}
