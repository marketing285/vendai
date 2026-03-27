import { readFileSync, writeFileSync } from "fs";

function splitLine(line) {
  const result = []; let cur = "", inQuote = false;
  for (const ch of line) {
    if (ch === '"') inQuote = !inQuote;
    else if (ch === "," && !inQuote) { result.push(cur); cur = ""; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function toISO(d) {
  if (!d) return "";
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`; // YYYY-MM-DD
}

const CLIENT_MAP = {
  "Fernanda": "Fernanda Aoki", "Moura leite": "Moura Leite",
  "Hidroaço": "Hidroaco", "AWF": "AWF Contabil",
  "Geezer": "Geezer Cervejaria", "Agropet": "Atacado Agropet",
};

const RESP_MAP = {
  "Christian": "Christian (Gestor)", "Junior Monte": "Júnior Monte (Gestor)",
  "Armando Cavazana": "Armando Cavazana (Dir.)", "Bruno Zanardo": "Bruno (CEO)",
};

const VALID_COMPLEX = new Set(["Simples", "Média", "Complexa"]);
const VALID_PREC    = new Set(["Sim", "Não", "Aguardando"]);

const raw = readFileSync("/Users/grupovenda/Desktop/Tarefas Bruna - Tarefas Gerais (1).csv", "utf8");
const lines = raw.split(/\r?\n/).filter(l => l.trim());
const headers = splitLine(lines[0]);

const outHeaders = ["Status","Data","Cliente","Tipo","Quantidade","Urgência","Complexidade","Data de Entrega","Precisou de Alteração?","Nº de Alterações","Link de Entrega","Briefing","Responsável Aprovação"];
const outRows = [outHeaders.join(",")];

for (const line of lines.slice(1)) {
  const cols = splitLine(line);
  const r = {};
  headers.forEach((h, i) => r[h.trim()] = (cols[i] ?? "").trim());
  if (!r["ClientName"] && !r["Date"]) continue;

  const row = [
    r["Status"],
    toISO(r["Date"]),
    CLIENT_MAP[r["ClientName"]] ?? r["ClientName"],
    r["itemType"],
    r["Quantity"],
    r["Urgência"],
    VALID_COMPLEX.has(r["Complexidade"]) ? r["Complexidade"] : "",
    toISO(r["Data de entrega"]),
    VALID_PREC.has(r["Precisou de Alteração?"]) ? r["Precisou de Alteração?"] : "",
    r["Nº de Alterações"],
    r["Link de entrega"],
    r["Briefing"],
    RESP_MAP[r["Responsável aprovação"]] ?? r["Responsável aprovação"],
  ].map(v => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  });
  outRows.push(row.join(","));
}

writeFileSync("/Users/grupovenda/Desktop/Bruna_Producoes_Limpo.csv", outRows.join("\n"), "utf8");
console.log("Linhas geradas:", outRows.length - 1);
console.log("Primeiras datas:", outRows.slice(1, 4).map(r => r.split(",")[1]));
