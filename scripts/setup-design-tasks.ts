/**
 * setup-design-tasks.ts
 * Cria o banco "Tasks de Design — Bruna Benevides" no Notion.
 * Schema compatível com os quadros BU1/BU2 E com Produções de Design.
 *
 * Execução: cd /Users/grupovenda/vendai && npx ts-node scripts/setup-design-tasks.ts
 */

import { Client } from "@notionhq/client";

const TOKEN  = process.env.NOTION_TOKEN ?? "ntn_b61414369988HFeNcHd5XJq3cYe0G8ATA3DSXm21Mmz0LC";
const PARENT = "31816e0ee44681a5b3c1ee15bf8dbe9d"; // Grupo Venda Operações

const notion = new Client({ auth: TOKEN });

async function main() {
  console.log("🎨 Criando banco 'Tasks de Design — Bruna Benevides'...\n");

  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT },
    icon:   { type: "emoji",   emoji: "🖌️" as any },
    title:  [{ type: "text",   text: { content: "Tasks de Design — Bruna Benevides" } }],
    properties: {
      // ── Identidade da task ─────────────────────────────────────────────────
      "Tarefa": { title: {} },

      "Status": { select: { options: [
        { name: "📥 Inbox",              color: "gray"   },
        { name: "👤 Atribuído",          color: "blue"   },
        { name: "⚙️ Em Produção",        color: "purple" },
        { name: "🔎 Revisão Interna",    color: "yellow" },
        { name: "⏳ Aprovação Cliente",  color: "orange" },
        { name: "✏️ Ajustes",            color: "pink"   },
        { name: "✅ Entregue",           color: "green"  },
        { name: "⏸️ Pausado/Bloqueado",  color: "red"    },
      ]}},

      "Prioridade": { select: { options: [
        { name: "🔴 P0 — Emergência", color: "red"    },
        { name: "🟠 P1 — Alta",       color: "orange" },
        { name: "🟡 P2 — Normal",     color: "yellow" },
        { name: "🟢 P3 — Baixa",      color: "green"  },
      ]}},

      "Urgência": { select: { options: [
        { name: "Urgente", color: "red"    },
        { name: "Média",   color: "yellow" },
        { name: "Suave",   color: "green"  },
      ]}},

      // ── Dados do cliente / peça ────────────────────────────────────────────
      "Cliente":      { select: {} },
      "Tipo de Peça": { select: { options: [
        { name: "Feed",     color: "blue"   },
        { name: "Story",    color: "purple" },
        { name: "Carrosel", color: "pink"   },
        { name: "Capa",     color: "green"  },
        { name: "Reels",    color: "orange" },
        { name: "Banner",   color: "yellow" },
        { name: "Logo",     color: "red"    },
        { name: "Outros",   color: "gray"   },
      ]}},
      "Quantidade":   { number: { format: "number" } },

      // ── Prazos ─────────────────────────────────────────────────────────────
      "Prazo de Entrega": { date: {} },
      "Data de Entrega":  { date: {} },

      // ── Pessoas ────────────────────────────────────────────────────────────
      "Responsável": { people: {} },

      // ── Briefing e entrega ─────────────────────────────────────────────────
      "Briefing":       { rich_text: {} },
      "Link de Entrega": { url: {} },

      // ── Revisões (compatível com Produções de Design) ──────────────────────
      "Precisou de Alteração?": { select: { options: [
        { name: "Não",        color: "green"  },
        { name: "Sim",        color: "red"    },
        { name: "Aguardando", color: "gray"   },
      ]}},
      "Nº de Alterações": { number: {} },

      // ── Complexidade ───────────────────────────────────────────────────────
      "Complexidade": { select: { options: [
        { name: "Simples",    color: "green"  },
        { name: "Médio",      color: "yellow" },
        { name: "Complexo",   color: "red"    },
      ]}},

      // ── Rastreabilidade de origem (BU1/BU2 ou manual) ─────────────────────
      "Origem": { select: { options: [
        { name: "Manual",  color: "gray"   },
        { name: "BU1",     color: "blue"   },
        { name: "BU2",     color: "purple" },
      ]}},
      "Task Origem": { rich_text: {} }, // URL ou protocolo da task de origem

      // ── Controle de sync automático ───────────────────────────────────────
      "Sincronizado": { checkbox: {} }, // true = já foi copiado para Produções de Design

      // ── Responsável pela aprovação (igual a Produções) ────────────────────
      "Responsável Aprovação": { select: {} },
    },
  });

  const id = db.id;
  const idClean = id.replace(/-/g, "");

  console.log(`✅ Banco criado com sucesso!`);
  console.log(`\n📋 ID para o notion-tool.ts:`);
  console.log(`   tasks_design_bruna: "${idClean}",`);
  console.log(`\n🔗 Link direto: https://notion.so/${idClean}`);
  console.log(`\n⚠️  Copie o ID acima e atualize NOTION_DBS em src/agents/controller/notion-tool.ts`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
