import Anthropic from "@anthropic-ai/sdk";

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
      period: {
        type: "string",
        enum: ["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"],
        description: "Período dos dados. Use last_7d por padrão se não especificado.",
      },
      client_name: {
        type: "string",
        description: "Nome do cliente específico mencionado, se houver. Deixe vazio para trazer todos.",
      },
    },
    required: ["period"],
  },
};

// Chama o webhook n8n e retorna os dados estruturados
export async function callMetaAdsWebhook(input: { period: string; client_name?: string }): Promise<string> {
  const webhookUrl = process.env.N8N_META_ADS_WEBHOOK;

  if (!webhookUrl) {
    return JSON.stringify({ error: "Webhook do Meta Ads não configurado (N8N_META_ADS_WEBHOOK)." });
  }

  try {
    const res = await Promise.race([
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10000)
      ),
    ]) as Response;

    if (!res.ok) {
      return JSON.stringify({ error: `n8n retornou ${res.status}` });
    }

    const data = await res.json();
    return JSON.stringify(data);
  } catch (err: any) {
    console.error("[meta-ads-tool] erro:", err?.message);
    return JSON.stringify({ error: "Não foi possível buscar dados do Meta Ads agora." });
  }
}
