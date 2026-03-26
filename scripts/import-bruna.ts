/**
 * import-bruna.ts
 * Cria o banco "Produções de Design — Bruna Benevides" no Notion
 * e importa todos os registros históricos do CSV.
 * Execução: cd /Users/grupovenda/vendai && npx ts-node scripts/import-bruna.ts
 */

import { Client } from "@notionhq/client";
import * as fs from "fs";

const TOKEN    = "ntn_b61414369988HFeNcHd5XJq3cYe0G8ATA3DSXm21Mmz0LC";
const PARENT   = "31816e0ee44681a5b3c1ee15bf8dbe9d"; // Grupo Venda Operações

const notion = new Client({ auth: TOKEN });

// ─── CSV parser (suporta campos com vírgula entre aspas) ─────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; }
    else if (line[i] === "," && !inQ) { result.push(cur); cur = ""; }
    else cur += line[i];
  }
  result.push(cur);
  return result;
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  return lines.slice(1)
    .map(line => {
      const vals = parseCSVLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").trim(); });
      return obj;
    })
    .filter(r => r["ClientName"] || r["designerName"]);
}

// ─── Converte DD/MM/YYYY → YYYY-MM-DD (pega primeira data se houver múltiplas) ─
function toISO(s?: string): string | null {
  if (!s) return null;
  const first = s.split(",")[0].trim();
  const m = first.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function sel(name: string) { return name ? { select: { name } } : undefined; }
function url(u: string)    { return u.startsWith("http") ? { url: u } : undefined; }
function num(n: string)    { const v = parseInt(n); return !isNaN(v) && v > 0 ? { number: v } : undefined; }
function dt(s?: string)    { const d = toISO(s); return d ? { date: { start: d } } : undefined; }

// ─── Cria o banco de dados ───────────────────────────────────────────────────
async function createDatabase(): Promise<string> {
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT },
    icon:   { type: "emoji",   emoji: "🎨" as any },
    title:  [{ type: "text",   text: { content: "Produções de Design — Bruna Benevides" } }],
    properties: {
      "Tarefa":                  { title: {} },
      "Cliente":                 { select: {} },
      "Data":                    { date: {} },
      "Urgência":                { select: { options: [
        { name: "Urgente", color: "red"    },
        { name: "Média",   color: "yellow" },
        { name: "Suave",   color: "green"  },
      ]}},
      "Tipo":                    { select: {} },
      "Quantidade":              { number: {} },
      "Responsável":             { select: {} },
      "Briefing":                { rich_text: {} },
      "Status":                  { select: { options: [
        { name: "Entregue",      color: "green"  },
        { name: "Em Aprovação",  color: "yellow" },
        { name: "Em StandBy",    color: "orange" },
        { name: "Em Produção",   color: "blue"   },
      ]}},
      "Responsável Aprovação":   { select: {} },
      "Link de Entrega":         { url: {} },
      "Data de Entrega":         { date: {} },
      "Precisou de Alteração?":  { select: { options: [
        { name: "Não",       color: "green" },
        { name: "Sim",       color: "red"   },
        { name: "Aguardando",color: "gray"  },
      ]}},
      "Complexidade":            { select: {} },
      "Nº de Alterações":        { number: {} },
      "Data Alteração":          { date: {} },
    },
  });
  return db.id;
}

// ─── Importa uma linha ───────────────────────────────────────────────────────
async function importRow(dbId: string, row: Record<string, string>): Promise<void> {
  const client  = row["ClientName"]?.trim()  || "—";
  const tipo    = row["itemType"]?.trim()    || "—";
  const data    = row["Date"]?.trim()        || "";

  const props: Record<string, any> = {
    "Tarefa": { title: [{ text: { content: `${client} — ${tipo}` } }] },
  };

  if (client !== "—") props["Cliente"] = sel(client);
  const d = dt(data); if (d) props["Data"] = d;

  const urg = row["Urgência"]?.trim(); if (urg) props["Urgência"] = sel(urg);
  if (tipo  !== "—") props["Tipo"] = sel(tipo);

  const q = num(row["Quantity"]); if (q) props["Quantidade"] = q;

  const resp = row["Responsavel"]?.trim() || row["Responsável"]?.trim();
  if (resp) props["Responsável"] = sel(resp);

  const briefing = row["Briefing"]?.trim();
  if (briefing) props["Briefing"] = { rich_text: [{ text: { content: briefing.slice(0, 2000) } }] };

  const status = row["Status"]?.trim(); if (status) props["Status"] = sel(status);

  const aprov = row["Responsável aprovação"]?.trim()
              || row["Responsável aprovacão"]?.trim()
              || row["Responsavel aprovacao"]?.trim();
  if (aprov) props["Responsável Aprovação"] = sel(aprov);

  const link = row["Link de entrega"]?.trim();
  const u = link ? url(link) : undefined; if (u) props["Link de Entrega"] = u;

  const de = dt(row["Data de entrega"]); if (de) props["Data de Entrega"] = de;

  const rev = row["Precisou de Alteração?"]?.trim()
            || row["Precisou de Alteracão?"]?.trim();
  if (rev) props["Precisou de Alteração?"] = sel(rev);

  const comp = row["Complexidade"]?.trim(); if (comp) props["Complexidade"] = sel(comp);
  const nc   = num(row["Nº de Alterações"] || row["Nº de Alteracoes"] || "");
  if (nc) props["Nº de Alterações"] = nc;

  const da = dt(row["Data Alteração"] || row["Data Alteracão"]);
  if (da) props["Data Alteração"] = da;

  // Remove undefined values
  const clean = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined));

  await notion.pages.create({ parent: { database_id: dbId }, properties: clean });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const csvPath = "/Users/grupovenda/Downloads/Tarefas Bruna - Tarefas Gerais.csv";

  if (!fs.existsSync(csvPath)) {
    console.error("❌ CSV não encontrado em:", csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const rows    = parseCSV(content);
  console.log(`\n📊 ${rows.length} registros encontrados no CSV`);
  console.log("🎨 Criando banco de dados no Notion...\n");

  const dbId = await createDatabase();
  console.log(`✅ Banco criado: ${dbId}`);
  console.log(`\n⬆️  Importando ${rows.length} registros (pode levar alguns minutos)...\n`);

  let ok = 0; let err = 0;

  for (let i = 0; i < rows.length; i++) {
    try {
      await importRow(dbId, rows[i]);
      ok++;
      if ((i + 1) % 20 === 0 || i + 1 === rows.length) {
        process.stdout.write(`  ${i + 1}/${rows.length} ✅\n`);
      }
    } catch (e: any) {
      err++;
      const msg = e?.message || String(e);
      console.error(`  ❌ Linha ${i + 2}: ${msg.slice(0, 120)}`);
    }
    // ~3 req/s — respeita rate limit do Notion
    await new Promise(r => setTimeout(r, 340));
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Importação concluída: ${ok} importados${err > 0 ? `, ${err} erros` : ""}`);
  console.log(`🔗 https://notion.so/${dbId.replace(/-/g, "")}`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
