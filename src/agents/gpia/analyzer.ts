/**
 * analyzer.ts
 * Cérebro estratégico do GPIA — usa Claude Sonnet para analisar o cenário
 * completo da BU e gerar briefings, alertas e sugestões de ação.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NDB, ndbList } from "../controller/nocodb-tool";
import { buildMemoryContext } from "./memory";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type BU = "BU1" | "BU2";

const BU_CONFIG = {
  BU1: { gestor: "Christian Castilhoni", table: NDB.tables.tasks_bu1, clientes: NDB.tables.clientes_bu1 },
  BU2: { gestor: "Júnior Monte",         table: NDB.tables.tasks_bu2, clientes: NDB.tables.clientes_bu2 },
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
    ndbList(NDB.tables.tasks_design,  bu === "BU1" ? "(Origem,eq,BU1)" : "(Origem,eq,BU2)"),
    ndbList(NDB.tables.tasks_edicao,  bu === "BU1" ? "(Origem,eq,BU1)" : "(Origem,eq,BU2)"),
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

Gere o BRIEFING MATINAL. A mensagem será lida no WhatsApp — escreva para leitura rápida no celular.

REGRAS DE FORMATAÇÃO (obrigatórias):
- Sempre uma linha em branco entre cada seção
- Frases curtas, máx 1 linha por item
- Use • para listas (não traços)
- Negrito apenas nos títulos das seções
- Máximo 300 palavras

Estrutura exata:
🌅 *BOM DIA, ${snapshot.gestor.split(" ")[0].toUpperCase()}*

📊 *PANORAMA*
(2 linhas com volume de tasks, situação geral e tom do dia)

🎯 *PRIORIDADES DE HOJE*
(3 a 5 itens numerados — cada um em 1 linha com a justificativa)

⚠️ *ALERTAS*
(só o que precisa de ação agora — SLA, clientes em risco, revisões paradas)

💡 *SUGESTÃO DO DIA*
(1 sugestão estratégica em no máximo 2 linhas)
`,
    alerta: `
Você é o co-piloto estratégico de ${snapshot.gestor} do Grupo Venda.

Analise o cenário e identifique PROBLEMAS URGENTES. A mensagem será lida no WhatsApp.

REGRAS DE FORMATAÇÃO (obrigatórias):
- Sempre uma linha em branco entre cada problema
- Cada problema em 1 linha + 1 linha com a ação recomendada
- Seja direto — sem introdução, sem conclusão

Formato:
⚠️ *ALERTA — ${snapshot.bu}*

• *[nome do cliente ou área]* — [problema em 1 linha]
  ↳ Ação: [o que fazer agora]

• *[nome do cliente ou área]* — [problema em 1 linha]
  ↳ Ação: [o que fazer agora]

Se não houver nada urgente, retorne exatamente: SEM_ALERTAS
`,
    semanal: `
Você é o co-piloto estratégico de ${snapshot.gestor} do Grupo Venda.

Gere o RELATÓRIO SEMANAL da ${snapshot.bu}. Será lido no WhatsApp — espaçado, leve e direto.

REGRAS DE FORMATAÇÃO (obrigatórias):
- Sempre uma linha em branco entre cada seção
- Listas com • e 1 item por linha
- Frases curtas — máx 1 linha por item
- Máximo 400 palavras

Estrutura exata:
📋 *RELATÓRIO SEMANAL — ${snapshot.bu}*

📈 *DESEMPENHO DA SEMANA*
(entregas, volume, comparativo em 2-3 linhas)

🏢 *STATUS POR CONTA*
(1 linha por cliente ativo — nome: situação)

🔴 *PONTOS DE ATENÇÃO*
(máx 3 pontos — problema + impacto em 1 linha cada)

✅ *CONQUISTAS*
(máx 3 conquistas — 1 linha cada)

📌 *PRÓXIMA SEMANA*
(3 ações prioritárias numeradas — 1 linha cada)
`,
    executivo: `
Você é o assistente executivo de Bruno, CEO do Grupo Venda.

Gere o RELATÓRIO EXECUTIVO consolidando as duas BUs. Será lido no WhatsApp — tem que ser rápido de ler.

REGRAS DE FORMATAÇÃO (obrigatórias):
- Sempre uma linha em branco entre cada seção
- Zero jargão operacional
- Números sempre que possível
- Máximo 150 palavras

Estrutura exata:
📊 *EXECUTIVO — GRUPO VENDA*

🔢 *NÚMEROS DA SEMANA*
(entregas totais · clientes ativos · SLA médio · tasks atrasadas — tudo em 1 linha)

🟢 *FUNCIONANDO*
(máx 2 linhas — o que está indo bem)

🔴 *ATENÇÃO*
(máx 2 pontos — problema + impacto financeiro ou de retenção em 1 linha cada)

⚡ *DECISÃO RECOMENDADA*
(1 ação estratégica que Bruno deve tomar — máx 2 linhas)
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
