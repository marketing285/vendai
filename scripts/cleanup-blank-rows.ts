/**
 * cleanup-blank-rows.ts
 * Apaga linhas em branco de todas as tabelas do NocoDB.
 * "Em branco" = campo principal (Tarefa / Nome do Cliente) vazio ou null.
 *
 * Uso:
 *   DRY_RUN=true npx ts-node scripts/cleanup-blank-rows.ts   ← só mostra
 *   npx ts-node scripts/cleanup-blank-rows.ts                ← deleta de verdade
 */

import "dotenv/config";

const BASE_URL = process.env.NOCODB_URL ?? "";
const BASE_ID  = process.env.NOCODB_BASE_ID ?? "";
const TOKEN    = process.env.NOCODB_TOKEN ?? "";
const DRY_RUN  = process.env.DRY_RUN === "true";

if (!TOKEN) { console.error("❌ NOCODB_TOKEN não configurado"); process.exit(1); }

const TABLES: Array<{ id: string; nome: string; campoChave: string }> = [
  { id: "m9zoy59q6nnwbdf", nome: "Tasks BU1",         campoChave: "Tarefa" },
  { id: "mi7dptf2jjezxwe", nome: "Tasks BU2",         campoChave: "Tarefa" },
  { id: "ms60o4e8iqbj134", nome: "Tasks BU3",         campoChave: "Tarefa" },
  { id: "mmdcj3520zc4w4r", nome: "Tasks Design",      campoChave: "Tarefa" },
  { id: "m96rva43spx02v8", nome: "Tasks Edição",      campoChave: "Tarefa" },
  { id: "monizzmow55l4ou", nome: "Depósito Design",   campoChave: "Tarefa" },
  { id: "mkq6lpidc7k7oog", nome: "Depósito Edição",   campoChave: "Tarefa" },
  { id: "m6jiwooxmwaadrg", nome: "Clientes BU1",      campoChave: "Nome" },
  { id: "mo8f8vj4phh4m66", nome: "Clientes BU2",      campoChave: "Nome" },
  { id: "m2uhsn6tssh8wix", nome: "Clientes BU3",      campoChave: "Nome" },
];

async function ndbFetch(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "xc-token": TOKEN },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

const DATA = (tableId: string) => `/api/v1/db/data/noco/${BASE_ID}/${tableId}`;

async function listAll(tableId: string): Promise<any[]> {
  let page = 1;
  const all: any[] = [];
  while (true) {
    const r = await ndbFetch("GET", `${DATA(tableId)}?limit=200&page=${page}`);
    const rows = r?.list ?? [];
    all.push(...rows);
    if (rows.length < 200) break;
    page++;
  }
  return all;
}

async function deleteRow(tableId: string, rowId: number): Promise<void> {
  await ndbFetch("DELETE", `${DATA(tableId)}/${rowId}`);
}

async function main() {
  console.log(`\n${DRY_RUN ? "🔍 DRY RUN — nada será deletado" : "🗑️  EXECUTANDO — linhas serão deletadas"}\n`);

  let totalDeletadas = 0;

  for (const table of TABLES) {
    let rows: any[];
    try {
      rows = await listAll(table.id);
    } catch (e: any) {
      console.warn(`⚠️  ${table.nome}: erro ao listar — ${e.message}`);
      continue;
    }

    const brancas = rows.filter(r => {
      const val = r[table.campoChave];
      return val === null || val === undefined || String(val).trim() === "";
    });

    if (brancas.length === 0) {
      console.log(`✅ ${table.nome}: sem linhas em branco (${rows.length} linhas)`);
      continue;
    }

    console.log(`\n📋 ${table.nome}: ${brancas.length} linha(s) em branco de ${rows.length} total`);
    for (const row of brancas) {
      const id = row["Id"] as number;
      console.log(`   → ID ${id} | ${JSON.stringify(Object.fromEntries(Object.entries(row).filter(([,v]) => v != null && v !== "").slice(0, 3)))}`);

      if (!DRY_RUN) {
        try {
          await deleteRow(table.id, id);
          console.log(`   ✅ ID ${id} deletado`);
          totalDeletadas++;
        } catch (e: any) {
          console.warn(`   ⚠️  Erro ao deletar ID ${id}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 150));
      }
    }

    if (DRY_RUN) totalDeletadas += brancas.length;
  }

  console.log(`\n${DRY_RUN ? "🔍 Seriam deletadas" : "🗑️  Deletadas"}: ${totalDeletadas} linha(s) em branco\n`);
}

main().catch(console.error);
