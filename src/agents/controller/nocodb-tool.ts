/**
 * nocodb-tool.ts
 * Configuração e helpers para a API REST do NocoDB (self-hosted).
 * Substitui o notion-tool.ts como fonte de dados principal.
 */

const NOCODB_BASE_URL = process.env.NOCODB_URL ?? "https://vendai-docudb.aw5nou.easypanel.host";
const NOCODB_BASE_ID  = "pok6cayan0pluio";

export const NDB = {
  baseUrl:  NOCODB_BASE_URL,
  baseId:   NOCODB_BASE_ID,
  tables: {
    tasks_bu1:         "m9zoy59q6nnwbdf",
    tasks_bu2:         "mi7dptf2jjezxwe",
    tasks_design:      "mmdcj3520zc4w4r",
    deposito_design:   "monizzmow55l4ou",  // arquivo de entregas — Bruna
    tasks_edicao:      "m96rva43spx02v8",
    deposito_edicao:   "mkq6lpidc7k7oog",  // arquivo de entregas — Ana Laura
    clientes:          "mefxfhg7thuxljc",
    clientes_bu1:      "m6jiwooxmwaadrg",
    clientes_bu2:      "mo8f8vj4phh4m66",
  },
} as const;

// ─── HTTP helper ─────────────────────────────────────────────────────────────
async function ndbFetch(method: string, path: string, body?: unknown): Promise<any> {
  const token = process.env.NOCODB_TOKEN;
  if (!token) throw new Error("NOCODB_TOKEN não configurado");

  const res = await fetch(`${NOCODB_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "xc-token": token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NocoDB ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── Data API helpers ─────────────────────────────────────────────────────────
const DATA = (tableId: string) =>
  `/api/v1/db/data/noco/${NOCODB_BASE_ID}/${tableId}`;

export async function ndbList(tableId: string, where?: string, limit = 50): Promise<any[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (where) qs.set("where", where);
  const r = await ndbFetch("GET", `${DATA(tableId)}?${qs}`);
  return r?.list ?? [];
}

export async function ndbCreate(tableId: string, fields: Record<string, any>): Promise<any> {
  return ndbFetch("POST", DATA(tableId), fields);
}

export async function ndbUpdate(tableId: string, rowId: number, fields: Record<string, any>): Promise<any> {
  return ndbFetch("PATCH", `${DATA(tableId)}/${rowId}`, fields);
}

export async function ndbDelete(tableId: string, rowId: number): Promise<void> {
  await ndbFetch("DELETE", `${DATA(tableId)}/${rowId}`);
}

// ─── SLA helper — atualiza Dias até o Prazo e Status SLA em todas as tasks abertas ──
export async function atualizarSLA(tableIds: string[]): Promise<void> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (const tid of tableIds) {
    const rows = await ndbList(tid, "(Prazo de Entrega,isnot,null)", 200);
    for (const row of rows) {
      const prazo = row["Prazo de Entrega"];
      if (!prazo) continue;

      const diff = Math.ceil((new Date(prazo).getTime() - hoje.getTime()) / 86_400_000);
      const sla  = diff < 0 ? "🔴 Atrasado" : diff <= 2 ? "⚠️ Atenção" : "✅ No Prazo";

      await ndbUpdate(tid, row["Id"], {
        "Dias até o Prazo": diff,
        "Status SLA":       sla,
      });
      await new Promise(r => setTimeout(r, 150));
    }
  }
}

// ─── Relatórios helper — atualiza Dias p/ Próx. Relatório nas tabelas de clientes ──
export async function atualizarRelatorios(tableIds: string[]): Promise<void> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (const tid of tableIds) {
    const rows = await ndbList(tid, undefined, 200);
    for (const row of rows) {
      const dia = row["Dia do Relatório"] as number;
      if (!dia) continue;

      // Próxima ocorrência do dia: este mês ou próximo
      const esteMs = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
      const proxMs = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
      const alvo   = esteMs >= hoje ? esteMs : proxMs;
      const diff   = Math.ceil((alvo.getTime() - hoje.getTime()) / 86_400_000);

      await ndbUpdate(tid, row["Id"], { "Dias p/ Próx. Relatório": diff });
      await new Promise(r => setTimeout(r, 150));
    }
  }
}

// ─── Auth: obter token via email/senha (usado no setup) ───────────────────────
export async function ndbGetToken(email: string, password: string): Promise<string> {
  const r = await fetch(`${NOCODB_BASE_URL}/api/v1/auth/user/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json() as { token: string };
  return data.token;
}
