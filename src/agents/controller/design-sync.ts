/**
 * design-sync.ts
 * Fluxo completo de design com aprovação do gestor — NocoDB:
 *
 * 1. BU "👤 Atribuído" (Bruna) → Tasks de Design "👤 Atribuído"
 *    BU vira "🎨 Em Design"
 *
 * 2. Tasks de Design "⏳ Em Aprovação" → BU "🔎 Revisão Interna"
 *    Gestor analisa a entrega da Bruna.
 *
 * 3a. BU "✅ Entregue" (gestor aprovou) → Produções de Design + deleta task
 * 3b. BU "🔄 Em Revisão" (gestor pediu revisão) → Tasks de Design "🔄 Em Revisão"
 *     BU volta para "🎨 Em Design"
 */

import { NDB, ndbList, ndbCreate, ndbUpdate, ndbDelete, atualizarSLA, atualizarRelatorios } from "./nocodb-tool";
import { log } from "./logger";

const INTERVALO_MS = 1 * 60 * 1000;
const NOME_BRUNA   = process.env.BRUNA_NOME ?? "Bruna";

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

// ─── 1. BU "👤 Atribuído" → Tasks de Design ──────────────────────────────────
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
      if (!responsavel.toLowerCase().includes(NOME_BRUNA.toLowerCase())) continue;

      const buRowId    = row["Id"] as number;
      const tarefa     = row["Tarefa"] ?? "—";
      const cliente    = row["Cliente"];
      const prazo      = row["Prazo de Entrega"];
      const prioridade = row["Prioridade"];
      const briefing   = row["Briefing Completo"];
      const linkEnt    = row["Link de entrega"];

      const campos: Record<string, any> = {
        Origem:        origem,
        "Task Origem": String(buRowId),
      };
      if (cliente)    campos["Cliente"]         = cliente;
      if (prazo)      campos["Prazo de Entrega"] = prazo;
      if (briefing)   campos["Briefing"]          = briefing;
      if (linkEnt)    campos["Link de Entrega"]   = linkEnt;
      if (prioridade) {
        campos["Prioridade"] = PRIO_MAP[prioridade] ?? prioridade;
        const urg = URG_MAP[prioridade];
        if (urg) campos["Urgência"] = urg;
      }

      const existe = await ndbList(NDB.tables.tasks_design, `(Task Origem,eq,${buRowId})`);

      if (existe.length > 0) {
        await ndbUpdate(NDB.tables.tasks_design, existe[0]["Id"], campos);
        await ndbUpdate(buTable, buRowId, { Status: "🎨 Em Design" });
        atualizadas++;
      } else {
        await ndbCreate(NDB.tables.tasks_design, {
          Tarefa:       tarefa,
          Status:       "👤 Atribuído",
          Sincronizado: false,
          ...campos,
        });
        await ndbUpdate(buTable, buRowId, { Status: "🎨 Em Design" });
        criadas++;
        log("info", `[design-sync] nova task criada de ${origem}: "${tarefa}"`);
      }

      await new Promise(r => setTimeout(r, 300));
    }
  }

  return { criadas, atualizadas };
}

// ─── 2. Tasks de Design "⏳ Em Aprovação" → BU "🔎 Revisão Interna" ──────────
async function syncParaAprovacao(): Promise<{ enviadas: number }> {
  let enviadas = 0;

  // Sincronizado=false significa que ainda não notificou o gestor
  const rows = await ndbList(
    NDB.tables.tasks_design,
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
        log("info", `[design-sync] "${tarefa}" enviada para aprovação do gestor`);
      } catch (e: any) {
        log("warn", `[design-sync] erro ao notificar BU: ${e?.message}`);
      }
    }

    // Marca como notificado (Sincronizado=true) para aguardar decisão do gestor
    await ndbUpdate(NDB.tables.tasks_design, rowId, { Sincronizado: true });
    enviadas++;
    await new Promise(r => setTimeout(r, 300));
  }

  return { enviadas };
}

// ─── 3. Decisão do gestor na BU ───────────────────────────────────────────────
// Monitora tasks de design aguardando aprovação (Sincronizado=true, Status=⏳ Em Aprovação)
// e verifica o status da BU de origem.
async function syncDecisaoGestor(): Promise<{ aprovadas: number; revisoes: number }> {
  let aprovadas = 0, revisoes = 0;

  const rows = await ndbList(
    NDB.tables.tasks_design,
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

    // Busca o status atual da BU
    const buRows = await ndbList(buTable, `(Id,eq,${buRowId})`);
    if (buRows.length === 0) continue;
    const buStatus = buRows[0]["Status"] as string;

    if (buStatus === "✅ Entregue") {
      // Gestor aprovou — copia para Produções e finaliza
      await _finalizarTask(row, buTable, buRowId);
      aprovadas++;

    } else if (buStatus === "🔄 Em Revisão") {
      // Gestor pediu revisão — devolve para Bruna
      await ndbUpdate(NDB.tables.tasks_design, rowId, {
        Status:       "🔄 Em Revisão",
        Sincronizado: false,
      });
      await ndbUpdate(buTable, buRowId, { Status: "🎨 Em Design" });
      log("info", `[design-sync] "${tarefa}" devolvida para revisão da Bruna`);
      revisoes++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return { aprovadas, revisoes };
}

const GESTOR_MAP: Record<string, string> = {
  BU1: "Christian (Gestor)",
  BU2: "Júnior Monte (Gestor)",
};

async function _finalizarTask(row: any, buTable: string, buRowId: number): Promise<void> {
  const rowId      = row["Id"] as number;
  const tarefa     = row["Tarefa"] ?? "—";
  const cliente    = row["Cliente"];
  const urg        = row["Urgência"];
  const comp       = row["Complexidade"];
  const prazoEnt   = row["Data de Entrega"] ?? row["Prazo de Entrega"];
  const rev        = row["Precisou de Alteração?"];
  const nRev       = row["Nº de Alterações"];
  const qtd        = row["Quantidade"];
  const link       = row["Link de Entrega"];
  const briefing   = row["Briefing"];
  const origem     = row["Origem"] as string;
  const gestor     = GESTOR_MAP[origem] ?? "Christian (Gestor)";
  const hoje       = new Date().toISOString().split("T")[0];

  const prod: Record<string, any> = {
    Tarefa:                 tarefa,
    Status:                 "Entregue",
    Data:                   prazoEnt ?? hoje,
    "Responsável Aprovação": gestor,
  };
  if (cliente)   prod["Cliente"]                = cliente;
  if (urg)       prod["Urgência"]               = urg;
  if (comp)      prod["Complexidade"]           = comp;
  if (prazoEnt)  prod["Data de Entrega"]        = prazoEnt;
  if (rev)       prod["Precisou de Alteração?"] = rev;
  if (nRev)      prod["Nº de Alterações"]       = nRev;
  if (qtd)       prod["Quantidade"]             = qtd;
  if (link)      prod["Link de Entrega"]        = link;
  if (briefing)  prod["Briefing"]               = briefing;

  try {
    await ndbCreate(NDB.tables.deposito_design, prod);
    log("info", `[design-sync] "${tarefa}" copiada para Produções de Design`);
  } catch (e: any) {
    log("warn", `[design-sync] erro ao copiar para Produções: ${e?.message}`);
  }

  // Remove task de design
  try {
    await ndbDelete(NDB.tables.tasks_design, rowId);
    log("info", `[design-sync] "${tarefa}" finalizada e removida das Tasks de Design`);
  } catch (e: any) {
    log("warn", `[design-sync] erro ao deletar task: ${e?.message}`);
  }
}

// ─── Loop principal ───────────────────────────────────────────────────────────
export function startDesignSync(): void {
  const token = process.env.NOCODB_TOKEN;
  if (!token) {
    log("warn", "[design-sync] NOCODB_TOKEN não configurado — sync desativado.");
    return;
  }

  async function runCycle() {
    try {
      log("info", "[design-sync] iniciando ciclo...");
      const a = await syncAtribuidos();
      log("info", `[design-sync] Atribuídos: ${a.criadas} criadas, ${a.atualizadas} atualizadas`);
      const p = await syncParaAprovacao();
      log("info", `[design-sync] Em Aprovação: ${p.enviadas} enviadas ao gestor`);
      const d = await syncDecisaoGestor();
      log("info", `[design-sync] Decisões: ${d.aprovadas} aprovadas, ${d.revisoes} em revisão`);
      await atualizarSLA([NDB.tables.tasks_bu1, NDB.tables.tasks_bu2, NDB.tables.tasks_design]);
      await atualizarRelatorios([NDB.tables.clientes_bu1, NDB.tables.clientes_bu2]);
    } catch (err: any) {
      log("error", `[design-sync] erro no ciclo: ${err?.message ?? String(err)}`);
    }
  }

  setTimeout(runCycle, 30_000);
  setInterval(runCycle, INTERVALO_MS);
  log("info", `[design-sync] sincronização iniciada — intervalo: ${INTERVALO_MS / 60000} min`);
}
