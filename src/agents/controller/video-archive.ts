/**
 * video-archive.ts
 * Sincronização do fluxo de edição de vídeo — Ana Laura:
 *
 * 1. BU "👤 Atribuído" (Ana Laura) → Tasks Edição "⬜ Em Standby"
 *    BU vira "🎬 Em Edição"
 *
 * 2. Tasks Edição "⏳ Em Aprovação" (Sincronizado=0) → BU "🔎 Revisão Interna"
 *    Marca Sincronizado=1
 *
 * 3. Tasks Edição "⏳ Em Aprovação" (Sincronizado=1) → verifica decisão do gestor na BU
 *    BU "✅ Entregue" → Tasks Edição "✅ Entregue"
 *    BU "🔄 Em Revisão" → Tasks Edição "🔄 Em Revisão" + BU volta "🎬 Em Edição" + Sincronizado=0
 *
 * 4. Tasks Edição "📦 Arquivo" → copia para Depósito Edição + deleta das Tasks
 *
 * Roda a cada 1 minuto.
 */

import { NDB, ndbList, ndbCreate, ndbUpdate, ndbDelete, extrairNome, autoAtribuirPorResponsavel } from "./nocodb-tool";
import { log } from "./logger";

const INTERVALO_MS = 1 * 60 * 1000;
const NOME_ANA     = process.env.ANA_NOME ?? "Ana Laura";

const GESTOR_PARA_RESP: Record<string, string> = {
  BU1: "Christian (Gestor)",
  BU2: "Júnior Monte (Gestor)",
};

// ─── 1. BU "👤 Atribuído" (Ana) → Tasks Edição "⬜ Em Standby" ───────────────
async function syncAtribuidos(): Promise<{ criadas: number; atualizadas: number }> {
  let criadas = 0, atualizadas = 0;

  const bancos = [
    { id: NDB.tables.tasks_bu1, origem: "BU1" },
    { id: NDB.tables.tasks_bu2, origem: "BU2" },
  ];

  for (const { id: buTable, origem } of bancos) {
    const rows = await ndbList(buTable, `(Status,eq,👤 Atribuído)`);

    for (const row of rows) {
      const responsavel = extrairNome(row["Responsável"]);
      if (!responsavel.toLowerCase().includes(NOME_ANA.toLowerCase())) continue;

      const buRowId    = row["Id"] as number;
      const tarefa     = row["Tarefa"] ?? "—";
      const cliente    = row["Cliente"];
      const prazo      = row["Prazo de Entrega"];
      const briefing   = row["Briefing Completo"];
      const linkEnt    = row["Link de entrega"];

      const campos: Record<string, any> = {
        Origem:        origem,
        "Task Origem": String(buRowId),
      };
      if (cliente)   campos["Cliente"]            = cliente;
      if (prazo)     campos["Prazo de Entrega"]   = prazo;
      if (briefing)  campos["Briefing Completo"]  = briefing;
      if (linkEnt)   campos["Link de Entrega"]    = linkEnt;

      const existe = await ndbList(NDB.tables.tasks_edicao, `(Task Origem,eq,${buRowId})~and(Origem,eq,${origem})`);

      if (existe.length > 0) {
        await ndbUpdate(NDB.tables.tasks_edicao, existe[0]["Id"], campos);
        await ndbUpdate(buTable, buRowId, { Status: "🎬 Em Edição" });
        atualizadas++;
      } else {
        await ndbCreate(NDB.tables.tasks_edicao, {
          Tarefa:       tarefa,
          Status:       "⬜ Em Standby",
          Sincronizado: false,
          ...campos,
        });
        await ndbUpdate(buTable, buRowId, { Status: "🎬 Em Edição" });
        criadas++;
        log("info", `[video-archive] nova task criada de ${origem}: "${tarefa}"`);
      }

      await new Promise(r => setTimeout(r, 300));
    }
  }

  return { criadas, atualizadas };
}

// ─── 2. Em Aprovação (Sincronizado=0) → notifica gestor na BU ────────────────
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
        log("info", `[video-archive] "${tarefa}" → gestor notificado "🔎 Revisão Interna"`);
      } catch (e: any) {
        log("warn", `[video-archive] erro ao notificar BU: ${e?.message}`);
      }
    }

    await ndbUpdate(NDB.tables.tasks_edicao, rowId, { Sincronizado: true });
    enviadas++;
    await new Promise(r => setTimeout(r, 300));
  }

  return { enviadas };
}

// ─── 3. Em Aprovação (Sincronizado=1) → verifica decisão do gestor ───────────
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
      await ndbUpdate(NDB.tables.tasks_edicao, rowId, { Status: "✅ Entregue" });
      log("info", `[video-archive] "${tarefa}" aprovada pelo gestor → "✅ Entregue"`);
      aprovadas++;
    } else if (buStatus === "🔄 Em Revisão") {
      await ndbUpdate(NDB.tables.tasks_edicao, rowId, {
        Status:       "🔄 Em Revisão",
        Sincronizado: false,
      });
      await ndbUpdate(buTable, buRowId, { Status: "🎬 Em Edição" });
      log("info", `[video-archive] "${tarefa}" devolvida para revisão da Ana Laura`);
      revisoes++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return { aprovadas, revisoes };
}

// ─── 4. Arquivo → copia para Depósito + deleta das Tasks ─────────────────────
async function arquivarTasks(): Promise<{ arquivadas: number }> {
  let arquivadas = 0;

  // Só arquiva quando Ana move explicitamente para "📦 Arquivo"
  // "✅ Entregue" significa aprovado pelo gestor mas Ana ainda não arquivou
  const rows = await ndbList(
    NDB.tables.tasks_edicao,
    `(Status,eq,📦 Arquivo)`,
  );

  for (const row of rows) {
    const rowId  = row["Id"] as number;
    const tarefa = row["Tarefa"] ?? "—";
    const origem = row["Origem"] as string;
    const hoje   = new Date().toISOString().split("T")[0];

    const deposito: Record<string, any> = {
      Tarefa:                  tarefa,
      Status:                  "📦 Arquivado",
      "Data da solicitação":   row["Prazo de Entrega"] ?? hoje,
      "Responsável Aprovação": GESTOR_PARA_RESP[origem] ?? "—",
    };

    const campos: Array<[string, string]> = [
      ["Cliente",               "Cliente"],
      ["Urgência",              "Urgência"],
      ["Complexidade",          "Complexidade"],
      ["Data de Entrega",       "Data de Entrega"],
      ["Precisou de Alteração?","Precisou de Alteração?"],
      ["Nº de Alterações",      "Nº de Alterações"],
      ["Link de Entrega",       "Link de Entrega"],
      ["Briefing Completo",     "Briefing Completo"],
    ];
    for (const [src, dst] of campos) {
      if (row[src] != null) deposito[dst] = row[src];
    }

    try {
      await ndbCreate(NDB.tables.deposito_edicao, deposito);
      log("info", `[video-archive] "${tarefa}" copiada para Depósito Edição`);
    } catch (e: any) {
      log("warn", `[video-archive] erro ao copiar para Depósito: ${e?.message}`);
      continue;
    }

    try {
      await ndbDelete(NDB.tables.tasks_edicao, rowId);
      log("info", `[video-archive] "${tarefa}" removida das Tasks Edição`);
      arquivadas++;
    } catch (e: any) {
      log("warn", `[video-archive] erro ao deletar task: ${e?.message}`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return { arquivadas };
}

// ─── Loop principal ───────────────────────────────────────────────────────────
export function startVideoArchive(): void {
  const token = process.env.NOCODB_TOKEN;
  if (!token) {
    log("warn", "[video-archive] NOCODB_TOKEN não configurado — desativado.");
    return;
  }

  async function runCycle() {
    try {
      const m = await autoAtribuirPorResponsavel(
        [NDB.tables.tasks_bu1, NDB.tables.tasks_bu2], [NOME_ANA],
      );
      if (m > 0) log("info", `[video-archive] ${m} task(s) auto-atribuídas à Ana Laura por menção`);
      const a = await syncAtribuidos();
      if (a.criadas > 0 || a.atualizadas > 0)
        log("info", `[video-archive] Atribuídos: ${a.criadas} criadas, ${a.atualizadas} atualizadas`);

      const p = await syncParaAprovacao();
      if (p.enviadas > 0)
        log("info", `[video-archive] ${p.enviadas} task(s) enviadas ao gestor (🔎 Revisão Interna)`);

      const d = await syncDecisaoGestor();
      if (d.aprovadas > 0 || d.revisoes > 0)
        log("info", `[video-archive] ${d.aprovadas} aprovadas, ${d.revisoes} em revisão`);

      const r = await arquivarTasks();
      if (r.arquivadas > 0)
        log("info", `[video-archive] ${r.arquivadas} task(s) arquivadas no Depósito Edição`);
    } catch (err: any) {
      log("error", `[video-archive] erro: ${err?.message ?? String(err)}`);
    }
  }

  setTimeout(runCycle, 40_000);
  setInterval(runCycle, INTERVALO_MS);
  log("info", "[video-archive] iniciado — sincronização a cada 1 min");
}
