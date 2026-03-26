/**
 * update-home.ts
 * Atualiza a página principal "Grupo Venda Operações" com:
 * - Descrição do sistema
 * - Tabela da equipe atualizada
 * - Tabela dos 11 agentes atualizada
 * - Navegação para os workspaces
 *
 * Execução: npx ts-node scripts/update-home.ts
 */

import { Client } from "@notionhq/client";

const TOKEN     = "ntn_b61414369988HFeNcHd5XJq3cYe0G8ATA3DSXm21Mmz0LC";
const PAGE_ID   = "31816e0ee44681a5b3c1ee15bf8dbe9d";

// Blocos antigos a arquivar (conteúdo obsoleto da página)
const OLD_BLOCKS = [
  "8e8fff46-22f1-4252-8488-37734b957ac8", // bullet status
  "05ae24da-0972-4e71-9ad5-5c268378abcd",
  "407f4074-e8c6-4f64-adfd-1e81bdaffbab",
  "05740991-9928-46d4-981a-7beb46a6b14a",
  "7cc9b134-33f4-4f2e-81be-3c7164429a3b",
  "2fe8f952-f8d5-44ad-86fc-9714816621b6",
  "d47e7c41-3662-4ee0-adc5-344af15fd879",
  "3aae262a-26c0-4e6f-9404-872d90f4d812",
  "82c884e5-a070-456b-a42d-fa6640a61b71",
  "74237e1c-7f7b-40b0-b28d-6028c94aedd8", // heading briefing
  "65fc59ac-dd13-4b05-ae02-669d6dc43d4c", // numbered items
  "cf5bd2db-86f0-4a68-975e-462d6392b2f3",
  "77ca626c-0ad0-4dc1-9de1-eb69f1390e72",
  "2405ed31-a024-44ef-a77e-f329b2c080a4",
  "bce5e8ff-23d0-4611-9d6c-4ff1d8f4e2ef", // heading equipe (antigo)
  "c94b30a5-c99f-476a-9ef2-e16d1c49f299", // tabela antiga
  "32c16e0e-e446-816e-abff-e32e0bcda4ff", // Tasks antigo (arquivado)
  "32c16e0e-e446-816f-bed1-df3530fee11a", // Editorial antigo
  "32c16e0e-e446-8198-afaf-c37ee55e030e", // Resultados antigo
];

const notion = new Client({ auth: TOKEN });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ok(msg: string)   { console.log(`  ✅ ${msg}`); }
function step(msg: string) { console.log(`\n📌 ${msg}`); }

function r(text: string) {
  return [{ type: "text" as const, text: { content: text } }];
}
function rb(text: string) {
  return [{ type: "text" as const, text: { content: text }, annotations: { bold: true } as any }];
}

function cell(text: string)  { return r(text);  }
function cellB(text: string) { return rb(text); }

// ─── 1. Arquiva blocos antigos ────────────────────────────────────────────────
async function clearOld() {
  step("Removendo conteúdo antigo...");
  for (const id of OLD_BLOCKS) {
    try {
      await notion.blocks.update({ block_id: id, archived: true } as any);
      ok(`Arquivado: ${id}`);
    } catch {
      ok(`Já removido: ${id}`);
    }
  }
}

// ─── 2. Adiciona novo conteúdo ────────────────────────────────────────────────
async function addContent() {
  step("Adicionando conteúdo atualizado...");

  await notion.blocks.children.append({
    block_id: PAGE_ID,
    children: [

      // ── Intro ────────────────────────────────────────────────────────────
      {
        object: "block" as const, type: "callout" as const,
        callout: {
          icon: { type: "emoji" as const, emoji: "🤖" },
          color: "blue_background" as const,
          rich_text: r(
            "Plataforma de agentes de IA operacionais do Grupo Venda. " +
            "11 agentes trabalham em paralelo com a equipe humana, assumindo tarefas operacionais, " +
            "organizacionais e analíticas — supervisionados por humanos nos pontos críticos."
          ),
        },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // ── Como funciona ────────────────────────────────────────────────────
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: r("⚙️ Como funciona") },
      },
      {
        object: "block" as const, type: "paragraph" as const,
        paragraph: { rich_text: r("Toda demanda entra pelo CS Supremo via WhatsApp, é triada e roteada para o agente especialista correto. O MAX monitora tudo em tempo real e escala para a Diretoria quando necessário. Gestores supervisionam e validam as entregas antes de ir ao cliente.") },
      },
      {
        object: "block" as const, type: "bulleted_list_item" as const,
        bulleted_list_item: { rich_text: r("📥 Cliente envia mensagem no WhatsApp → CS Supremo recebe, protocola e roteia") },
      },
      {
        object: "block" as const, type: "bulleted_list_item" as const,
        bulleted_list_item: { rich_text: r("⚙️ Agente especialista processa e executa a tarefa (design, tráfego, captação, etc.)") },
      },
      {
        object: "block" as const, type: "bulleted_list_item" as const,
        bulleted_list_item: { rich_text: r("🔎 Gestor da BU revisa e aprova antes de retornar ao cliente") },
      },
      {
        object: "block" as const, type: "bulleted_list_item" as const,
        bulleted_list_item: { rich_text: r("🌐 MAX monitora SLA, gargalos e escala para Diretoria quando necessário") },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // ── Briefing mínimo ──────────────────────────────────────────────────
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: r("📋 Briefing Mínimo Universal") },
      },
      {
        object: "block" as const, type: "paragraph" as const,
        paragraph: { rich_text: r("Qualquer demanda precisa responder as 4 perguntas abaixo antes de ser executada. Sem briefing completo, a task não avança de Triagem para Atribuído.") },
      },
      {
        object: "block" as const, type: "numbered_list_item" as const,
        numbered_list_item: { rich_text: r("Qual é o objetivo? (informar / vender / institucional / captar leads)") },
      },
      {
        object: "block" as const, type: "numbered_list_item" as const,
        numbered_list_item: { rich_text: r("Qual o formato? (Reels / Story / Carrossel / Anúncio / Landing / etc.)") },
      },
      {
        object: "block" as const, type: "numbered_list_item" as const,
        numbered_list_item: { rich_text: r("Qual o prazo ideal e existe alguma data fixa?") },
      },
      {
        object: "block" as const, type: "numbered_list_item" as const,
        numbered_list_item: { rich_text: r("Tem referências (1–2 links) e CTA definido?") },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // ── Status de Tasks ──────────────────────────────────────────────────
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: r("🔄 Fluxo de Status das Tasks") },
      },
      {
        object: "block" as const, type: "table" as const,
        table: {
          table_width: 2,
          has_column_header: true,
          has_row_header: false,
          children: [
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cellB("Status"), cellB("Significado")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("📥 Inbox"), cell("Captado do WhatsApp — sem dono ou briefing")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🔍 Triagem"), cell("CS coletando informações para o briefing")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("👤 Atribuído"), cell("Tem responsável e prazo definidos")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("⚙️ Em Produção"), cell("Time executando a demanda")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🔎 Revisão Interna"), cell("Gestor revisando antes de enviar ao cliente")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("⏳ Aprovação Cliente"), cell("Aguardando feedback do cliente")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("✏️ Ajustes"), cell("Rodada de ajuste pós-aprovação")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("✅ Concluído"), cell("Entregue e aprovado pelo cliente")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("⏸️ Pausado/Bloqueado"), cell("Impedido por dependência externa ou falta de insumo")] } },
          ],
        },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // ── Equipe ───────────────────────────────────────────────────────────
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: r("👥 Equipe Grupo Venda") },
      },
      {
        object: "block" as const, type: "table" as const,
        table: {
          table_width: 3,
          has_column_header: true,
          has_row_header: false,
          children: [
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cellB("Nome"), cellB("Cargo"), cellB("Área")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Bruno Zanardo"), cell("CEO / Diretor Comercial"), cell("Diretoria")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Armando Cavazana"), cell("CMO"), cell("Diretoria")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Christian Castelhani"), cell("Gestor de Projetos BU1"), cell("Gestão")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Junior Monte"), cell("Gestor de Projetos BU2"), cell("Gestão")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Bruno Lopes"), cell("Gestor de Tráfego"), cell("Tráfego")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Jessica"), cell("Tráfego Jr."), cell("Tráfego")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Ana Laura"), cell("Editora de Vídeo"), cell("Criativo")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Bruna Benevides"), cell("Designer"), cell("Criativo")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Rodrigo Evangelista"), cell("P&P — Automações e IA"), cell("Criativo")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Hebert Luidy"), cell("Videomaker"), cell("Audiovisual")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("André Talamonte"), cell("Videomaker"), cell("Audiovisual")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Daniel"), cell("Videomaker"), cell("Audiovisual")] } },
          ],
        },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // ── Agentes de IA ────────────────────────────────────────────────────
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: r("🤖 Agentes de IA — Arquitetura v1.0") },
      },
      {
        object: "block" as const, type: "paragraph" as const,
        paragraph: { rich_text: r("11 agentes organizados em 5 camadas. Cada agente tem um papel específico e se comunica apenas com os agentes autorizados no fluxo.") },
      },
      {
        object: "block" as const, type: "table" as const,
        table: {
          table_width: 4,
          has_column_header: true,
          has_row_header: false,
          children: [
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cellB("Agente"), cellB("Camada"), cellB("Missão"), cellB("Humano Assistido")] } },
            // Camada 0
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🔵 MAX"), cell("0 — Controller"), cell("Visão total da operação. Monitora, rastreia e escala para a Diretoria. Não recebe demandas operacionais."), cell("Bruno Zanardo (CEO)")] } },
            // Camada 1
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🔴 CS Supremo"), cell("1 — Entrada"), cell("Porta de entrada única de todas as demandas via WhatsApp. Triagem, classificação e roteamento para o agente certo."), cell("—")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🟢 Agente CMO"), cell("1 — Estratégia"), cell("Suporte estratégico ao CMO. Consolidação de relatórios, resumo diário, organização de briefings e monitoramento de prazos."), cell("Armando Cavazana (CMO)")] } },
            // Camada 2
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🟣 GPIA1"), cell("2 — Gestão BU1"), cell("Gestão de projetos IA da BU1. Cria e atualiza tasks no Notion, organiza arquivos, alerta sobre prazos e estrutura briefings."), cell("Christian Castelhani")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🟣 GPIA2"), cell("2 — Gestão BU2"), cell("Mesmas atribuições do GPIA1 aplicadas à BU2. Garante paridade operacional entre as duas Business Units."), cell("Junior Monte")] } },
            // Camada 3
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🟡 GTPRO"), cell("3 — Tráfego"), cell("Orquestrador de tráfego pago. Visão macro de todas as campanhas, consolida relatórios e controla orçamento total."), cell("—")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("  ↳ GT Analítico"), cell("Sub-agente"), cell("Análise de performance (CTR, CPC, ROAS, ROI). Gera relatórios, identifica tendências e campanhas com baixo desempenho."), cell("Bruno Lopes / Jessica")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("  ↳ GT Execução"), cell("Sub-agente"), cell("Aplica ajustes operacionais nas campanhas: lances, orçamentos, testes A/B, duplicação de conjuntos vencedores."), cell("Bruno Lopes / Jessica")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🟡 Sênior PerNEW"), cell("3 — Social Media"), cell("Social media sênior. Calendário editorial, copies, legendas, gestão de contas no Meta Business Suite e Google Meu Negócio."), cell("Christian, Junior, GPIA1, GPIA2")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🟡 CrIA"), cell("3 — Criativo"), cell("Geração de referências visuais, moodboards, apoio a layouts e peças, variações de copy criativo. Usa Gemini e Nanobanana."), cell("Bruna Benevides")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🟡 Gestora de Captação"), cell("3 — Audiovisual"), cell("Logística de captação. Agenda videomakers, envia confirmações, organiza arquivos no Drive e abre tasks de edição."), cell("Hebert, André, Daniel")] } },
          ],
        },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // ── Workspaces ───────────────────────────────────────────────────────
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: r("📁 Workspaces e Databases") },
      },
      {
        object: "block" as const, type: "table" as const,
        table: {
          table_width: 2,
          has_column_header: true,
          has_row_header: false,
          children: [
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cellB("Item"), cellB("Descrição")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🟣 BU1 — Christian Castelhani"), cell("Workspace operacional da BU1. Contém o banco de Tasks BU1 (com fórmulas de SLA automáticas) e o Calendário Editorial BU1.")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🔵 BU2 — Junior Monte"), cell("Workspace operacional da BU2. Mesma estrutura da BU1, dedicado à carteira do Junior.")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("🌐 Dashboard Global"), cell("Visão consolidada da Diretoria e do MAX. Links para ambas as BUs, banco de Resultados por BU e IDs dos databases para integrações.")] } },
          ],
        },
      },
      { object: "block" as const, type: "divider" as const, divider: {} },

      // ── SLAs ─────────────────────────────────────────────────────────────
      {
        object: "block" as const, type: "heading_2" as const,
        heading_2: { rich_text: r("⏱️ SLAs Padrão") },
      },
      {
        object: "block" as const, type: "table" as const,
        table: {
          table_width: 3,
          has_column_header: true,
          has_row_header: false,
          children: [
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cellB("Tipo de Entrega"), cellB("Prioridade"), cellB("Prazo")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Resposta ao cliente (WhatsApp)"), cell("🔴 P0"), cell("30 minutos")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Qualificação de lead"), cell("🔴 P0"), cell("1 hora")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Anúncio / criativo"), cell("🟠 P1"), cell("24 horas úteis")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Ajuste pós-aprovação"), cell("🟠 P1"), cell("24 horas úteis")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Post feed / Story"), cell("🟡 P2"), cell("48 horas úteis")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Carrossel"), cell("🟡 P2"), cell("72 horas úteis")] } },
            { object: "block" as const, type: "table_row" as const, table_row: { cells: [cell("Reels editado"), cell("🟡 P2"), cell("96 horas úteis")] } },
          ],
        },
      },
    ],
  });

  ok("Conteúdo adicionado com sucesso.");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 Atualizando página Grupo Venda Operações...\n");
  try {
    await clearOld();
    await addContent();
    console.log("\n🎉 Página atualizada! Abra o Notion para conferir.");
  } catch (e: any) {
    console.error(`\n❌ Erro: ${e?.message || String(e)}`);
    if (e?.body) {
      try { console.error(JSON.stringify(JSON.parse(e.body), null, 2)); } catch {}
    }
    process.exit(1);
  }
}

main();
