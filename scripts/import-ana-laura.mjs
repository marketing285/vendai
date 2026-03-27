/**
 * import-ana-laura.mjs
 * Extrai Produções de Edição do Notion e importa no NocoDB.
 */

const NOTION_TOKEN  = process.env.NOTION_TOKEN  ?? "ntn_b61414369988HFeNcHd5XJq3cYe0G8ATA3DSXm21Mmz0LC";
const NOTION_DB     = "32e16e0e-e446-81d2-a91a-d7e596a04acd"; // Produções de Edição
const NOCODB_TOKEN  = process.env.NOCODB_TOKEN  ?? "RtcWmC5wsYldmqGdXlyv0KWW1sVyaIJDLMRfGOhZ";
const NOCODB_BASE   = "pok6cayan0pluio";
const NOCODB_TABLE  = "mkq6lpidc7k7oog"; // Produções de Edição
const NOCODB_URL    = "https://vendai-docudb.aw5nou.easypanel.host";

// Mapa de prefixos do título → nome do cliente no NocoDB
const CLIENT_MAP = {
  "[NI]":         "Net Infinito",
  "[NI ]":        "Net Infinito",
  "[FER]":        "Fernanda Aoki",
  "[Fer]":        "Fernanda Aoki",
  "[Inovameta]":  "Inovameta",
  "(Acquafit)":   "Acquafit",
  "Mariana":      "Dra. Mariana Vieira",
};

function extractClient(title) {
  for (const [prefix, client] of Object.entries(CLIENT_MAP)) {
    if (title.startsWith(prefix) || title.includes(prefix)) return client;
  }
  return null;
}

// ── Notion helpers ─────────────────────────────────────────────────────────────
function sel(props, key)  { return props[key]?.select?.title ?? null; }
function dt(props, key)   { return props[key]?.date?.start ?? null; }
function url(props, key)  { return props[key]?.url ?? null; }
function num(props, key)  { return props[key]?.number ?? null; }
function ttl(props, key)  { return props[key]?.title?.map(t => t.plain_text).join("") ?? ""; }

async function fetchAllNotionRows() {
  const rows = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) };
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    rows.push(...(data.results ?? []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return rows;
}

// ── NocoDB helpers ─────────────────────────────────────────────────────────────
async function ndbCreate(fields) {
  const res = await fetch(`${NOCODB_URL}/api/v1/db/data/noco/${NOCODB_BASE}/${NOCODB_TABLE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xc-token": NOCODB_TOKEN },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ── Main ───────────────────────────────────────────────────────────────────────
console.log("📥 Buscando registros do Notion...");
const notionRows = await fetchAllNotionRows();
console.log(`📄 ${notionRows.length} registros encontrados`);

let ok = 0, fail = 0;

for (const row of notionRows) {
  const props = row.properties;
  const tarefa = ttl(props, "Tarefa");

  const fields = {
    "Tarefa":               tarefa || null,
    "Data":                 dt(props, "Data"),
    "Data de Entrega":      dt(props, "Data de Entrega"),
    "Cliente":              sel(props, "Cliente") ?? extractClient(tarefa),
    "Status":               sel(props, "Status"),
    "Urgência":             sel(props, "Urgência"),
    "Complexidade":         sel(props, "Complexidade"),
    "Precisou de Alteração?": sel(props, "Precisou de Alteração?"),
    "Nº de Alterações":     num(props, "Nº de Alterações"),
    "Link de Entrega":      url(props, "Link de Entrega"),
    "Roteiro":              url(props, "Roteiro"),
    "Responsável Aprovação": sel(props, "Responsável Aprovação"),
  };

  // Remove nulls
  Object.keys(fields).forEach(k => { if (fields[k] === null || fields[k] === undefined) delete fields[k]; });

  try {
    await ndbCreate(fields);
    ok++;
    console.log(`  ✅ ${tarefa.slice(0, 50)}`);
  } catch (e) {
    fail++;
    console.error(`  ❌ ${tarefa.slice(0, 40)}: ${e.message}`);
  }

  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n🎉 Concluído: ${ok} inseridos, ${fail} erros`);
