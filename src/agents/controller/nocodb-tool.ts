/**
 * nocodb-tool.ts
 * Configuração e helpers para a API REST do NocoDB (self-hosted).
 * Substitui o notion-tool.ts como fonte de dados principal.
 */

const NOCODB_BASE_URL = process.env.NOCODB_URL ?? "https://vendai-docudb.aw5nou.easypanel.host";
const NOCODB_BASE_ID  = "pbyj8wdxyb1j3ix";

export const NDB = {
  baseUrl:  NOCODB_BASE_URL,
  baseId:   NOCODB_BASE_ID,
  tables: {
    tasks_bu1:         "mpzj4jg5neca467",
    tasks_bu2:         "mjwpxpjb22p58nu",
    tasks_design:      "moz64dswno4vtxu",
    producoes_design:  "mge0ggcuapeaxiq",
    tasks_edicao:      "mhwjogramh4luq2",
    producoes_edicao:  "maock9v8vlhgoa3",
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
