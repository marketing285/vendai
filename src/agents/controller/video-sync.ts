/**
 * video-sync.ts
 * Fluxo de edição de vídeo — Ana Laura (polling a cada 1 min):
 *
 * 1. BU1/BU2 → Tasks de Edição
 *    Tasks com Status "👤 Atribuído" e Responsável = Ana Laura são copiadas
 *    para Tasks de Edição. A task na BU passa para "🎬 Em Edição".
 *
 * 2. Tasks de Edição "✅ Entregue" → BU de origem + Produções de Edição
 *    Quando Ana Laura marca "✅ Entregue":
 *    - Task original na BU volta para "🔎 Revisão Interna" (gestor aprova)
 *    - Cópia enviada para Produções de Edição (histórico/pagamento)
 *    - Task de Edição arquivada
 *
 * ⚠️  Ana Laura precisa ser convidada ao workspace Grupo Venda e seu ID
 *     configurado em ANA_LAURA_ID (env ou hardcode abaixo após convite).
 */

import { Client } from "@notionhq/client";
import { NOTION_DBS } from "./notion-tool";
import { log } from "./logger";

const INTERVALO_MS = 1 * 60 * 1000; // 1 minuto
const NOME_ANA     = process.env.ANA_NOME ?? "Ana Laura";
const CHRISTIAN_ID = "247d872b-594c-8111-816a-00022a184432";
const JUNIOR_ID    = "30dd872b-594c-81a1-abc0-000271dff430";

// ─── Helper ───────────────────────────────────────────────────────────────────
function temAna(page: any): boolean {
  const pessoas: any[] = page.properties?.["Responsável"]?.people ?? [];
  return pessoas.some((p: any) =>
    (p.name ?? "").toLowerCase().includes(NOME_ANA.toLowerCase())
  );
}

// ─── 1. BU1/BU2 → Tasks de Edição ────────────────────────────────────────────
async function syncBUparaTasks(notion: Client): Promise<{ criadas: number; atualizadas: number }> {
  const dbTasks = NOTION_DBS.tasks_edicao_ana;
  if (!dbTasks) return { criadas: 0, atualizadas: 0 };

  let criadas = 0;
  let atualizadas = 0;

  const bancos: { id: string; origem: string }[] = [
    { id: NOTION_DBS.tasks_bu1, origem: "BU1" },
    { id: NOTION_DBS.tasks_bu2, origem: "BU2" },
  ];

  for (const { id: dbId, origem } of bancos) {
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
        if (!temAna(page)) continue;

        const pageId = page.id;
        const props  = (page as any).properties;

        const tarefa      = props["Tarefa"]?.title?.[0]?.text?.content ?? "—";
        const cliente     = props["Cliente"]?.select?.name;
        const prazo       = props["Prazo de Entrega"]?.date?.start;
        const prioridade  = props["Prioridade"]?.select?.name;
        const roteiro     = props["Briefing Completo"]?.url ?? ""; // script/briefing → Roteiro
        const linkEntrega = props["Link de entrega"]?.url ?? "";
        const aprovadorId = origem === "BU1" ? CHRISTIAN_ID : JUNIOR_ID;

        const campos: Record<string, any> = {
          "Responsável Aprovação": { people: [{ object: "user", id: aprovadorId }] },
        };
        if (cliente)     campos["Cliente"]         = { select: { name: cliente } };
        if (prazo)       campos["Prazo de Entrega"] = { date: { start: prazo } };
        if (roteiro)     campos["Roteiro"]           = { url: roteiro };
        if (linkEntrega) campos["Link de Entrega"]   = { url: linkEntrega };
        if (prioridade) {
          const prioMap: Record<string, string> = {
            "🔴 P0 — Emergência": "🔴 P0 — Emergência",
            "🟠 P1 — Alta":       "🟠 P1 — Alta",
            "🟡 P2 — Normal":     "🟡 P2 — Normal",
          };
          campos["Prioridade"] = { select: { name: prioMap[prioridade] ?? prioridade } };
          const urgMap: Record<string, string> = {
            "🔴 P0 — Emergência": "Urgente",
            "🟠 P1 — Alta":       "Urgente",
            "🟡 P2 — Normal":     "Média",
            "🟢 P3 — Baixa":      "Suave",
          };
          const urgencia = urgMap[prioridade];
          if (urgencia) campos["Urgência"] = { select: { name: urgencia } };
        }

        const existe = await notion.databases.query({
          database_id: dbTasks,
          filter: { property: "Task Origem", rich_text: { contains: pageId } },
          page_size: 1,
        });

        if (existe.results.length > 0) {
          await notion.pages.update({ page_id: existe.results[0].id, properties: campos });
          await notion.pages.update({
            page_id: pageId,
            properties: { "Status": { select: { name: "🎬 Em Edição" } } },
          });
          atualizadas++;
          await new Promise(r => setTimeout(r, 350));
          continue;
        }

        await notion.pages.create({
          parent: { database_id: dbTasks },
          properties: {
            "Tarefa":       { title: [{ text: { content: tarefa } }] },
            "Origem":       { select: { name: origem } },
            "Task Origem":  { rich_text: [{ text: { content: pageId } }] },
            "Status":       { select: { name: "👤 Atribuído" } },
            "Sincronizado": { checkbox: false },
            ...campos,
          },
        });
        await notion.pages.update({
          page_id: pageId,
          properties: { "Status": { select: { name: "🎬 Em Edição" } } },
        });

        criadas++;
        log("info", `[video-sync] nova task criada de ${origem}: "${tarefa}"`);
        await new Promise(r => setTimeout(r, 350));
      }

      cursor = resp.has_more ? (resp.next_cursor ?? undefined) : undefined;
    } while (cursor);
  }

  return { criadas, atualizadas };
}

// ─── 2. Tasks de Edição "✅ Entregue" → BU de origem + Produções de Edição ───
async function syncEntregues(notion: Client): Promise<{ processadas: number }> {
  const dbTasks = NOTION_DBS.tasks_edicao_ana;
  const dbProds = NOTION_DBS.edicao_ana;
  if (!dbTasks || !dbProds) return { processadas: 0 };

  let processadas = 0;

  const resp = await notion.databases.query({
    database_id: dbTasks,
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

    const tarefa       = p["Tarefa"]?.title?.[0]?.text?.content ?? "—";
    const cliente      = p["Cliente"]?.select?.name;
    const urg          = p["Urgência"]?.select?.name;
    const comp         = p["Complexidade"]?.select?.name;
    const prazoEnt     = p["Data de Entrega"]?.date?.start;
    const rev          = p["Precisou de Alteração?"]?.select?.name;
    const nRev         = p["Nº de Alterações"]?.number;
    const link         = p["Link de Entrega"]?.url;
    const roteiro      = p["Roteiro"]?.url;
    const aprovNome    = p["Responsável Aprovação"]?.people?.[0]?.name;
    const taskOrigemId = p["Task Origem"]?.rich_text?.[0]?.text?.content;
    const hoje         = new Date().toISOString().split("T")[0];

    // ── Cópia para Produções de Edição ──
    const prodProps: Record<string, any> = {
      "Tarefa": { title: [{ text: { content: tarefa } }] },
      "Status": { select: { name: "Entregue" } },
      "Data":   { date: { start: prazoEnt ?? hoje } },
    };
    if (cliente)   prodProps["Cliente"]                = { select: { name: cliente } };
    if (urg)       prodProps["Urgência"]               = { select: { name: urg } };
    if (comp)      prodProps["Complexidade"]           = { select: { name: comp } };
    if (prazoEnt)  prodProps["Data de Entrega"]        = { date: { start: prazoEnt } };
    if (rev)       prodProps["Precisou de Alteração?"] = { select: { name: rev } };
    if (nRev)      prodProps["Nº de Alterações"]       = { number: nRev };
    if (link)      prodProps["Link de Entrega"]        = { url: link };
    if (roteiro)   prodProps["Roteiro"]                = { url: roteiro };
    if (aprovNome) prodProps["Responsável Aprovação"]  = { select: { name: aprovNome } };

    try {
      await notion.pages.create({ parent: { database_id: dbProds }, properties: prodProps });
      log("info", `[video-sync] "${tarefa}" copiada para Produções de Edição`);
    } catch (e: any) {
      log("warn", `[video-sync] erro ao copiar para Produções: ${e?.message}`);
    }

    // ── Devolve para BU de origem ──
    if (taskOrigemId) {
      try {
        await notion.pages.update({
          page_id: taskOrigemId,
          properties: { "Status": { select: { name: "🔎 Revisão Interna" } } },
        });
        log("info", `[video-sync] "${tarefa}" devolvida à BU (🔎 Revisão Interna)`);
      } catch (e: any) {
        log("warn", `[video-sync] erro ao devolver à BU: ${e?.message}`);
      }
    }

    // ── Arquiva task de edição ──
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
export function startVideoSync(): void {
  const token   = process.env.NOTION_TOKEN;
  const dbTasks = NOTION_DBS.tasks_edicao_ana;

  if (!token) {
    log("warn", "[video-sync] NOTION_TOKEN não configurado — sync desativado.");
    return;
  }
  if (!dbTasks) {
    log("warn", "[video-sync] tasks_edicao_ana não configurado.");
    return;
  }

  const notion = new Client({ auth: token });

  async function runCycle() {
    try {
      log("info", "[video-sync] iniciando ciclo...");
      const bu = await syncBUparaTasks(notion);
      log("info", `[video-sync] BU→Edição: ${bu.criadas} criadas, ${bu.atualizadas} atualizadas`);
      const en = await syncEntregues(notion);
      log("info", `[video-sync] Entregues: ${en.processadas} devolvidas à BU + copiadas para Produções`);
    } catch (err: any) {
      log("error", `[video-sync] erro no ciclo: ${err?.message ?? String(err)}`);
    }
  }

  setTimeout(runCycle, 35_000); // 5s depois do design-sync (evita colisão de rate limit)
  setInterval(runCycle, INTERVALO_MS);

  log("info", `[video-sync] sincronização iniciada — intervalo: ${INTERVALO_MS / 60000} min`);
}
