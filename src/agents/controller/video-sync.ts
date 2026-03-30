/**
 * video-sync.ts
 * Fluxo de edição de vídeo com aprovação do gestor — Ana Laura — NocoDB:
 *
 * 1. BU "👤 Atribuído" (Ana Laura) → Tasks de Edição "👤 Atribuído"
 *    BU vira "🎬 Em Edição"
 *
 * 2. Tasks de Edição "⏳ Em Aprovação" → BU "🔎 Revisão Interna"
 *    Gestor analisa a entrega da Ana Laura.
 *
 * 3a. BU "✅ Entregue" (gestor aprovou) → Produções de Edição + deleta task
 * 3b. BU "🔄 Em Revisão" (gestor pediu revisão) → Tasks de Edição "🔄 Em Revisão"
 *     BU volta para "🎬 Em Edição"
 */

import { NDB, ndbList, ndbCreate, ndbUpdate, ndbDelete, atualizarSLA } from "./nocodb-tool";
import { log } from "./logger";

const INTERVALO_MS = 1 * 60 * 1000;
const NOME_ANA     = process.env.ANA_NOME ?? "Ana Laura";

const PRIO_MAP: Record<string, string> = {
  "🔴 P0 — Emergência": "🔴 P0 — Emergência",
  "🟠 P1 — Alta":       "🟠 P1 — Alta",
  "🟡 P2 — Normal":     "🟡 P2 — Normal",
};
const URG_MAP: Record<string, string> = {
  "🔴 P0 — Emergência": "Urgente",
  "🟠 P1 — Alta":       "Urgente",
  "🟡 P2 — Normal":     "Média",
  "🟢 P3 — Baixa":      "Suave",
};

// ─── 1. BU "👤 Atribuído" → Tasks de Edição ──────────────────────────────────
async function syncAtribuidos(): Promise<{ criadas: number; atualizadas: number }> {
  let criadas = 0, atualizadas = 0;

  const bancos = [
    { id: NDB.tables.tasks_bu1, origem: "BU1" },
    { id: NDB.tables.tasks_bu2, origem: "BU2" },
  ];

  for (const { id: buTable, origem } of bancos) {
    const rows = await ndbList(buTable, `(Status,eq,👤 Atribuído)`);

    for (const row of rows) {
      const responsavel: string = row["Responsável"] ?? "";
      if (!responsavel.toLowerCase().includes(NOME_ANA.toLowerCase())) continue;

      const buRowId    = row["Id"] as number;
      const tarefa     = row["Tarefa"] ?? "—";
      const cliente    = row["Cliente"];
      const prazo      = row["Prazo de Entrega"];
      const prioridade = row["Prioridade"];
      const roteiro    = row["Briefing Completo"];
      const linkEnt    = row["Link de entrega"];

      const campos: Record<string, any> = {
        Origem:        origem,
        "Task Origem": String(buRowId),
      };
      if (cliente)    campos["Cliente"]         = cliente;
      if (prazo)      campos["Prazo de Entrega"] = prazo;
      if (roteiro)    campos["Roteiro"]           = roteiro;
      if (linkEnt)    campos["Link de Entrega"]   = linkEnt;
      if (prioridade) {
        campos["Prioridade"] = PRIO_MAP[prioridade] ?? prioridade;
        const urg = URG_MAP[prioridade];
        if (urg) campos["Urgência"] = urg;
      }

      const existe = await ndbList(NDB.tables.tasks_edicao, `(Task Origem,eq,${buRowId})`);

      if (existe.length > 0) {
        await ndbUpdate(NDB.tables.tasks_edicao, existe[0]["Id"], campos);
        await ndbUpdate(buTable, buRowId, { Status: "🎬 Em Edição" });
        atualizadas++;
      } else {
        await ndbCreate(NDB.tables.tasks_edicao, {
          Tarefa:       tarefa,
          Status:       "👤 Atribuído",
          Sincronizado: false,
          ...campos,
        });
        await ndbUpdate(buTable, buRowId, { Status: "🎬 Em Edição" });
        criadas++;
        log("info", `[video-sync] nova task criada de ${origem}: "${tarefa}"`);
      }

      await new Promise(r => setTimeout(r, 300));
    }
  }

  return { criadas, atualizadas };
}

// ─── 2. Tasks de Edição "⏳ Em Aprovação" → BU "🔎 Revisão Interna" ──────────
async function syncParaAprovacao(): Promise<{ enviadas: number }> {
  let enviadas = 0;

  const rows = await ndbList(
    NDB.tables.tasks_edicao,
    `(Status,eq,⏳ Em Aprovação)~and(Sincronizado,eq,0)`,
  );

  for (const row of rows) {
    const rowId        = row["Id"] as number;
    const tarefa       = row["Tarefa"] ?? "—";
    const taskOrigemId = row["Task Origem"];
    const origem       = row["Origem"] as string;

    if (taskOrigemId) {
      const buRowId = Number(taskOrigemId);
      const buTable = origem === "BU1" ? NDB.tables.tasks_bu1 : NDB.tables.tasks_bu2;
      try {
        await ndbUpdate(buTable, buRowId, { Status: "🔎 Revisão Interna" });
        log("info", `[video-sync] "${tarefa}" enviada para aprovação do gestor`);
      } catch (e: any) {
        log("warn", `[video-sync] erro ao notificar BU: ${e?.message}`);
      }
    }

    await ndbUpdate(NDB.tables.tasks_edicao, rowId, { Sincronizado: true });
    enviadas++;
    await new Promise(r => setTimeout(r, 300));
  }

  return { enviadas };
}

// ─── 3. Decisão do gestor na BU ───────────────────────────────────────────────
async function syncDecisaoGestor(): Promise<{ aprovadas: number; revisoes: number }> {
  let aprovadas = 0, revisoes = 0;

  const rows = await ndbList(
    NDB.tables.tasks_edicao,
    `(Status,eq,⏳ Em Aprovação)~and(Sincronizado,eq,1)`,
  );

  for (const row of rows) {
    const rowId        = row["Id"] as number;
    const tarefa       = row["Tarefa"] ?? "—";
    const taskOrigemId = row["Task Origem"];
    const origem       = row["Origem"] as string;
    if (!taskOrigemId) continue;

    const buRowId = Number(taskOrigemId);
    const buTable = origem === "BU1" ? NDB.tables.tasks_bu1 : NDB.tables.tasks_bu2;

    const buRows = await ndbList(buTable, `(Id,eq,${buRowId})`);
    if (buRows.length === 0) continue;
    const buStatus = buRows[0]["Status"] as string;

    if (buStatus === "✅ Entregue") {
      await _finalizarTask(row, buTable, buRowId);
      aprovadas++;
    } else if (buStatus === "🔄 Em Revisão") {
      await ndbUpdate(NDB.tables.tasks_edicao, rowId, {
        Status:       "🔄 Em Revisão",
        Sincronizado: false,
      });
      await ndbUpdate(buTable, buRowId, { Status: "🎬 Em Edição" });
      log("info", `[video-sync] "${tarefa}" devolvida para revisão da Ana Laura`);
      revisoes++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return { aprovadas, revisoes };
}

async function _finalizarTask(row: any, buTable: string, buRowId: number): Promise<void> {
  const rowId     = row["Id"] as number;
  const tarefa    = row["Tarefa"] ?? "—";
  const cliente   = row["Cliente"];
  const urg       = row["Urgência"];
  const comp      = row["Complexidade"];
  const prazoEnt  = row["Data de Entrega"];
  const rev       = row["Precisou de Alteração?"];
  const nRev      = row["Nº de Alterações"];
  const link      = row["Link de Entrega"];
  const roteiro   = row["Roteiro"];
  const aprovNome = row["Responsável Aprovação"];
  const hoje      = new Date().toISOString().split("T")[0];

  const prod: Record<string, any> = {
    Tarefa: tarefa,
    Status: "Entregue",
    Data:   prazoEnt ?? hoje,
  };
  if (cliente)   prod["Cliente"]                = cliente;
  if (urg)       prod["Urgência"]               = urg;
  if (comp)      prod["Complexidade"]           = comp;
  if (prazoEnt)  prod["Data de Entrega"]        = prazoEnt;
  if (rev)       prod["Precisou de Alteração?"] = rev;
  if (nRev)      prod["Nº de Alterações"]       = nRev;
  if (link)      prod["Link de Entrega"]        = link;
  if (roteiro)   prod["Roteiro"]                = roteiro;
  if (aprovNome) prod["Responsável Aprovação"]  = aprovNome;

  try {
    await ndbCreate(NDB.tables.deposito_edicao, prod);
    log("info", `[video-sync] "${tarefa}" copiada para Depósito de Edição`);
  } catch (e: any) {
    log("warn", `[video-sync] erro ao copiar para Produções: ${e?.message}`);
  }

  try {
    await ndbDelete(NDB.tables.tasks_edicao, rowId);
    log("info", `[video-sync] "${tarefa}" finalizada e removida das Tasks de Edição`);
  } catch (e: any) {
    log("warn", `[video-sync] erro ao deletar task: ${e?.message}`);
  }
}

// ─── Loop principal ───────────────────────────────────────────────────────────
export function startVideoSync(): void {
  const token = process.env.NOCODB_TOKEN;
  if (!token) {
    log("warn", "[video-sync] NOCODB_TOKEN não configurado — sync desativado.");
    return;
  }

  async function runCycle() {
    try {
      log("info", "[video-sync] iniciando ciclo...");
      const a = await syncAtribuidos();
      log("info", `[video-sync] Atribuídos: ${a.criadas} criadas, ${a.atualizadas} atualizadas`);
      const p = await syncParaAprovacao();
      log("info", `[video-sync] Em Aprovação: ${p.enviadas} enviadas ao gestor`);
      const d = await syncDecisaoGestor();
      log("info", `[video-sync] Decisões: ${d.aprovadas} aprovadas, ${d.revisoes} em revisão`);
      await atualizarSLA([NDB.tables.tasks_edicao]);
    } catch (err: any) {
      log("error", `[video-sync] erro no ciclo: ${err?.message ?? String(err)}`);
    }
  }

  setTimeout(runCycle, 35_000);
  setInterval(runCycle, INTERVALO_MS);
  log("info", `[video-sync] sincronização iniciada — intervalo: ${INTERVALO_MS / 60000} min`);
}
