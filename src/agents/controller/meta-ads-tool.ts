import Anthropic from "@anthropic-ai/sdk";
import { log } from "./logger";

// Definição da ferramenta — Claude decide quando usá-la
export const metaAdsTool: Anthropic.Tool = {
  name: "query_meta_ads",
  description: `Busca dados reais de campanhas Meta Ads (Facebook/Instagram Ads) do portfólio do Grupo Venda.
Use esta ferramenta sempre que o usuário perguntar sobre:
- campanhas, anúncios, tráfego pago
- performance: ROAS, CPC, CPM, CTR, alcance, impressões
- investimento, gasto, verba de mídia
- leads gerados por anúncios
- resultado de algum cliente específico em mídia paga
- comparativo de campanhas ativas`,
  input_schema: {
    type: "object" as const,
    properties: {
      empresa: {
        type: "string",
        description: "Nome da empresa/cliente mencionado. Deixe vazio para consultar todos.",
      },
      mensagem: {
        type: "string",
        description: "A pergunta original do usuário sobre as campanhas, exatamente como foi feita.",
      },
    },
    required: ["mensagem"],
  },
};

// Chama o webhook n8n com o formato { empresa, mensagem }
export async function callMetaAdsWebhook(input: { empresa?: string; mensagem: string }): Promise<string> {
  const webhookUrl = process.env.N8N_META_ADS_WEBHOOK;

  if (!webhookUrl) {
    return "Webhook do Meta Ads não configurado.";
  }

  const mensagem = (input.mensagem ?? "").trim();
  if (!mensagem) {
    return "Não foi possível identificar a pergunta sobre as campanhas.";
  }

  const payload = {
    empresa: (input.empresa ?? "").trim(),
    mensagem,
  };

  const TIMEOUT_MS = 55_000;
  const startedAt = Date.now();

  try {
    log("info", `webhook n8n → POST (timeout ${TIMEOUT_MS / 1000}s)`, JSON.stringify(payload));

    const res = await Promise.race([
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout após ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)
      ),
    ]) as Response;

    const elapsed = Date.now() - startedAt;
    log("info", `webhook n8n ← HTTP ${res.status} (${elapsed}ms)`);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log("error", `webhook n8n HTTP ${res.status}`, body.slice(0, 500));
      return `Erro no n8n: HTTP ${res.status}`;
    }

    const raw = await res.text();
    log("info", `webhook n8n raw (${raw.length} chars)`, raw.slice(0, 400));

    // Tenta extrair texto de wrappers JSON que o n8n pode devolver
    try {
      const parsed = JSON.parse(raw);
      // Array: [{output: "..."}, ...]
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      const extracted =
        first?.output ?? first?.resposta ?? first?.text ?? first?.message ??
        first?.data ?? first?.result ?? first?.response ?? null;

      if (extracted && typeof extracted === "string") {
        // Remove o prefixo "[Used tools: ...]] " que o n8n AI Agent injeta
        const cleaned = extracted.replace(/^\[Used tools:.*?\]\]\s*/s, "").trim();
        log("info", `webhook n8n extraiu campo "${Object.keys(first).find(k => first[k] === extracted)}"`, cleaned.slice(0, 200));
        return cleaned || extracted;
      }

      // Nenhum campo texto reconhecido — devolve JSON pra Claude interpretar
      log("warn", "webhook n8n: nenhum campo de texto reconhecido, campos disponíveis:", Object.keys(first ?? {}).join(", "));
      return JSON.stringify(parsed);
    } catch {
      // Não é JSON — texto puro
      log("info", "webhook n8n: resposta texto puro");
      return raw;
    }
  } catch (err: any) {
    const elapsed = Date.now() - startedAt;
    const msg = err?.message ?? String(err);
    log("error", `webhook n8n FALHOU (${elapsed}ms): ${msg}`);
    return `Erro ao consultar Meta Ads: ${msg}`;
  }
}

// ─── Diagnóstico direto do webhook (usado pela rota /webhook-test) ────────────
export async function probeMetaAdsWebhook(): Promise<{
  ok: boolean;
  status?: number;
  elapsed: number;
  raw?: string;
  parsed?: unknown;
  extractedField?: string;
  extractedValue?: string;
  error?: string;
}> {
  const webhookUrl = process.env.N8N_META_ADS_WEBHOOK;
  if (!webhookUrl) return { ok: false, elapsed: 0, error: "N8N_META_ADS_WEBHOOK não configurado" };

  const startedAt = Date.now();
  const payload = { empresa: "", mensagem: "teste de diagnóstico MAX" };

  try {
    const res = await Promise.race([
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout após 30s")), 30_000)),
    ]) as Response;

    const elapsed = Date.now() - startedAt;
    const raw = await res.text();

    let parsed: unknown = undefined;
    let extractedField: string | undefined;
    let extractedValue: string | undefined;

    try {
      parsed = JSON.parse(raw);
      const first = Array.isArray(parsed) ? (parsed as any[])[0] : parsed;
      const FIELDS = ["output", "resposta", "text", "message", "data", "result", "response"];
      for (const f of FIELDS) {
        if (first?.[f] && typeof first[f] === "string") {
          extractedField = f;
          extractedValue = (first[f] as string).slice(0, 300);
          break;
        }
      }
      if (!extractedField) {
        extractedField = "(nenhum reconhecido)";
        extractedValue = `campos disponíveis: ${Object.keys(first ?? {}).join(", ")}`;
      }
    } catch {
      // texto puro
    }

    return { ok: res.ok, status: res.status, elapsed, raw: raw.slice(0, 1000), parsed, extractedField, extractedValue };
  } catch (err: any) {
    return { ok: false, elapsed: Date.now() - startedAt, error: err?.message ?? String(err) };
  }
}
