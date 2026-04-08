/**
 * nocodb-sync.ts
 * Criação de tasks no NocoDB a partir de demandas recebidas pelo CS Supremo.
 *
 * Roteamento por área:
 *   design  → tasks_design  (Bruna)
 *   video   → tasks_edicao  (Ana Laura)
 *   demais  → tasks_bu1 ou tasks_bu2 (baseado no grupo WhatsApp)
 */

import { NDB, ndbCreate } from "../controller/nocodb-tool";
import { Classification } from "./classifier";

// IDs dos grupos WhatsApp mapeados para cada BU (configurar via env)
// Ex: BU1_GROUP_IDS="grupoid1@g.us,grupoid2@g.us"
const BU1_GROUPS = (process.env.BU1_GROUP_IDS ?? "").split(",").filter(Boolean);
const BU2_GROUPS = (process.env.BU2_GROUP_IDS ?? "").split(",").filter(Boolean);

function getBUTable(groupId: string): string {
  if (BU1_GROUPS.some(g => groupId.includes(g))) return NDB.tables.tasks_bu1;
  if (BU2_GROUPS.some(g => groupId.includes(g))) return NDB.tables.tasks_bu2;
  return NDB.tables.tasks_bu1; // fallback
}

function getBUOrigem(groupId: string): string {
  if (BU2_GROUPS.some(g => groupId.includes(g))) return "BU2";
  return "BU1";
}

// Áreas que têm tabela própria (executora direta)
const AREA_TABLE: Partial<Record<Classification["area"], string>> = {
  design: NDB.tables.tasks_design,
  video:  NDB.tables.tasks_edicao,
};

const PRIORITY_MAP: Record<string, string> = {
  P0: "🔴 P0 — Emergência",
  P1: "🟠 P1 — Alta",
  P2: "🟡 P2 — Normal",
};

export async function createNocoDBTask(params: {
  protocolId: string;
  title: string;
  classification: Classification;
  sourceMessage: string;
  groupId: string;
  deadline: Date;
}): Promise<string | null> {
  const { protocolId, title, classification, sourceMessage, groupId, deadline } = params;

  const prazo     = deadline.toISOString().split("T")[0];
  const prioridade = PRIORITY_MAP[classification.priority] ?? "🟡 P2 — Normal";
  const tarefa    = `[${protocolId}] ${title}`;

  const targetTable = AREA_TABLE[classification.area] ?? getBUTable(groupId);

  let fields: Record<string, any>;

  if (targetTable === NDB.tables.tasks_design) {
    fields = {
      Tarefa:              tarefa,
      Status:              "👤 Atribuído",
      Prioridade:          prioridade,
      "Prazo de Entrega":  prazo,
      Briefing:            sourceMessage,
      Cliente:             classification.clientName !== "Desconhecido" ? classification.clientName : undefined,
      Sincronizado:        false,
      Origem:              getBUOrigem(groupId),
    };
  } else if (targetTable === NDB.tables.tasks_edicao) {
    fields = {
      Tarefa:              tarefa,
      Status:              "⬜ Em Standby",
      "Prazo de Entrega":  prazo,
      "Briefing Completo": sourceMessage,
      Cliente:             classification.clientName !== "Desconhecido" ? classification.clientName : undefined,
      Sincronizado:        false,
      Origem:              getBUOrigem(groupId),
    };
  } else {
    // BU1 ou BU2
    fields = {
      Tarefa:              tarefa,
      Status:              "👤 Atribuído",
      Prioridade:          prioridade,
      "Prazo de Entrega":  prazo,
      "Briefing Completo": sourceMessage,
      Cliente:             classification.clientName !== "Desconhecido" ? classification.clientName : undefined,
      Responsável:         classification.assignee,
    };
  }

  // Remove campos undefined
  Object.keys(fields).forEach(k => fields[k] === undefined && delete fields[k]);

  try {
    const row = await ndbCreate(targetTable, fields);
    const rowId = String(row?.Id ?? "");
    console.log(`[nocodb-sync] Task criada — tabela: ${targetTable}, ID: ${rowId}, protocolo: ${protocolId}`);
    return rowId;
  } catch (err: any) {
    console.error("[nocodb-sync] Erro ao criar task:", err?.message);
    return null;
  }
}
