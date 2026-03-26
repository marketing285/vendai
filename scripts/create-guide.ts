/**
 * create-guide.ts
 * Cria a página "Guia de Uso — Gestores de Projetos" no Notion
 * Execução: npx ts-node scripts/create-guide.ts
 */

import { Client } from "@notionhq/client";

const TOKEN    = "ntn_b61414369988HFeNcHd5XJq3cYe0G8ATA3DSXm21Mmz0LC";
const PARENT_ID = "31816e0ee44681a5b3c1ee15bf8dbe9d";

const notion = new Client({ auth: TOKEN });

function r(text: string)  { return [{ type: "text" as const, text: { content: text } }]; }
function rb(text: string) { return [{ type: "text" as const, text: { content: text }, annotations: { bold: true } as any }]; }
function cell(t: string)  { return r(t); }
function cellB(t: string) { return rb(t); }

function h1(text: string) {
  return { object: "block" as const, type: "heading_1" as const, heading_1: { rich_text: r(text) } };
}
function h2(text: string) {
  return { object: "block" as const, type: "heading_2" as const, heading_2: { rich_text: r(text) } };
}
function h3(text: string) {
  return { object: "block" as const, type: "heading_3" as const, heading_3: { rich_text: r(text) } };
}
function p(text: string) {
  return { object: "block" as const, type: "paragraph" as const, paragraph: { rich_text: r(text) } };
}
function bullet(text: string) {
  return { object: "block" as const, type: "bulleted_list_item" as const, bulleted_list_item: { rich_text: r(text) } };
}
function numbered(text: string) {
  return { object: "block" as const, type: "numbered_list_item" as const, numbered_list_item: { rich_text: r(text) } };
}
function divider() {
  return { object: "block" as const, type: "divider" as const, divider: {} };
}
function callout(emoji: string, text: string, color = "yellow_background") {
  return {
    object: "block" as const, type: "callout" as const,
    callout: { icon: { type: "emoji" as const, emoji: emoji as any }, color: color as any, rich_text: r(text) },
  };
}
function quote(text: string) {
  return { object: "block" as const, type: "quote" as const, quote: { rich_text: r(text) } };
}
function code(text: string) {
  return {
    object: "block" as const, type: "code" as const,
    code: { language: "plain text" as const, rich_text: r(text) },
  };
}
function table(rows: ReturnType<typeof cell>[][], hasHeader = true) {
  return {
    object: "block" as const, type: "table" as const,
    table: {
      table_width: rows[0].length,
      has_column_header: hasHeader,
      has_row_header: false,
      children: rows.map(cells => ({
        object: "block" as const, type: "table_row" as const,
        table_row: { cells },
      })),
    },
  };
}

async function main() {
  console.log("\n🚀 Criando guia no Notion...\n");

  const page = await notion.pages.create({
    parent:     { type: "page_id", page_id: PARENT_ID },
    icon:       { type: "emoji", emoji: "📖" },
    properties: { title: { title: r("📖 Guia de Uso — Gestores de Projetos") } },
    children: [

      // ── Header ─────────────────────────────────────────────────────────
      h1("📖 Guia de Uso do Notion — Gestores de Projetos"),
      callout("💡", "Este guia é para Christian (BU1) e Junior (BU2). Aqui você aprende a criar tasks, acompanhar SLA, usar o Calendário Editorial e manter a operação organizada.", "blue_background"),
      divider(),

      // ── 1. Acessando ───────────────────────────────────────────────────
      h2("1. Acessando seu Workspace"),
      p("Ao abrir o Notion, na barra lateral encontre a pasta Grupo Venda Operações. Dentro dela:"),
      bullet("🟣 BU1 — Christian Castelhani → seu workspace completo"),
      bullet("🔵 BU2 — Junior Monte → workspace do Junior"),
      bullet("🌐 Dashboard Global → visão da Diretoria e do MAX"),
      p("Clique na sua BU para abrir. Você vai ver dois bancos de dados prontos:"),
      bullet("📋 Tasks BU1 (ou BU2) — onde vivem todas as suas demandas"),
      bullet("📆 Calendário Editorial BU1 (ou BU2) — pauta mensal dos clientes"),
      divider(),

      // ── 2. Criando uma Task ─────────────────────────────────────────────
      h2("2. Criando uma Task"),
      p("Toda demanda que chegar — WhatsApp, reunião ou solicitação interna — precisa virar uma task."),
      h3("Passo a passo:"),
      numbered("Abra o banco 📋 Tasks da sua BU"),
      numbered("Clique em + New (botão azul no canto inferior esquerdo da tabela)"),
      numbered("Preencha os campos obrigatórios:"),
      table([
        [cellB("Campo"), cellB("O que colocar")],
        [cell("Tarefa"),            cell("Nome claro e direto. Ex: Reels Junho — Hidroaço")],
        [cell("Área"),              cell("Design / Vídeo / Tráfego / Conteúdo / etc.")],
        [cell("Tipo"),              cell("Nova Demanda / Aprovação / Ajuste / etc.")],
        [cell("Status"),            cell("Começa sempre em 📥 Inbox")],
        [cell("Prioridade"),        cell("🔴 P0 (urgente) · 🟠 P1 (alta) · 🟡 P2 (normal)")],
        [cell("Responsável"),       cell("Quem vai executar a demanda")],
        [cell("Prazo de Entrega"),  cell("Data limite de entrega ao cliente")],
        [cell("Link do Documento"), cell("Link do Drive, Canva ou briefing")],
      ]),
      numbered("Clique fora para salvar"),
      callout("⚠️", "Antes de mover uma task para 👤 Atribuído, o briefing precisa estar completo (objetivo, formato, prazo e referências). Marque o campo Briefing Completo ✓ quando estiver ok.", "red_background"),
      divider(),

      // ── 3. Status ──────────────────────────────────────────────────────
      h2("3. Entendendo os Status"),
      p("Toda task percorre esse caminho:"),
      code("📥 Inbox  →  🔍 Triagem  →  👤 Atribuído  →  ⚙️ Em Produção\n→  🔎 Revisão Interna  →  ⏳ Aprovação Cliente  →  ✏️ Ajustes  →  ✅ Concluído"),
      h3("Sua responsabilidade como gestor:"),
      bullet("Mover de 📥 Inbox para 🔍 Triagem assim que receber a demanda"),
      bullet("Garantir briefing completo antes de mover para 👤 Atribuído"),
      bullet("Revisar internamente antes de mover para ⏳ Aprovação Cliente"),
      bullet("Nunca enviar ao cliente sem passar por 🔎 Revisão Interna"),
      bullet("Se travar por dependência externa: mova para ⏸️ Pausado/Bloqueado e preencha o Motivo de Bloqueio"),
      divider(),

      // ── 4. SLA ─────────────────────────────────────────────────────────
      h2("4. Monitorando o SLA (Prazo)"),
      p("O banco de tasks tem duas colunas automáticas que calculam o prazo sozinhas — você não precisa preencher nada:"),
      table([
        [cellB("Coluna"),          cellB("O que significa")],
        [cell("Dias até Prazo"),   cell("Quantos dias faltam para o prazo vencer")],
        [cell("Status SLA"),       cell("Situação atual do prazo — calculado automaticamente")],
      ]),
      h3("Cores do Status SLA:"),
      bullet("🟢 OK — prazo tranquilo, mais de 2 dias"),
      bullet("🟡 Atenção — faltam 2 dias ou menos"),
      bullet("🔴 Crítico — falta 1 dia ou menos"),
      bullet("⚫ Vencido — prazo passou"),
      bullet("✅ Concluído — task finalizada"),
      callout("📌", "Toda manhã, filtre por 🔴 Crítico e ⚫ Vencido para ver o que precisa de atenção imediata.", "yellow_background"),
      divider(),

      // ── 5. Views ───────────────────────────────────────────────────────
      h2("5. Usando as Views (Visualizações)"),
      p("O banco abre em Table por padrão. Você pode adicionar outras views para facilitar o trabalho."),
      h3("Como adicionar uma view:"),
      numbered("Clique no + ao lado da aba Table (no topo do banco)"),
      numbered("Escolha o tipo: Board, Calendar, List, etc."),
      numbered("Configure o agrupamento conforme a tabela abaixo"),
      h3("Views recomendadas para criar:"),
      table([
        [cellB("View"),          cellB("Tipo"),     cellB("Agrupar por"),    cellB("Para que serve")],
        [cell("🗂️ Kanban"),      cell("Board"),     cell("Status"),          cell("Ver o fluxo completo das tasks")],
        [cell("📐 Por Área"),    cell("Board"),     cell("Área"),            cell("Ver carga distribuída por área")],
        [cell("📅 Calendário"),  cell("Calendar"),  cell("Prazo de Entrega"),cell("Ver o que vence quando")],
        [cell("⚠️ SLA Crítico"), cell("Table"),     cell("—"),               cell("Tasks críticas e vencidas")],
        [cell("✅ Concluídas"),  cell("Table"),     cell("—"),               cell("Histórico de entregas")],
      ]),
      h3("Como criar o filtro ⚠️ SLA Crítico:"),
      numbered("Crie uma view Table e nomeie como ⚠️ SLA Crítico"),
      numbered("Clique em Filter"),
      numbered("Adicione: Status SLA · is · 🔴 Crítico"),
      numbered("Clique em + Add filter → Status SLA · is · ⚫ Vencido"),
      numbered("Altere o operador para OR"),
      divider(),

      // ── 6. Editorial ───────────────────────────────────────────────────
      h2("6. Calendário Editorial"),
      p("O 📆 Calendário Editorial é onde você organiza a pauta mensal de cada cliente."),
      h3("Como criar uma pauta:"),
      numbered("Abra o Calendário Editorial da sua BU"),
      numbered("Clique em + New"),
      numbered("Preencha os campos:"),
      table([
        [cellB("Campo"),              cellB("O que colocar")],
        [cell("Pauta"),               cell("Ex: Post Dia dos Namorados — DNA Imóveis")],
        [cell("Formato"),             cell("Reels / Story / Carrossel / Feed / Anúncio")],
        [cell("Canal"),               cell("Instagram / Facebook / TikTok / Google")],
        [cell("Data de Publicação"),  cell("Data que vai ao ar")],
        [cell("Status"),              cell("Começa em 📝 Rascunho")],
        [cell("Responsável"),         cell("Quem vai produzir")],
        [cell("Task Vinculada"),      cell("Link para a task de produção no banco Tasks")],
      ]),
      h3("Fluxo do status editorial:"),
      code("📝 Rascunho  →  ⚙️ Em Produção  →  ✅ Aprovado  →  📢 Publicado"),
      divider(),

      // ── 7. Rotina ──────────────────────────────────────────────────────
      h2("7. Rotina Diária Sugerida"),
      h3("☀️ Início do dia (10 min):"),
      numbered("Abra sua BU no Notion"),
      numbered("Veja o filtro ⚠️ SLA Crítico — resolva ou acione o responsável"),
      numbered("Revise tasks em ⏳ Aprovação Cliente há mais de 24h — faça follow-up com o cliente"),
      numbered("Verifique tasks em 🔎 Revisão Interna — aprove ou solicite ajuste"),
      h3("⚙️ Durante o dia:"),
      bullet("Ao receber nova demanda → crie a task imediatamente em 📥 Inbox"),
      bullet("Ao atribuir para alguém → mova para 👤 Atribuído com briefing completo"),
      bullet("Ao revisar uma entrega → mova para ⏳ Aprovação Cliente"),
      h3("🌙 Final do dia (5 min):"),
      bullet("Atualize o status de todas as tasks que avançaram"),
      bullet("Tasks concluídas → marque como ✅ Concluído e preencha Data de Conclusão"),
      divider(),

      // ── 8. Regras de Ouro ──────────────────────────────────────────────
      h2("8. Regras de Ouro"),
      quote("📌 Toda demanda vira task. Se não está no Notion, não existe."),
      quote("📌 Sem briefing = sem execução. A task só avança para Atribuído com briefing completo."),
      quote("📌 Você revisa antes do cliente ver. Sempre passe por Revisão Interna antes de mandar ao cliente."),
      quote("📌 Atualize o status em tempo real. Não deixe tasks paradas num status errado — o MAX e a Diretoria monitoram tudo."),
      quote("📌 Use o Motivo de Bloqueio. Se uma task travar, documente o motivo para a Diretoria agir."),
      divider(),

      // ── 9. FAQ ─────────────────────────────────────────────────────────
      h2("9. Dúvidas Frequentes"),
      table([
        [cellB("Dúvida"),                                           cellB("Resposta")],
        [cell("Onde coloco o link do arquivo do Drive?"),           cell("No campo Link do Documento dentro da task.")],
        [cell("Posso ter mais de um responsável numa task?"),       cell("Sim — o campo Responsável aceita múltiplas pessoas. Defina um responsável principal.")],
        [cell("Como sei se uma task está atrasada?"),               cell("O campo Status SLA mostra automaticamente. Veja também a view ⚠️ SLA Crítico.")],
        [cell("O que faço quando o cliente aprova?"),               cell("Mova para ✅ Concluído e preencha a Data de Conclusão.")],
        [cell("O que faço quando o cliente pede ajuste?"),          cell("Mova para ✏️ Ajustes, documente em Notas e reatribua ao executor.")],
        [cell("Posso ver as tasks da outra BU?"),                   cell("Sim — abra o banco 📋 Tasks na página principal Grupo Venda Operações para ver tudo agrupado.")],
      ]),
      divider(),

      // ── Rodapé ─────────────────────────────────────────────────────────
      callout("🤖", "Dúvidas sobre o sistema? Fale com Bruno (CEO) ou Armando (CMO).\nO MAX monitora a operação em tempo real e pode ser consultado a qualquer momento.", "gray_background"),
      p("Grupo Venda · Plataforma de Agentes IA v1.0 · Março 2026"),
    ],
  });

  console.log(`\n✅ Guia criado: ${page.id}`);
  console.log("🎉 Abra o Notion para conferir a página 📖 Guia de Uso — Gestores de Projetos");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
