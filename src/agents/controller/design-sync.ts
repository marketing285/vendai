/**
 * design-sync.ts
 * Fluxo completo de design com aprovação do gestor — NocoDB:
 *
 * FLUXO A — Gestor atribui à Bruna via BU:
 * 1. BU "👤 Atribuído" (Bruna) → Tasks de Design "👤 Atribuído"
 *    BU vira "🎨 Em Design"
 *
 * FLUXO B — Bruna cria task por iniciativa própria:
 * 1. Bruna cria task direto nas Tasks Design com "Gestor Responsável" preenchido
 *    (sem Task Origem). Quando muda para "⏳ Em Aprovação", o sistema cria
 *    uma task na BU do gestor em "🔎 Revisão Interna" e vincula.
 *
 * FLUXO COMUM (A e B):
 * 2. Tasks de Design "⏳ Em Aprovação" → BU "🔎 Revisão Interna"
 *    Gestor analisa a entrega da Bruna.
 *
 * 3a. BU "✅ Entregue" (gestor aprovou) → Depósito de Design + deleta task
 * 3b. BU "🔄 Em Revisão" (gestor pediu revisão) → Tasks de Design "🔄 Em Revisão"
 *     BU volta para "🎨 Em Design"
 */

import { NDB, ndbList, ndbCreate, ndbUpdate, ndbDelete, atualizarSLA, atualizarRelatorios, extrairNome, autoAtribuirPorResponsavel } from "./nocodb-tool";
import { log } from "./logger";

const INTERVALO_MS = 1 * 60 * 1000;
const NOME_BRUNA   = process.env.BRUNA_NOME ?? "Bruna";

// BU "Formato" → Tasks Design "Tipo"
const FORMATO_MAP: Record<string, string> = {
  "Foto":        "Feed",
  "Carrossel":   "Carrosel",
  "Reels":       "Reels",
  "Youtube":     "Outros",
  "LinkedIn":    "Outros",
  "Blog":        "Outros",
  "Arte Gráfica":"Arte Estática",
  "Extra":       "Outros",
};

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
    { id: NDB.tables.tasks_bu3, origem: "BU3" },
  ];

  for (const { id: buTable, origem } of bancos) {
    const rows = await ndbList(buTable, `(Status,eq,👤 Atribuído)`);

    for (const row of rows) {
      const responsavel = extrairNome(row["Responsável"]);
      if (!responsavel.toLowerCase().includes(NOME_BRUNA.toLowerCase())) {
        log("info", `[design-sync] task "${row["Tarefa"]}" ignorada — responsável: "${responsavel}"`);
        continue;
      }

      const buRowId    = row["Id"] as number;
      const tarefa     = row["Tarefa"] ?? "—";
      const cliente    = row["Cliente"];
      const prazo      = row["Prazo de Entrega"];
      const prioridade = row["Prioridade"];
      const briefing   = row["Briefing Completo"];
      const linkEnt    = row["Link de entrega"];
      const formato    = row["Formato"];

      const campos: Record<string, any> = {
        Origem:        origem,
        "Task Origem": String(buRowId),
      };
      if (cliente)    campos["Cliente"]         = cliente;
      if (prazo)      campos["Prazo de Entrega"] = prazo;
      if (briefing)   campos["Briefing"]          = briefing;
      if (linkEnt)    campos["Link de Entrega"]   = linkEnt;
      if (formato)    campos["Tipo"]              = FORMATO_MAP[formato] ?? formato;
      if (prioridade) {
        campos["Prioridade"] = PRIO_MAP[prioridade] ?? prioridade;
        const urg = URG_MAP[prioridade];
        if (urg) campos["Urgência"] = urg;
      }

      const existe = await ndbList(NDB.tables.tasks_design, `(Task Origem,eq,${buRowId})~and(Origem,eq,${origem})`);

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

    // Fluxo B (sem Task Origem) é tratado por syncAutoIniciadas — não processar aqui
    if (!taskOrigemId) continue;

    const buRowId = Number(taskOrigemId);
    const buTable = buTableFromOrigem(origem);
    try {
      await ndbUpdate(buTable, buRowId, { Status: "🔎 Revisão Interna" });
      log("info", `[design-sync] "${tarefa}" enviada para aprovação do gestor`);
    } catch (e: any) {
      log("warn", `[design-sync] erro ao notificar BU: ${e?.message}`);
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
    const buTable = buTableFromOrigem(origem);

    // Busca o status atual da BU
    const buRows = await ndbList(buTable, `(Id,eq,${buRowId})`);
    if (buRows.length === 0) continue;
    const buStatus = buRows[0]["Status"] as string;

    if (buStatus === "✅ Entregue") {
      // Gestor aprovou — copia para Produções e finaliza
      await _finalizarTask(row, buTable, buRowId);
      aprovadas++;

    } else if (buStatus !== "🔎 Revisão Interna" && buStatus !== "🔄 Em Revisão") {
      // BU saiu de Revisão Interna sem decisão (ex: gestor voltou para Em Design)
      // e Bruna voltou a marcar Em Aprovação — re-notifica o gestor
      try {
        await ndbUpdate(buTable, buRowId, { Status: "🔎 Revisão Interna" });
        log("info", `[design-sync] "${tarefa}" re-enviada para aprovação (BU estava em "${buStatus}")`);
      } catch (e: any) {
        log("warn", `[design-sync] erro ao re-notificar BU: ${e?.message}`);
      }

    } else if (buStatus === "🔄 Em Revisão") {
      // Gestor pediu revisão — devolve para Bruna com todos os campos atualizados da BU
      const bu = buRows[0];
      const updateFields: Record<string, any> = {
        Status:       "🔄 Em Revisão",
        Sincronizado: false,
      };
      if (bu["Briefing Completo"]) updateFields["Briefing"]          = bu["Briefing Completo"];
      if (bu["Cliente"])           updateFields["Cliente"]           = bu["Cliente"];
      if (bu["Prazo de Entrega"])  updateFields["Prazo de Entrega"]  = bu["Prazo de Entrega"];
      if (bu["Formato"])           updateFields["Tipo"]              = FORMATO_MAP[bu["Formato"]] ?? bu["Formato"];
      if (bu["Link de entrega"])   updateFields["Link de Entrega"]   = bu["Link de entrega"];
      if (bu["Prioridade"]) {
        updateFields["Prioridade"] = PRIO_MAP[bu["Prioridade"]] ?? bu["Prioridade"];
        const urg = URG_MAP[bu["Prioridade"]];
        if (urg) updateFields["Urgência"] = urg;
      }
      await ndbUpdate(NDB.tables.tasks_design, rowId, updateFields);
      await ndbUpdate(buTable, buRowId, { Status: "🎨 Em Design" });
      log("info", `[design-sync] "${tarefa}" devolvida para revisão da Bruna`);
      revisoes++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return { aprovadas, revisoes };
}

// Origem → tabela NocoDB
function buTableFromOrigem(origem: string): string {
  if (origem === "BU1") return NDB.tables.tasks_bu1;
  if (origem === "BU2") return NDB.tables.tasks_bu2;
  return NDB.tables.tasks_bu3;
}

// Gestor selecionado pela Bruna → BU e Origem internos
const GESTOR_PARA_BU: Record<string, string> = {
  "Christian":          NDB.tables.tasks_bu1,
  "Armando Cavazana":   NDB.tables.tasks_bu2,
  "Bruna Benevides":    NDB.tables.tasks_bu3,
};
const GESTOR_PARA_ORIGEM: Record<string, string> = {
  "Christian":          "BU1",
  "Armando Cavazana":   "BU2",
  "Bruna Benevides":    "BU3",
};

// Origem interna → nome do gestor para o Depósito
const GESTOR_MAP: Record<string, string> = {
  BU1: "Christian (Gestor)",
  BU2: "Armando Cavazana (Gestor)",
  BU3: "Bruna Benevides (Gestora)",
};

// ─── 0. Tasks criadas pela Bruna (sem Task Origem) → cria task na BU ──────────
async function syncAutoIniciadas(): Promise<{ criadas: number }> {
  let criadas = 0;

  // Tasks sem Task Origem e em aprovação (Sincronizado=0 ou =1 sem Task Origem — ambos precisam ser criados na BU)
  const pendentes0 = await ndbList(NDB.tables.tasks_design, `(Status,eq,⏳ Em Aprovação)~and(Sincronizado,eq,0)~and(Task Origem,isblank,)`);
  const pendentes1 = await ndbList(NDB.tables.tasks_design, `(Status,eq,⏳ Em Aprovação)~and(Sincronizado,eq,1)~and(Task Origem,isblank,)`);
  const rows = [...pendentes0, ...pendentes1];

  for (const row of rows) {
    const rowId  = row["Id"] as number;
    const tarefa = row["Tarefa"] ?? "—";
    const gestor = row["Gestor Responsável"] as string;
    if (!gestor) continue;

    const buTable = GESTOR_PARA_BU[gestor];
    const origem  = GESTOR_PARA_ORIGEM[gestor];
    if (!buTable || !origem) {
      log("warn", `[design-sync] gestor "${gestor}" não mapeado — ignorando "${tarefa}"`);
      continue;
    }

    try {
      // Cria task na BU direto em Revisão Interna (Bruna já fez o trabalho)
      const buTask = await ndbCreate(buTable, {
        Tarefa:           tarefa,
        Status:           "🔎 Revisão Interna",
        Responsável:      "Bruna Benevides",
        Cliente:          row["Cliente"] ?? undefined,
        Prioridade:       row["Prioridade"] ?? undefined,
        "Prazo de Entrega": row["Prazo de Entrega"] ?? undefined,
        "Briefing Completo": row["Briefing"] ?? undefined,
        "Link de entrega":   row["Link de Entrega"] ?? undefined,
      });

      // Vincula a task de design à BU recém-criada
      await ndbUpdate(NDB.tables.tasks_design, rowId, {
        "Task Origem": String(buTask["Id"]),
        Origem:        origem,
        Sincronizado:  true,
      });

      log("info", `[design-sync] "${tarefa}" (auto-iniciada) → BU ${origem} em Revisão Interna`);
      criadas++;
    } catch (e: any) {
      log("warn", `[design-sync] erro ao criar task auto-iniciada: ${e?.message}`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return { criadas };
}

async function _finalizarTask(row: any, buTable: string, buRowId: number): Promise<void> {
  const rowId      = row["Id"] as number;
  const tarefa     = row["Tarefa"] ?? "—";
  const cliente    = row["Cliente"];
  const tipo       = row["Tipo"];
  const urg        = row["Urgência"];
  const comp       = row["Complexidade"];
  const dataEnt    = row["Data de Entrega"] ?? row["Prazo de Entrega"];
  const rev        = row["Precisou de Alteração?"];
  const nRev       = row["Nº de Alterações"];
  const qtd        = row["Quantidade"];
  const link       = row["Link de Entrega"];
  const briefing   = row["Briefing"];
  const origem     = row["Origem"] as string;
  const gestor     = GESTOR_MAP[origem] ?? "Christian (Gestor)";
  const hoje       = new Date().toISOString().split("T")[0];

  const prod: Record<string, any> = {
    Tarefa:                  tarefa,
    Status:                  "Entregue",
    Data:                    dataEnt ?? hoje,
    "Responsável Aprovação": gestor,
  };
  if (cliente)   prod["Cliente"]                = cliente;
  if (tipo)      prod["Tipo"]                   = tipo;
  if (urg)       prod["Urgência"]               = urg;
  if (comp)      prod["Complexidade"]           = comp;
  if (dataEnt)   prod["Data de Entrega"]        = dataEnt;
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

  // Arquiva task na BU de origem
  try {
    await ndbUpdate(buTable, buRowId, { Status: "📦 Arquivado" });
  } catch (e: any) {
    log("warn", `[design-sync] erro ao arquivar task na BU: ${e?.message}`);
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
      const m = await autoAtribuirPorResponsavel(
        [NDB.tables.tasks_bu1, NDB.tables.tasks_bu2, NDB.tables.tasks_bu3], [NOME_BRUNA],
      );
      if (m > 0) log("info", `[design-sync] ${m} task(s) auto-atribuídas à Bruna por menção`);
      const a = await syncAtribuidos();
      log("info", `[design-sync] Atribuídos: ${a.criadas} criadas, ${a.atualizadas} atualizadas`);
      const i = await syncAutoIniciadas();
      log("info", `[design-sync] Auto-iniciadas: ${i.criadas} enviadas ao gestor`);
      const p = await syncParaAprovacao();
      log("info", `[design-sync] Em Aprovação: ${p.enviadas} enviadas ao gestor`);
      const d = await syncDecisaoGestor();
      log("info", `[design-sync] Decisões: ${d.aprovadas} aprovadas, ${d.revisoes} em revisão`);
      await atualizarSLA([NDB.tables.tasks_bu1, NDB.tables.tasks_bu2, NDB.tables.tasks_bu3, NDB.tables.tasks_design]);
      await atualizarRelatorios([NDB.tables.clientes_bu1, NDB.tables.clientes_bu2, NDB.tables.clientes_bu3]);
    } catch (err: any) {
      log("error", `[design-sync] erro no ciclo: ${err?.message ?? String(err)}`);
    }
  }

  setTimeout(runCycle, 30_000);
  setInterval(runCycle, INTERVALO_MS);
  log("info", `[design-sync] sincronização iniciada — intervalo: ${INTERVALO_MS / 60000} min`);
}
