/**
 * analyzer.ts
 * Cérebro estratégico do GPIA — usa Claude Sonnet para analisar o cenário
 * completo da BU e gerar briefings, alertas e sugestões de ação.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NDB, ndbList } from "../controller/nocodb-tool";
import { buildMemoryContext } from "./memory";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type BU = "BU1" | "BU2" | "BU3";

const BU_CONFIG = {
  BU1: { gestor: "Christian Castilhoni", table: NDB.tables.tasks_bu1, clientes: NDB.tables.clientes_bu1 },
  BU2: { gestor: "Armando Cavazana",     table: NDB.tables.tasks_bu2, clientes: NDB.tables.clientes_bu2 },
  BU3: { gestor: "Bruna Benevides",      table: NDB.tables.tasks_bu3, clientes: NDB.tables.clientes_bu3 },
};

export interface BUSnapshot {
  bu: BU;
  gestor: string;
  tasks: any[];
  tasksDesign: any[];
  tasksEdicao: any[];
  memories: string;
}

/** Monta snapshot completo da BU buscando dados do NocoDB */
export async function buildSnapshot(bu: BU): Promise<BUSnapshot> {
  const cfg = BU_CONFIG[bu];

  const [tasks, tasksDesign, tasksEdicao, memories] = await Promise.all([
    ndbList(cfg.table, ""),
    ndbList(NDB.tables.tasks_design,  `(Origem,eq,${bu})`),
    ndbList(NDB.tables.tasks_edicao,  `(Origem,eq,${bu})`),
    buildMemoryContext(bu),
  ]);

  return { bu, gestor: cfg.gestor, tasks, tasksDesign, tasksEdicao, memories };
}

function formatTasks(tasks: any[]): string {
  if (tasks.length === 0) return "  (nenhuma)";
  return tasks.map(t => {
    const prazo   = t["Prazo de Entrega"] ?? "sem prazo";
    const cliente = t["Cliente"] ?? "—";
    const status  = t["Status"] ?? "—";
    return `  • [${status}] ${t["Tarefa"] ?? "—"} | Cliente: ${cliente} | Prazo: ${prazo}`;
  }).join("\n");
}

function buildPrompt(snapshot: BUSnapshot, tipo: "briefing" | "alerta" | "semanal" | "executivo"): string {
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const tasksAberta   = snapshot.tasks.filter(t => !["✅ Entregue","📦 Arquivado"].includes(t["Status"]));
  const tasksAtrasadas = tasksAberta.filter(t => {
    if (!t["Prazo de Entrega"]) return false;
    return new Date(t["Prazo de Entrega"]) < new Date();
  });
  const emRevisao = snapshot.tasks.filter(t => t["Status"] === "🔄 Em Revisão");
  const emAprovacao = snapshot.tasks.filter(t => t["Status"] === "🔎 Revisão Interna");

  const contexto = `
DATA: ${hoje}
BU: ${snapshot.bu} — Gestor: ${snapshot.gestor}

TASKS DA BU (${tasksAberta.length} abertas, ${tasksAtrasadas.length} atrasadas):
${formatTasks(tasksAberta)}

TASKS DE DESIGN vinculadas à ${snapshot.bu} (${snapshot.tasksDesign.length}):
${formatTasks(snapshot.tasksDesign)}

TASKS DE EDIÇÃO vinculadas à ${snapshot.bu} (${snapshot.tasksEdicao.length}):
${formatTasks(snapshot.tasksEdicao)}

TASKS EM REVISÃO PELO GESTOR (${emRevisao.length}):
${formatTasks(emRevisao)}

AGUARDANDO APROVAÇÃO DO GESTOR (${emAprovacao.length}):
${formatTasks(emAprovacao)}

MEMÓRIA HISTÓRICA (decisões e padrões anteriores):
${snapshot.memories}
`.trim();

  const instrucoes: Record<string, string> = {
    briefing: `
Você é o co-piloto estratégico de ${snapshot.gestor}, gestor de projetos da ${snapshot.bu} do Grupo Venda.

Gere o BRIEFING MATINAL. Será lido no WhatsApp — o formato abaixo é obrigatório.

REGRAS DE FORMATAÇÃO (siga exatamente):
- O título de cada seção fica SOZINHO na sua linha
- Antes do título, UMA linha em branco extra (para respirar)
- Depois do título, UMA linha em branco, depois o conteúdo
- Frases curtas — máx 1 linha por item
- Sem asteriscos, sem negrito, sem markdown
- Máximo 300 palavras

Estrutura exata (copie este espaçamento):

🌅 Bom dia, ${snapshot.gestor.split(" ")[0]}

📊 PANORAMA

[2 linhas: volume de tasks, situação geral e tom do dia]

🎯 PRIORIDADES DE HOJE

[3 a 5 itens — 1 por linha, sem numeração, cada um com justificativa curta]

⚠️ ALERTAS

[só o urgente — SLA, clientes em risco, revisões paradas — 1 item por linha com •]

💡 SUGESTÃO DO DIA

[1 sugestão estratégica em no máximo 2 linhas]
`,
    alerta: `
Você é o co-piloto estratégico de ${snapshot.gestor} do Grupo Venda.

Analise o cenário e identifique PROBLEMAS URGENTES. Será lido no WhatsApp.

REGRAS DE FORMATAÇÃO (siga exatamente):
- Antes do título, UMA linha em branco extra (para respirar)
- O título fica sozinho na sua linha, depois UMA linha em branco, depois os itens
- Cada problema em 1 linha com •
- Linha ↳ Ação: imediatamente abaixo de cada problema
- Sem asteriscos, sem negrito, sem markdown

Formato exato:

⚠️ ALERTA — ${snapshot.bu}

• [cliente ou área] — [problema em 1 linha]
  ↳ Ação: [o que fazer agora]

• [cliente ou área] — [problema em 1 linha]
  ↳ Ação: [o que fazer agora]

Se não houver nada urgente, retorne exatamente: SEM_ALERTAS
`,
    semanal: `
Você é o co-piloto estratégico de ${snapshot.gestor} do Grupo Venda.

Gere o RELATÓRIO SEMANAL da ${snapshot.bu}. Será lido no WhatsApp — formato obrigatório abaixo.

REGRAS DE FORMATAÇÃO (siga exatamente):
- Antes de cada título, UMA linha em branco extra (para respirar)
- O título fica sozinho na sua linha, depois UMA linha em branco, depois o conteúdo
- Listas com • e 1 item por linha
- Sem asteriscos, sem negrito, sem markdown
- Máximo 400 palavras

Estrutura exata:

📋 RELATÓRIO SEMANAL — ${snapshot.bu}

📈 DESEMPENHO DA SEMANA

[entregas, volume, comparativo — 2 a 3 linhas]

🏢 STATUS POR CONTA

[1 linha por cliente — Nome: situação]

🔴 PONTOS DE ATENÇÃO

[máx 3 itens com • — problema + impacto em 1 linha]

✅ CONQUISTAS

[máx 3 itens com • — 1 linha cada]

📌 PRÓXIMA SEMANA

[3 ações numeradas — 1 linha cada]
`,
    executivo: `
Você é o assistente executivo de Bruno, CEO do Grupo Venda.

Gere o RELATÓRIO EXECUTIVO consolidando as duas BUs. Será lido no WhatsApp — formato obrigatório abaixo.

REGRAS DE FORMATAÇÃO (siga exatamente):
- Antes de cada título, UMA linha em branco extra (para respirar)
- O título fica sozinho na sua linha, depois UMA linha em branco, depois o conteúdo
- Zero jargão operacional — só números e fatos
- Sem asteriscos, sem negrito, sem markdown
- Máximo 150 palavras

Estrutura exata:

📊 EXECUTIVO — GRUPO VENDA

🔢 NÚMEROS DA SEMANA

[entregas totais · clientes ativos · SLA médio · tasks atrasadas — 1 linha]

🟢 FUNCIONANDO

[máx 2 linhas — o que está indo bem]

🔴 ATENÇÃO

[máx 2 itens com • — problema + impacto financeiro ou de retenção]

⚡ DECISÃO RECOMENDADA

[1 ação estratégica — máx 2 linhas]
`,
  };

  return instrucoes[tipo] + "\n\nDADOS OPERACIONAIS:\n" + contexto;
}

/** Gera análise usando Claude Sonnet */
export async function analyzeScenario(
  snapshot: BUSnapshot,
  tipo: "briefing" | "alerta" | "semanal" | "executivo",
): Promise<string> {
  const prompt = buildPrompt(snapshot, tipo);

  const response = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages:   [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  return text;
}
