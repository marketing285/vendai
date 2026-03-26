/**
 * import-bruna.mjs
 * Importa o histórico de tarefas da Bruna na tabela Produções de Design do NocoDB.
 * Usage: NOCODB_TOKEN=xxx node scripts/import-bruna.mjs
 */

import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const NOCODB_BASE_URL = process.env.NOCODB_URL ?? "https://vendai-docudb.aw5nou.easypanel.host";
const NOCODB_BASE_ID  = "pbyj8wdxyb1j3ix";
const TABLE_ID        = "mge0ggcuapeaxiq"; // Produções de Design

const TOKEN = process.env.NOCODB_TOKEN;
if (!TOKEN) { console.error("NOCODB_TOKEN não configurado"); process.exit(1); }

// ── CSV parser básico respeitando campos com vírgula entre aspas ──────────────
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const headers = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    const cols = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (cols[i] ?? "").trim(); });
    return obj;
  });
}

function splitLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === "," && !inQuote) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

// DD/MM/YYYY → YYYY-MM-DD
function toISO(date) {
  if (!date) return null;
  const m = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// ── Cria uma linha na tabela ──────────────────────────────────────────────────
async function createRow(fields) {
  const res = await fetch(
    `${NOCODB_BASE_URL}/api/v1/db/data/noco/${NOCODB_BASE_ID}/${TABLE_ID}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "xc-token": TOKEN },
      body: JSON.stringify(fields),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ── Normalização de valores do CSV para opções do NocoDB ─────────────────────
const CLIENT_MAP = {
  "Fernanda":   "Fernanda Aoki",
  "Fernanda ":  "Fernanda Aoki",
  "Moura leite":"Moura Leite",
  "Hidroaço":   "Hidroaco",
  "AWF":        "AWF Contabil",
  "Geezer":     "Geezer Cervejaria",
  "Agropet":    "Atacado Agropet",
};

function normalizeClient(v) {
  const trimmed = (v ?? "").trim();
  return CLIENT_MAP[trimmed] ?? (trimmed || null);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const csvPath = process.argv[2] ?? "/Users/grupovenda/Desktop/Tarefas Bruna - Tarefas Gerais (1).csv";
const raw = readFileSync(csvPath, "utf8");
const rows = parseCSV(raw);

console.log(`📄 ${rows.length} linhas encontradas no CSV`);

let ok = 0, fail = 0;

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];

  // Pula linhas completamente vazias
  if (!r["ClientName"] && !r["Date"]) continue;

  const fields = {
    "Status":                  r["Status"] || null,
    "Data":                    toISO(r["Date"]),
    "Cliente":                 normalizeClient(r["ClientName"]),
    "Tipo":                    r["itemType"] || null,
    "Quantidade":              r["Quantity"] ? Number(r["Quantity"]) : null,
    "Urgência":                r["Urgência"] || null,
    "Complexidade":            r["Complexidade"] || null,
    "Data de Entrega":         toISO(r["Data de entrega"]),
    "Precisou de Alteração?":  r["Precisou de Alteração?"] || null,
    "Nº de Alterações":        r["Nº de Alterações"] ? Number(r["Nº de Alterações"]) : null,
    "Link de Entrega":         r["Link de entrega"] || null,
    "Briefing":                r["Briefing"] || null,
    "Responsável Aprovação":   r["Responsável aprovação"] || null,
    "Tarefa":                  [r["itemType"], r["ClientName"]].filter(Boolean).join(" — "),
  };

  // Remove nulls para não sobrescrever defaults do NocoDB
  Object.keys(fields).forEach(k => { if (fields[k] === null || fields[k] === "") delete fields[k]; });

  try {
    await createRow(fields);
    ok++;
    if (ok % 20 === 0) console.log(`  ✅ ${ok}/${rows.length} inseridos...`);
  } catch (e) {
    fail++;
    console.error(`  ❌ linha ${i + 2}: ${e.message}`);
  }

  // Rate limit — evita 429
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n🎉 Importação concluída: ${ok} inseridos, ${fail} erros`);
