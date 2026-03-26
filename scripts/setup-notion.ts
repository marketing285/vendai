/**
 * setup-notion.ts — v2
 *
 * Arquitetura final:
 *   PARENT (Grupo Venda Operações)
 *   ├── 🟣 BU1 — Christian (Page)
 *   │   ├── 📋 Tasks BU1        ← database inline
 *   │   └── 📆 Editorial BU1    ← database inline
 *   ├── 🔵 BU2 — Junior (Page)
 *   │   ├── 📋 Tasks BU2        ← database inline
 *   │   └── 📆 Editorial BU2    ← database inline
 *   ├── 🌐 Dashboard Global (Page)
 *   │   └── 📊 Resultados por BU ← database inline
 *   └── 🗂️ Clientes (já existe)
 *
 * Bancos inline = zero configuração — já aparecem na página com view em tabela.
 * O usuário pode adicionar views (Board, Calendar) com 1 clique no Notion.
 *
 * Execução:
 *   npx ts-node scripts/setup-notion.ts
 */

import { Client } from "@notionhq/client";

// ─── Config ───────────────────────────────────────────────────────────────────
const TOKEN      = process.env.NOTION_TOKEN      || "ntn_b61414369988HFeNcHd5XJq3cYe0G8ATA3DSXm21Mmz0LC";
const PARENT_ID  = process.env.NOTION_PARENT_ID  || "31816e0ee44681a5b3c1ee15bf8dbe9d";
const CLIENTS_DB = process.env.NOTION_CLIENTS_DB || "0bde8f4481504045863a0055d22cff43";

// IDs criados na execução anterior — serão arquivados
const OLD_IDS = [
  "32c16e0e-e446-816e-abff-e32e0bcda4ff", // Tasks (central)
  "32c16e0e-e446-816f-bed1-df3530fee11a", // Editorial (central)
  "32c16e0e-e446-8198-afaf-c37ee55e030e", // Resultados (central)
  "32c16e0e-e446-81f8-9dfb-c2047931f4b8", // BU1 page (antiga)
  "32c16e0e-e446-811b-9392-e4063fbc1193", // BU2 page (antiga)
  "32c16e0e-e446-81f3-a444-e8a3a692b809", // Dashboard (antigo)
];

const notion = new Client({ auth: TOKEN });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ok(msg: string)  { console.log(`  ✅ ${msg}`); }
function step(msg: string){ console.log(`\n📌 ${msg}`); }

function rich(text: string) {
  return [{ type: "text" as const, text: { content: text } }];
}

// ─── Schema de Tasks (compartilhado BU1 / BU2) ───────────────────────────────
function tasksSchema(buLabel: string) {
  return {
    "Tarefa":     { title: {} },
    "Protocolo":  { rich_text: {} },
    "Cliente": {
      relation: { database_id: CLIENTS_DB, single_property: {} },
    },
    "Área": {
      select: {
        options: [
          { name: "Atendimento", color: "blue"   },
          { name: "Design",      color: "pink"   },
          { name: "Vídeo",       color: "purple" },
          { name: "Tráfego",     color: "orange" },
          { name: "Captação",    color: "red"    },
          { name: "Conteúdo",    color: "green"  },
          { name: "Operações",   color: "gray"   },
          { name: "Comercial",   color: "yellow" },
          { name: "Financeiro",  color: "brown"  },
        ],
      },
    },
    "Tipo": {
      select: {
        options: [
          { name: "Nova Demanda", color: "blue"   },
          { name: "Aprovação",    color: "green"  },
          { name: "Ajuste",       color: "orange" },
          { name: "Dúvida",       color: "yellow" },
          { name: "Urgência",     color: "red"    },
          { name: "Financeiro",   color: "brown"  },
        ],
      },
    },
    "Status": {
      select: {
        options: [
          { name: "📥 Inbox",              color: "gray"    },
          { name: "🔍 Triagem",            color: "blue"    },
          { name: "👤 Atribuído",          color: "purple"  },
          { name: "⚙️ Em Produção",        color: "yellow"  },
          { name: "🔎 Revisão Interna",    color: "orange"  },
          { name: "⏳ Aprovação Cliente",  color: "pink"    },
          { name: "✏️ Ajustes",            color: "red"     },
          { name: "✅ Concluído",          color: "green"   },
          { name: "⏸️ Pausado/Bloqueado", color: "default" },
        ],
      },
    },
    "Prioridade": {
      select: {
        options: [
          { name: "🔴 P0 — Emergência", color: "red"    },
          { name: "🟠 P1 — Alta",       color: "orange" },
          { name: "🟡 P2 — Normal",     color: "yellow" },
        ],
      },
    },
    "Responsável":       { people: {}       },
    "Data de Criação":   { created_time: {} },
    "Criado por":        { created_by: {}   },
    "Prazo de Entrega":  { date: {}         },
    "Data de Conclusão": { date: {}         },
    "Dias até Prazo": {
      formula: {
        expression: `if(empty(prop("Prazo de Entrega")), 0, dateBetween(prop("Prazo de Entrega"), now(), "days"))`,
      },
    },
    "Status SLA": {
      formula: {
        expression:
          `if(empty(prop("Prazo de Entrega")), "— Sem Prazo", ` +
          `if(prop("Status") == "✅ Concluído", "✅ Concluído", ` +
          `if(dateBetween(prop("Prazo de Entrega"), now(), "days") < 0, "⚫ Vencido", ` +
          `if(dateBetween(prop("Prazo de Entrega"), now(), "days") <= 1, "🔴 Crítico", ` +
          `if(dateBetween(prop("Prazo de Entrega"), now(), "days") <= 2, "🟡 Atenção", "🟢 OK")))))`,
      },
    },
    "Briefing Completo":  { checkbox:  {} },
    "Motivo de Bloqueio": { rich_text: {} },
    "Link do Documento":  { url:       {} },
    "Notas":              { rich_text: {} },
  };
}

// ─── Schema de Calendário Editorial ──────────────────────────────────────────
function editorialSchema(tasksDbId: string) {
  return {
    "Pauta":   { title: {} },
    "Cliente": { relation: { database_id: CLIENTS_DB, single_property: {} } },
    "Task Vinculada": { relation: { database_id: tasksDbId, single_property: {} } },
    "Formato": {
      select: {
        options: [
          { name: "Reels",     color: "red"    },
          { name: "Story",     color: "orange" },
          { name: "Carrossel", color: "yellow" },
          { name: "Feed",      color: "green"  },
          { name: "Anúncio",   color: "blue"   },
          { name: "Landing",   color: "purple" },
          { name: "Outro",     color: "gray"   },
        ],
      },
    },
    "Canal": {
      select: {
        options: [
          { name: "Instagram", color: "pink"   },
          { name: "Facebook",  color: "blue"   },
          { name: "TikTok",    color: "gray"   },
          { name: "Google",    color: "yellow" },
          { name: "LinkedIn",  color: "blue"   },
        ],
      },
    },
    "Data de Publicação": { date: {}    },
    "Status": {
      select: {
        options: [
          { name: "📝 Rascunho",    color: "gray"   },
          { name: "⚙️ Em Produção", color: "yellow" },
          { name: "✅ Aprovado",    color: "blue"   },
          { name: "📢 Publicado",   color: "green"  },
        ],
      },
    },
    "Responsável":      { people:    {} },
    "Copy":             { rich_text: {} },
    "Link do Criativo": { url:       {} },
  };
}

// ─── 0. Arquiva itens antigos ─────────────────────────────────────────────────
async function archiveOld() {
  step("Arquivando estrutura anterior...");
  for (const id of OLD_IDS) {
    try {
      await notion.pages.update({ page_id: id, archived: true });
      ok(`Arquivado: ${id}`);
    } catch {
      ok(`Já arquivado ou não encontrado: ${id}`);
    }
  }
}

// ─── 1. Atualiza DB de Clientes ───────────────────────────────────────────────
async function updateClientsDB() {
  step("Atualizando DB de Clientes...");
  const existing = await notion.databases.retrieve({ database_id: CLIENTS_DB });
  const props = Object.keys(existing.properties);
  const newProps: Record<string, any> = {};

  if (!props.includes("BU")) {
    newProps["BU"] = {
      select: {
        options: [
          { name: "BU1 — Christian", color: "purple" },
          { name: "BU2 — Junior",    color: "blue"   },
          { name: "Diretoria",       color: "gray"   },
        ],
      },
    };
  }
  if (!props.includes("Status do Cliente")) {
    newProps["Status do Cliente"] = {
      select: {
        options: [
          { name: "Ativo",   color: "green"  },
          { name: "Pausado", color: "yellow" },
          { name: "Inativo", color: "red"    },
        ],
      },
    };
  }
  if (!props.includes("Gestor"))    newProps["Gestor"]    = { people: {} };
  if (!props.includes("MRR (R$)"))  newProps["MRR (R$)"]  = { number: { format: "real" } };

  if (Object.keys(newProps).length === 0) {
    ok("Clientes — sem campos novos.");
    return;
  }
  await notion.databases.update({ database_id: CLIENTS_DB, properties: newProps });
  ok(`Campos adicionados: ${Object.keys(newProps).join(", ")}`);
}

// ─── 2. Cria BU page com databases inline ────────────────────────────────────
async function createBUWorkspace(config: {
  emoji: string;
  buName: string;
  gestor: string;
  buShort: string;
}): Promise<{ pageId: string; tasksDbId: string; editorialDbId: string }> {
  const { emoji, buName, gestor, buShort } = config;

  step(`Criando workspace ${buName}...`);

  // ── Cria a página ──────────────────────────────────────────────────────────
  const page = await notion.pages.create({
    parent:     { type: "page_id", page_id: PARENT_ID },
    icon:       { type: "emoji", emoji: emoji as any },
    properties: { title: { title: rich(`${buName} — ${gestor}`) } },
    children: [
      // Cabeçalho
      {
        object: "block" as const, type: "heading_1" as const,
        heading_1: { rich_text: rich(`${emoji} ${buName} — ${gestor}`) },
      },
      {
        object: "block" as const, type: "paragraph" as const,
        paragraph: { rich_text: rich(`Workspace operacional da ${buName}. Tasks, calendário editorial e métricas da carteira de ${gestor}.`) },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // ── Seção Tasks ────────────────────────────────────────────────────────
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: rich("📋 Tasks") },
      },
      {
        object: "block" as const, type: "callout" as const,
        callout: {
          icon: { type: "emoji" as const, emoji: "💡" },
          rich_text: rich(
            "Adicione views extras clicando em + ao lado da view padrão:\n" +
            "• Board por Status — visão kanban do fluxo de trabalho\n" +
            "• Board por Área — carga distribuída por área\n" +
            "• Calendar — tasks por prazo de entrega\n" +
            "• Filtro rápido: Status SLA = 🔴 Crítico (para emergências)"
          ),
        },
      },
    ],
  });
  ok(`Página ${buName} criada: ${page.id}`);

  // ── Tasks Database (aparece inline logo abaixo dos blocos acima) ───────────
  const tasksDb = await notion.databases.create({
    parent:     { type: "page_id", page_id: page.id },
    icon:       { type: "emoji", emoji: "📋" },
    title:      rich(`Tasks ${buShort}`),
    properties: tasksSchema(buShort) as any,
  });
  ok(`Tasks ${buShort} criado: ${tasksDb.id}`);

  // ── Adiciona separador e cabeçalho do Calendário ───────────────────────────
  await notion.blocks.children.append({
    block_id: page.id,
    children: [
      { object: "block" as const, type: "divider" as const, divider: {} },
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: rich("📆 Calendário Editorial") },
      },
      {
        object: "block" as const, type: "callout" as const,
        callout: {
          icon: { type: "emoji" as const, emoji: "💡" },
          rich_text: rich(
            "Adicione views extras:\n" +
            "• Calendar por Data de Publicação — visão mensal\n" +
            "• Board por Status — acompanhar produção\n" +
            "• Board por Formato — volume por tipo de conteúdo"
          ),
        },
      },
    ],
  });

  // ── Calendário Editorial (aparece inline abaixo) ───────────────────────────
  const editorialDb = await notion.databases.create({
    parent:     { type: "page_id", page_id: page.id },
    icon:       { type: "emoji", emoji: "📆" },
    title:      rich(`Calendário Editorial ${buShort}`),
    properties: editorialSchema(tasksDb.id) as any,
  });
  ok(`Calendário Editorial ${buShort} criado: ${editorialDb.id}`);

  // ── Adiciona seção de métricas/links ──────────────────────────────────────
  await notion.blocks.children.append({
    block_id: page.id,
    children: [
      { object: "block" as const, type: "divider" as const, divider: {} },
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: rich("📊 Métricas e Resultados") },
      },
      {
        object: "block" as const, type: "paragraph" as const,
        paragraph: { rich_text: rich("Consulte o Dashboard Global para os resultados mensais consolidados da operação.") },
      },
    ],
  });

  return { pageId: page.id, tasksDbId: tasksDb.id, editorialDbId: editorialDb.id };
}

// ─── 3. Cria Resultados por BU DB + Dashboard Global ─────────────────────────
async function createDashboard(bu1: any, bu2: any): Promise<string> {
  step("Criando Dashboard Global...");

  // Página do Dashboard
  const page = await notion.pages.create({
    parent:     { type: "page_id", page_id: PARENT_ID },
    icon:       { type: "emoji", emoji: "🌐" },
    properties: { title: { title: rich("Dashboard Global — Diretoria / MAX") } },
    children: [
      {
        object: "block" as const, type: "heading_1" as const,
        heading_1: { rich_text: rich("🌐 Dashboard Global — Visão da Diretoria") },
      },
      {
        object: "block" as const, type: "paragraph" as const,
        paragraph: { rich_text: rich("Eagle eye da operação completa. Acompanhe SLA, carga por área, resultados mensais e alertas críticos.") },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // Navegação rápida
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: rich("🔗 Workspaces das BUs") },
      },
      {
        object: "block" as const, type: "link_to_page" as const,
        link_to_page: { type: "page_id" as const, page_id: bu1.pageId },
      },
      {
        object: "block" as const, type: "link_to_page" as const,
        link_to_page: { type: "page_id" as const, page_id: bu2.pageId },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // Coluna de alertas
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: rich("⚠️ SLA Crítico — Como monitorar") },
      },
      {
        object: "block" as const, type: "callout" as const,
        callout: {
          icon: { type: "emoji" as const, emoji: "🔴" },
          rich_text: rich(
            "Para ver tasks críticas de todas as BUs em tempo real:\n" +
            "1. Abra o banco Tasks BU1 ou Tasks BU2\n" +
            "2. Filtre por: Status SLA = 🔴 Crítico OU ⚫ Vencido\n" +
            "3. Salve como uma view chamada '⚠️ SLA Crítico'\n\n" +
            "O MAX monitora isso automaticamente e gera alertas por voz."
          ),
        },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // IDs para integração com MAX
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: rich("🔧 IDs dos Databases (integrações)") },
      },
      {
        object: "block" as const, type: "code" as const,
        code: {
          language: "plain text" as const,
          rich_text: rich(
            `Tasks BU1:              ${bu1.tasksDbId}\n` +
            `Calendário Editorial BU1: ${bu1.editorialDbId}\n` +
            `Tasks BU2:              ${bu2.tasksDbId}\n` +
            `Calendário Editorial BU2: ${bu2.editorialDbId}\n` +
            `Clientes:               ${CLIENTS_DB}`
          ),
        },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // Métricas mensais
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: rich("📊 Resultados por BU") },
      },
      {
        object: "block" as const, type: "paragraph" as const,
        paragraph: { rich_text: rich("Banco de dados de resultados mensais consolidados para acompanhamento da Diretoria.") },
      },
    ],
  });
  ok(`Dashboard Global criado: ${page.id}`);

  // Resultados por BU database inline no Dashboard
  const resultados = await notion.databases.create({
    parent: { type: "page_id", page_id: page.id },
    icon:   { type: "emoji", emoji: "📊" },
    title:  rich("Resultados por BU"),
    properties: {
      "Mês / BU":            { title: {} },
      "BU": {
        select: {
          options: [
            { name: "BU1 — Christian", color: "purple" },
            { name: "BU2 — Junior",    color: "blue"   },
            { name: "Global",          color: "gray"   },
          ],
        },
      },
      "Mês de Referência":   { date: {}                     },
      "Total de Tasks":      { number: { format: "number"  } },
      "Tasks Concluídas":    { number: { format: "number"  } },
      "Taxa de Conclusão %": { number: { format: "percent" } },
      "Tasks no Prazo":      { number: { format: "number"  } },
      "Taxa de SLA %":       { number: { format: "percent" } },
      "Tasks com Revisão":   { number: { format: "number"  } },
      "Tempo Médio (dias)":  { number: { format: "number"  } },
      "Notas do Período":    { rich_text: {}                 },
    },
  });
  ok(`Resultados por BU criado: ${resultados.id}`);

  return page.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 Setup Notion — Grupo Venda v2\n");

  try {
    await archiveOld();
    await updateClientsDB();

    const bu1 = await createBUWorkspace({
      emoji: "🟣", buName: "BU1", gestor: "Christian Castelhani", buShort: "BU1",
    });

    const bu2 = await createBUWorkspace({
      emoji: "🔵", buName: "BU2", gestor: "Junior Monte", buShort: "BU2",
    });

    const dashboardId = await createDashboard(bu1, bu2);

    console.log("\n\n🎉 Setup concluído!\n");
    console.log("══════════════════════════════════════════════");
    console.log(`🟣 BU1 page:               ${bu1.pageId}`);
    console.log(`   📋 Tasks BU1:           ${bu1.tasksDbId}`);
    console.log(`   📆 Editorial BU1:       ${bu1.editorialDbId}`);
    console.log(`🔵 BU2 page:               ${bu2.pageId}`);
    console.log(`   📋 Tasks BU2:           ${bu2.tasksDbId}`);
    console.log(`   📆 Editorial BU2:       ${bu2.editorialDbId}`);
    console.log(`🌐 Dashboard Global:       ${dashboardId}`);
    console.log("══════════════════════════════════════════════");
    console.log("\n✅ Abra o Notion — tudo está pronto para uso.");
    console.log("   Para adicionar views (Board, Calendar): clique em + ao lado da aba Table.");

  } catch (e: any) {
    console.error(`\n❌ Erro: ${e?.message || String(e)}`);
    if (e?.body) console.error(JSON.stringify(JSON.parse(e.body), null, 2));
    process.exit(1);
  }
}

main();
