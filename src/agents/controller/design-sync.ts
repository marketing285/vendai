/**
 * design-sync.ts
 * Sincronização automática (sem Notion Automations — plan free):
 *
 * 1. BU1/BU2 → Tasks de Design
 *    A cada ciclo, busca tasks nas BUs onde Responsável inclui Bruna
 *    e cria a task correspondente em Tasks de Design se ainda não existir.
 *
 * 2. Tasks de Design → Produções de Design
 *    Tasks marcadas como "✅ Entregue" e não sincronizadas são copiadas
 *    para Produções de Design e marcadas como Sincronizado = true.
 *
 * Intervalo padrão: 5 minutos.
 * Inicie com startDesignSync() no server.ts.
 */

import { Client } from "@notionhq/client";
import { NOTION_DBS } from "./notion-tool";
import { log } from "./logger";

const INTERVALO_MS  = 5 * 60 * 1000; // 5 minutos
const NOME_BRUNA    = process.env.BRUNA_NOME ?? "Bruna"; // nome parcial para match

// ─── Helper: verifica se uma página tem Bruna como responsável ────────────────
function temBruna(page: any): boolean {
  const pessoas: any[] = page.properties?.["Responsável"]?.people ?? [];
  return pessoas.some((p: any) =>
    (p.name ?? "").toLowerCase().includes(NOME_BRUNA.toLowerCase())
  );
}

// ─── 1. BU1/BU2 → Tasks de Design ────────────────────────────────────────────
async function syncBUparaTasks(notion: Client): Promise<{ criadas: number; ignoradas: number }> {
  const dbDesign = NOTION_DBS.tasks_design_bruna;
  if (!dbDesign) return { criadas: 0, ignoradas: 0 };

  let criadas = 0;
  let ignoradas = 0;

  const bancos: { id: string; origem: string }[] = [
    { id: NOTION_DBS.tasks_bu1, origem: "BU1" },
    { id: NOTION_DBS.tasks_bu2, origem: "BU2" },
  ];

  for (const { id: dbId, origem } of bancos) {
    // Busca tasks abertas da BU (exclui concluídas)
    let cursor: string | undefined;
    do {
      const resp = await notion.databases.query({
        database_id: dbId,
        filter: {
          property: "Status",
          select: { does_not_equal: "✅ Concluído" },
        },
        page_size: 50,
        ...(cursor ? { start_cursor: cursor } : {}),
      });

      for (const page of resp.results) {
        if (page.object !== "page") continue;
        if (!temBruna(page)) continue;

        const pageId = page.id;

        // Verifica se já existe em Tasks de Design pelo campo Task Origem
        const existe = await notion.databases.query({
          database_id: dbDesign,
          filter: {
            property: "Task Origem",
            rich_text: { contains: pageId },
          },
          page_size: 1,
        });

        if (existe.results.length > 0) {
          ignoradas++;
          continue;
        }

        // Extrai dados da task BU
        const props = (page as any).properties;
        const tarefa   = props["Tarefa"]?.title?.[0]?.text?.content ?? "—";
        const cliente  = props["Cliente"]?.select?.name;
        const prazo    = props["Prazo de Entrega"]?.date?.start;
        const prioridade = props["Prioridade"]?.select?.name;
        const status   = props["Status"]?.select?.name;
        const briefing = props["Briefing"]?.rich_text?.[0]?.text?.content
                      ?? props["Descrição"]?.rich_text?.[0]?.text?.content
                      ?? "";

        const novosProps: Record<string, any> = {
          "Tarefa": { title: [{ text: { content: tarefa } }] },
          "Origem": { select: { name: origem } },
          "Task Origem": { rich_text: [{ text: { content: pageId } }] },
          "Status": { select: { name: "📥 Inbox" } },
          "Sincronizado": { checkbox: false },
        };

        if (cliente)   novosProps["Cliente"]          = { select: { name: cliente } };
        if (prazo)     novosProps["Prazo de Entrega"]  = { date: { start: prazo } };
        if (briefing)  novosProps["Briefing"]          = { rich_text: [{ text: { content: briefing.slice(0, 2000) } }] };

        // Mapeia prioridade (formato BU → Design)
        if (prioridade) {
          const prioMap: Record<string, string> = {
            "🔴 P0 — Emergência": "🔴 P0 — Emergência",
            "🟠 P1 — Alta":       "🟠 P1 — Alta",
            "🟡 P2 — Normal":     "🟡 P2 — Normal",
          };
          const p = prioMap[prioridade] ?? prioridade;
          novosProps["Prioridade"] = { select: { name: p } };
        }

        await notion.pages.create({
          parent: { database_id: dbDesign },
          properties: novosProps,
        });

        criadas++;
        log("info", `[design-sync] nova task criada de ${origem}: "${tarefa}"`);
        await new Promise(r => setTimeout(r, 350)); // rate limit
      }

      cursor = resp.has_more ? (resp.next_cursor ?? undefined) : undefined;
    } while (cursor);
  }

  return { criadas, ignoradas };
}

// ─── 2. Tasks de Design (Entregue) → Produções de Design ─────────────────────
async function syncTasksParaProducoes(notion: Client): Promise<{ copiadas: number }> {
  const dbDesign  = NOTION_DBS.tasks_design_bruna;
  const dbProds   = NOTION_DBS.design_bruna;

  if (!dbDesign || !dbProds) return { copiadas: 0 };

  let copiadas = 0;

  // Busca tasks Entregue que ainda não foram sincronizadas
  const resp = await notion.databases.query({
    database_id: dbDesign,
    filter: {
      and: [
        { property: "Status",       select:   { equals: "✅ Entregue" } },
        { property: "Sincronizado", checkbox: { equals: false } },
      ],
    },
    page_size: 50,
  });

  for (const page of resp.results) {
    if (page.object !== "page") continue;
    const p = (page as any).properties;

    const tarefa   = p["Tarefa"]?.title?.[0]?.text?.content ?? "—";
    const cliente  = p["Cliente"]?.select?.name;
    const tipo     = p["Tipo de Peça"]?.select?.name;
    const qtd      = p["Quantidade"]?.number;
    const urg      = p["Urgência"]?.select?.name;
    const comp     = p["Complexidade"]?.select?.name;
    const prazoEnt = p["Data de Entrega"]?.date?.start;
    const rev      = p["Precisou de Alteração?"]?.select?.name;
    const nRev     = p["Nº de Alterações"]?.number;
    const link     = p["Link de Entrega"]?.url;
    const aprov    = p["Responsável Aprovação"]?.select?.name;
    const hoje     = new Date().toISOString().split("T")[0];

    const prodProps: Record<string, any> = {
      "Tarefa": { title: [{ text: { content: tarefa } }] },
      "Status": { select: { name: "Entregue" } },
      "Data":   { date: { start: prazoEnt ?? hoje } },
      "Sincronizado": { checkbox: true },
    };

    if (cliente)  prodProps["Cliente"]                 = { select: { name: cliente } };
    if (tipo)     prodProps["Tipo"]                    = { select: { name: tipo } };
    if (qtd)      prodProps["Quantidade"]              = { number: qtd };
    if (urg)      prodProps["Urgência"]                = { select: { name: urg } };
    if (comp)     prodProps["Complexidade"]            = { select: { name: comp } };
    if (prazoEnt) prodProps["Data de Entrega"]         = { date: { start: prazoEnt } };
    if (rev)      prodProps["Precisou de Alteração?"]  = { select: { name: rev } };
    if (nRev)     prodProps["Nº de Alterações"]        = { number: nRev };
    if (link)     prodProps["Link de Entrega"]         = { url: link };
    if (aprov)    prodProps["Responsável Aprovação"]   = { select: { name: aprov } };

    // Cria em Produções de Design
    await notion.pages.create({
      parent: { database_id: dbProds },
      properties: prodProps,
    });

    // Marca como sincronizado na task de design
    await notion.pages.update({
      page_id: page.id,
      properties: {
        "Sincronizado": { checkbox: true },
      },
    });

    copiadas++;
    log("info", `[design-sync] task entregue copiada para Produções: "${tarefa}"`);
    await new Promise(r => setTimeout(r, 350));
  }

  return { copiadas };
}

// ─── Loop principal ───────────────────────────────────────────────────────────
export function startDesignSync(): void {
  const token = process.env.NOTION_TOKEN;
  const dbDesign = NOTION_DBS.tasks_design_bruna;

  if (!token) {
    log("warn", "[design-sync] NOTION_TOKEN não configurado — sync desativado.");
    return;
  }
  if (!dbDesign) {
    log("warn", "[design-sync] tasks_design_bruna não configurado — rode setup-design-tasks.ts primeiro.");
    return;
  }

  const notion = new Client({ auth: token });

  async function runCycle() {
    try {
      log("info", "[design-sync] iniciando ciclo...");
      const bu = await syncBUparaTasks(notion);
      log("info", `[design-sync] BU→Design: ${bu.criadas} criadas, ${bu.ignoradas} já existiam`);

      const pr = await syncTasksParaProducoes(notion);
      log("info", `[design-sync] Design→Produções: ${pr.copiadas} copiadas`);
    } catch (err: any) {
      log("error", `[design-sync] erro no ciclo: ${err?.message ?? String(err)}`);
    }
  }

  // Primeiro ciclo após 30s (dá tempo ao servidor subir)
  setTimeout(runCycle, 30_000);
  // Ciclos subsequentes a cada 5 minutos
  setInterval(runCycle, INTERVALO_MS);

  log("info", `[design-sync] sincronização iniciada — intervalo: ${INTERVALO_MS / 60000} min`);
}
