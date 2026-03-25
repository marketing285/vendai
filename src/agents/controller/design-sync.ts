/**
 * design-sync.ts
 * Fluxo completo de design (polling a cada 1 min) — usando NocoDB:
 *
 * 1. Tasks BU1/BU2 → Tasks de Design
 *    Rows com Status "👤 Atribuído" e Responsável = Bruna são copiadas para
 *    Tasks de Design. O row na BU passa para "🎨 Em Design".
 *
 * 2. Tasks de Design "✅ Entregue" → BU de origem + Produções de Design
 *    Quando Bruna marca "✅ Entregue":
 *    - Row original na BU volta para "🔎 Revisão Interna"
 *    - Cópia enviada para Produções de Design (histórico)
 *    - Row de Design deletado
 */

import { NDB, ndbList, ndbCreate, ndbUpdate, ndbDelete } from "./nocodb-tool";
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

// ─── 1. BU → Tasks de Design ──────────────────────────────────────────────────
async function syncBUparaTasks(): Promise<{ criadas: number; atualizadas: number }> {
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

      // Verifica se já existe em Tasks de Design
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

// ─── 2. Tasks de Design "✅ Entregue" → BU + Produções ───────────────────────
async function syncEntregues(): Promise<{ processadas: number }> {
  let processadas = 0;

  const rows = await ndbList(
    NDB.tables.tasks_design,
    `(Status,eq,✅ Entregue)~and(Sincronizado,eq,false)`,
  );

  for (const row of rows) {
    const rowId        = row["Id"] as number;
    const tarefa       = row["Tarefa"] ?? "—";
    const cliente      = row["Cliente"];
    const urg          = row["Urgência"];
    const comp         = row["Complexidade"];
    const prazoEnt     = row["Data de Entrega"];
    const rev          = row["Precisou de Alteração?"];
    const nRev         = row["Nº de Alterações"];
    const link         = row["Link de Entrega"];
    const briefing     = row["Briefing"];
    const aprovNome    = row["Responsável Aprovação"];
    const taskOrigemId = row["Task Origem"];
    const hoje         = new Date().toISOString().split("T")[0];

    // Cópia para Produções de Design
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
    if (briefing)  prod["Briefing"]               = briefing;
    if (aprovNome) prod["Responsável Aprovação"]  = aprovNome;

    try {
      await ndbCreate(NDB.tables.producoes_design, prod);
      log("info", `[design-sync] "${tarefa}" copiada para Produções de Design`);
    } catch (e: any) {
      log("warn", `[design-sync] erro ao copiar para Produções: ${e?.message}`);
    }

    // Devolve para BU de origem
    if (taskOrigemId) {
      const buRowId = Number(taskOrigemId);
      const origem  = row["Origem"] as string;
      const buTable = origem === "BU1" ? NDB.tables.tasks_bu1 : NDB.tables.tasks_bu2;
      try {
        await ndbUpdate(buTable, buRowId, { Status: "🔎 Revisão Interna" });
        log("info", `[design-sync] "${tarefa}" devolvida à BU (🔎 Revisão Interna)`);
      } catch (e: any) {
        log("warn", `[design-sync] erro ao devolver à BU: ${e?.message}`);
      }
    }

    // Remove task de design
    try {
      await ndbDelete(NDB.tables.tasks_design, rowId);
    } catch (e: any) {
      log("warn", `[design-sync] erro ao deletar task de design: ${e?.message}`);
    }

    processadas++;
    await new Promise(r => setTimeout(r, 300));
  }

  return { processadas };
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
      const bu = await syncBUparaTasks();
      log("info", `[design-sync] BU→Design: ${bu.criadas} criadas, ${bu.atualizadas} atualizadas`);
      const en = await syncEntregues();
      log("info", `[design-sync] Entregues: ${en.processadas} devolvidas à BU + copiadas para Produções`);
    } catch (err: any) {
      log("error", `[design-sync] erro no ciclo: ${err?.message ?? String(err)}`);
    }
  }

  setTimeout(runCycle, 30_000);
  setInterval(runCycle, INTERVALO_MS);

  log("info", `[design-sync] sincronização iniciada — intervalo: ${INTERVALO_MS / 60000} min`);
}
