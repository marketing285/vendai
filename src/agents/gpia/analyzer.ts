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

function buildPrompt(snapshot: BUSnapshot, tipo: "briefing" | "alerta" | "semanal"): string {
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

Com base no cenário abaixo, gere o BRIEFING MATINAL do gestor. Seja direto, prático e estratégico.

Estrutura obrigatória (use exatamente esses títulos):
🌅 *BOM DIA, ${snapshot.gestor.split(" ")[0].toUpperCase()}*

📊 *PANORAMA DA ${snapshot.bu}*
(resumo em 2-3 linhas: volume de tasks, situação geral, tom do dia)

🎯 *PRIORIDADES DE HOJE*
(lista numerada das 3-5 ações mais importantes com justificativa)

⚠️ *ALERTAS*
(problemas que precisam de atenção imediata — SLA, clientes em risco, revisões acumuladas)

💡 *SUGESTÃO DO DIA*
(uma sugestão estratégica ou de melhoria de processo baseada no padrão observado)

Seja objetivo. Máximo 300 palavras. Fale diretamente com o gestor no imperativo.
`,
    alerta: `
Você é o co-piloto estratégico de ${snapshot.gestor} do Grupo Venda.

Analise o cenário abaixo e identifique PROBLEMAS URGENTES que o gestor precisa resolver AGORA.

Retorne SOMENTE se houver algo urgente. Seja direto:
⚠️ *ALERTA — ${snapshot.bu}*

(liste apenas os problemas críticos com ação recomendada para cada um)

Se não houver nada urgente, retorne exatamente: SEM_ALERTAS
`,
    semanal: `
Você é o co-piloto estratégico de ${snapshot.gestor} do Grupo Venda.

Gere o RELATÓRIO SEMANAL da ${snapshot.bu} para o gestor e para Armando Cavazana (CMO).

Estrutura:
📋 *RELATÓRIO SEMANAL — ${snapshot.bu}*

📈 *DESEMPENHO DA SEMANA*
(entregas realizadas, volume, comparativo)

🏢 *STATUS POR CONTA*
(resumo rápido de cada cliente ativo)

🔴 *PONTOS DE ATENÇÃO*
(problemas recorrentes, contas em risco, gargalos)

✅ *CONQUISTAS*
(o que foi bem, melhorias observadas)

📌 *RECOMENDAÇÕES PARA PRÓXIMA SEMANA*
(3 ações estratégicas prioritárias)

Máximo 400 palavras.
`,
  };

  return instrucoes[tipo] + "\n\nDADOS OPERACIONAIS:\n" + contexto;
}

/** Gera análise usando Claude Sonnet */
export async function analyzeScenario(
  snapshot: BUSnapshot,
  tipo: "briefing" | "alerta" | "semanal",
): Promise<string> {
  const prompt = buildPrompt(snapshot, tipo);

  const response = await anthropic.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 1000,
    messages:   [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
  return text;
}
