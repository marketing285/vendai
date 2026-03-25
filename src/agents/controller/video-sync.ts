/**
 * video-sync.ts
 * Fluxo de edição de vídeo — Ana Laura (polling a cada 1 min) — usando NocoDB:
 *
 * 1. Tasks BU1/BU2 → Tasks de Edição
 *    Rows com Status "👤 Atribuído" e Responsável = Ana Laura são copiados para
 *    Tasks de Edição. O row na BU passa para "🎬 Em Edição".
 *
 * 2. Tasks de Edição "✅ Entregue" → BU de origem + Produções de Edição
 *    Quando Ana Laura marca "✅ Entregue":
 *    - Row original na BU volta para "🔎 Revisão Interna"
 *    - Cópia enviada para Produções de Edição (histórico/pagamento)
 *    - Row de Edição deletado
 */

import { NDB, ndbList, ndbCreate, ndbUpdate, ndbDelete } from "./nocodb-tool";
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

// ─── 1. BU → Tasks de Edição ──────────────────────────────────────────────────
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
      if (!responsavel.toLowerCase().includes(NOME_ANA.toLowerCase())) continue;

      const buRowId    = row["Id"] as number;
      const tarefa     = row["Tarefa"] ?? "—";
      const cliente    = row["Cliente"];
      const prazo      = row["Prazo de Entrega"];
      const prioridade = row["Prioridade"];
      const roteiro    = row["Briefing Completo"]; // Briefing Completo → Roteiro
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

      // Verifica se já existe em Tasks de Edição
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

// ─── 2. Tasks de Edição "✅ Entregue" → BU + Produções ───────────────────────
async function syncEntregues(): Promise<{ processadas: number }> {
  let processadas = 0;

  const rows = await ndbList(
    NDB.tables.tasks_edicao,
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
    const roteiro      = row["Roteiro"];
    const aprovNome    = row["Responsável Aprovação"];
    const taskOrigemId = row["Task Origem"];
    const hoje         = new Date().toISOString().split("T")[0];

    // Cópia para Produções de Edição
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
      await ndbCreate(NDB.tables.producoes_edicao, prod);
      log("info", `[video-sync] "${tarefa}" copiada para Produções de Edição`);
    } catch (e: any) {
      log("warn", `[video-sync] erro ao copiar para Produções: ${e?.message}`);
    }

    // Devolve para BU de origem
    if (taskOrigemId) {
      const buRowId = Number(taskOrigemId);
      const origem  = row["Origem"] as string;
      const buTable = origem === "BU1" ? NDB.tables.tasks_bu1 : NDB.tables.tasks_bu2;
      try {
        await ndbUpdate(buTable, buRowId, { Status: "🔎 Revisão Interna" });
        log("info", `[video-sync] "${tarefa}" devolvida à BU (🔎 Revisão Interna)`);
      } catch (e: any) {
        log("warn", `[video-sync] erro ao devolver à BU: ${e?.message}`);
      }
    }

    // Remove task de edição
    try {
      await ndbDelete(NDB.tables.tasks_edicao, rowId);
    } catch (e: any) {
      log("warn", `[video-sync] erro ao deletar task de edição: ${e?.message}`);
    }

    processadas++;
    await new Promise(r => setTimeout(r, 300));
  }

  return { processadas };
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
      const bu = await syncBUparaTasks();
      log("info", `[video-sync] BU→Edição: ${bu.criadas} criadas, ${bu.atualizadas} atualizadas`);
      const en = await syncEntregues();
      log("info", `[video-sync] Entregues: ${en.processadas} devolvidas à BU + copiadas para Produções`);
    } catch (err: any) {
      log("error", `[video-sync] erro no ciclo: ${err?.message ?? String(err)}`);
    }
  }

  setTimeout(runCycle, 35_000);
  setInterval(runCycle, INTERVALO_MS);

  log("info", `[video-sync] sincronização iniciada — intervalo: ${INTERVALO_MS / 60000} min`);
}
