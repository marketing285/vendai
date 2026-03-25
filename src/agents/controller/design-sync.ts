/**
 * design-sync.ts
 * Fluxo completo de design (polling a cada 1 min):
 *
 * 1. BU1/BU2 → Tasks de Design
 *    Tasks com Status "👤 Atribuído" e Responsável = Bruna são copiadas para
 *    Tasks de Design. A task na BU passa para "🎨 Em Design" (travada).
 *
 * 2. Tasks de Design "✅ Entregue" → BU de origem + Produções de Design
 *    Quando Bruna marca "✅ Entregue":
 *    - Task original na BU volta para "🔎 Revisão Interna" (gestor aprova)
 *    - Cópia enviada para Produções de Design (histórico)
 *    - Task de Design arquivada
 */

import { Client } from "@notionhq/client";
import { NOTION_DBS } from "./notion-tool";
import { log } from "./logger";

const INTERVALO_MS = 1 * 60 * 1000; // 1 minuto
const NOME_BRUNA   = process.env.BRUNA_NOME ?? "Bruna";

// ─── Helper ───────────────────────────────────────────────────────────────────
function temBruna(page: any): boolean {
  const pessoas: any[] = page.properties?.["Responsável"]?.people ?? [];
  return pessoas.some((p: any) =>
    (p.name ?? "").toLowerCase().includes(NOME_BRUNA.toLowerCase())
  );
}

// ─── 1. BU1/BU2 → Tasks de Design ────────────────────────────────────────────
async function syncBUparaTasks(notion: Client): Promise<{ criadas: number; atualizadas: number }> {
  const dbDesign = NOTION_DBS.tasks_design_bruna;
  if (!dbDesign) return { criadas: 0, atualizadas: 0 };

  let criadas = 0;
  let atualizadas = 0;

  const bancos: { id: string; origem: string }[] = [
    { id: NOTION_DBS.tasks_bu1, origem: "BU1" },
    { id: NOTION_DBS.tasks_bu2, origem: "BU2" },
  ];

  for (const { id: dbId, origem } of bancos) {
    // Só busca tasks recém-atribuídas (evita reprocessar tasks já em design ou em revisão)
    let cursor: string | undefined;
    do {
      const resp = await notion.databases.query({
        database_id: dbId,
        filter: {
          property: "Status",
          select: { equals: "👤 Atribuído" },
        },
        page_size: 50,
        ...(cursor ? { start_cursor: cursor } : {}),
      });

      for (const page of resp.results) {
        if (page.object !== "page") continue;
        if (!temBruna(page)) continue;

        const pageId = page.id;
        const props  = (page as any).properties;

        const tarefa      = props["Tarefa"]?.title?.[0]?.text?.content ?? "—";
        const cliente     = props["Cliente"]?.select?.name;
        const prazo       = props["Prazo de Entrega"]?.date?.start;
        const prioridade  = props["Prioridade"]?.select?.name;
        const briefingUrl = props["Briefing Completo"]?.url ?? "";
        const linkEntrega = props["Link de entrega"]?.url ?? "";
        const aprovadorId = origem === "BU1"
          ? "247d872b-594c-8111-816a-00022a184432"  // Christian Castilhoni
          : "30dd872b-594c-81a1-abc0-000271dff430"; // Junior Monte

        const camposEspelho: Record<string, any> = {
          "Responsável Aprovação": { people: [{ object: "user", id: aprovadorId }] },
        };
        if (cliente)     camposEspelho["Cliente"]         = { select: { name: cliente } };
        if (prazo)       camposEspelho["Prazo de Entrega"] = { date: { start: prazo } };
        if (briefingUrl) camposEspelho["Briefing"]         = { rich_text: [{ text: { content: briefingUrl.slice(0, 2000) } }] };
        if (linkEntrega) camposEspelho["Link de Entrega"]  = { url: linkEntrega };
        if (prioridade) {
          const prioMap: Record<string, string> = {
            "🔴 P0 — Emergência": "🔴 P0 — Emergência",
            "🟠 P1 — Alta":       "🟠 P1 — Alta",
            "🟡 P2 — Normal":     "🟡 P2 — Normal",
          };
          camposEspelho["Prioridade"] = { select: { name: prioMap[prioridade] ?? prioridade } };
        }

        // Verifica se já existe em Tasks de Design
        const existe = await notion.databases.query({
          database_id: dbDesign,
          filter: { property: "Task Origem", rich_text: { contains: pageId } },
          page_size: 1,
        });

        if (existe.results.length > 0) {
          // Atualiza campos e garante que BU está como "🎨 Em Design"
          await notion.pages.update({ page_id: existe.results[0].id, properties: camposEspelho });
          await notion.pages.update({
            page_id: pageId,
            properties: { "Status": { select: { name: "🎨 Em Design" } } },
          });
          atualizadas++;
          await new Promise(r => setTimeout(r, 350));
          continue;
        }

        // Cria nova task em Tasks de Design
        await notion.pages.create({
          parent: { database_id: dbDesign },
          properties: {
            "Tarefa":       { title: [{ text: { content: tarefa } }] },
            "Origem":       { select: { name: origem } },
            "Task Origem":  { rich_text: [{ text: { content: pageId } }] },
            "Status":       { select: { name: "👤 Atribuído" } },
            "Sincronizado": { checkbox: false },
            ...camposEspelho,
          },
        });

        // Trava a task na BU — gestor sabe que está com o design
        await notion.pages.update({
          page_id: pageId,
          properties: { "Status": { select: { name: "🎨 Em Design" } } },
        });

        criadas++;
        log("info", `[design-sync] nova task criada de ${origem}: "${tarefa}"`);
        await new Promise(r => setTimeout(r, 350));
      }

      cursor = resp.has_more ? (resp.next_cursor ?? undefined) : undefined;
    } while (cursor);
  }

  return { criadas, atualizadas };
}

// ─── 2. Tasks de Design "✅ Entregue" → BU de origem + Produções de Design ────
async function syncEntregues(notion: Client): Promise<{ processadas: number }> {
  const dbDesign = NOTION_DBS.tasks_design_bruna;
  const dbProds  = NOTION_DBS.design_bruna;
  if (!dbDesign || !dbProds) return { processadas: 0 };

  let processadas = 0;

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

    const tarefa        = p["Tarefa"]?.title?.[0]?.text?.content ?? "—";
    const cliente       = p["Cliente"]?.select?.name;
    const tipo          = p["Tipo de Peça"]?.select?.name;
    const qtd           = p["Quantidade"]?.number;
    const urg           = p["Urgência"]?.select?.name;
    const comp          = p["Complexidade"]?.select?.name;
    const prazoEnt      = p["Data de Entrega"]?.date?.start;
    const prazo         = p["Prazo de Entrega"]?.date?.start;
    const rev           = p["Precisou de Alteração?"]?.select?.name;
    const nRev          = p["Nº de Alterações"]?.number;
    const link          = p["Link de Entrega"]?.url;
    const briefing      = p["Briefing"]?.rich_text?.[0]?.text?.content;
    const aprovNome     = p["Responsável Aprovação"]?.people?.[0]?.name;
    const taskOrigemId  = p["Task Origem"]?.rich_text?.[0]?.text?.content;
    const hoje          = new Date().toISOString().split("T")[0];

    // ── Cópia para Produções de Design ──
    const prodProps: Record<string, any> = {
      "Tarefa": { title: [{ text: { content: tarefa } }] },
      "Status": { select: { name: "Entregue" } },
      "Data":   { date: { start: prazoEnt ?? hoje } },
    };
    if (cliente)   prodProps["Cliente"]                = { select: { name: cliente } };
    if (tipo)      prodProps["Tipo"]                   = { select: { name: tipo } };
    if (qtd)       prodProps["Quantidade"]             = { number: qtd };
    if (urg)       prodProps["Urgência"]               = { select: { name: urg } };
    if (comp)      prodProps["Complexidade"]           = { select: { name: comp } };
    if (prazoEnt)  prodProps["Data de Entrega"]        = { date: { start: prazoEnt } };
    if (rev)       prodProps["Precisou de Alteração?"] = { select: { name: rev } };
    if (nRev)      prodProps["Nº de Alterações"]       = { number: nRev };
    if (link)      prodProps["Link de Entrega"]        = { url: link };
    if (briefing)  prodProps["Briefing"]               = { rich_text: [{ text: { content: briefing.slice(0, 2000) } }] };
    if (aprovNome) prodProps["Responsável Aprovação"]  = { select: { name: aprovNome } };

    await notion.pages.create({ parent: { database_id: dbProds }, properties: prodProps });
    log("info", `[design-sync] "${tarefa}" copiada para Produções de Design`);

    // ── Devolve task para a BU de origem (Revisão Interna) ──
    if (taskOrigemId) {
      try {
        await notion.pages.update({
          page_id: taskOrigemId,
          properties: { "Status": { select: { name: "🔎 Revisão Interna" } } },
        });
        log("info", `[design-sync] "${tarefa}" devolvida para BU (🔎 Revisão Interna)`);
      } catch (e: any) {
        log("warn", `[design-sync] não foi possível devolver task BU: ${e?.message}`);
      }
    }

    // ── Arquiva a task de design (saiu do board) ──
    await notion.pages.update({
      page_id: page.id,
      properties: { "Sincronizado": { checkbox: true } },
      archived: true,
    } as any);

    processadas++;
    await new Promise(r => setTimeout(r, 350));
  }

  return { processadas };
}

// ─── Loop principal ───────────────────────────────────────────────────────────
export function startDesignSync(): void {
  const token    = process.env.NOTION_TOKEN;
  const dbDesign = NOTION_DBS.tasks_design_bruna;

  if (!token) {
    log("warn", "[design-sync] NOTION_TOKEN não configurado — sync desativado.");
    return;
  }
  if (!dbDesign) {
    log("warn", "[design-sync] tasks_design_bruna não configurado.");
    return;
  }

  const notion = new Client({ auth: token });

  async function runCycle() {
    try {
      log("info", "[design-sync] iniciando ciclo...");

      const bu = await syncBUparaTasks(notion);
      log("info", `[design-sync] BU→Design: ${bu.criadas} criadas, ${bu.atualizadas} atualizadas`);

      const en = await syncEntregues(notion);
      log("info", `[design-sync] Entregues: ${en.processadas} devolvidas à BU + copiadas para Produções`);
    } catch (err: any) {
      log("error", `[design-sync] erro no ciclo: ${err?.message ?? String(err)}`);
    }
  }

  setTimeout(runCycle, 30_000);
  setInterval(runCycle, INTERVALO_MS);

  log("info", `[design-sync] sincronização iniciada — intervalo: ${INTERVALO_MS / 60000} min`);
}
