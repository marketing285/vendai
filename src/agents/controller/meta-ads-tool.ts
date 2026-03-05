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
    return JSON.stringify({ error: "Webhook do Meta Ads não configurado (N8N_META_ADS_WEBHOOK)." });
  }

  const payload = {
    empresa: input.empresa ?? "",
    mensagem: input.mensagem,
  };

  try {
    const res = await Promise.race([
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10000)
      ),
    ]) as Response;

    if (!res.ok) {
      return JSON.stringify({ error: `n8n retornou ${res.status}` });
    }

    const raw = await res.text();

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
        return cleaned || extracted;
      }
      // Se não achou campo texto, devolve JSON bonito pra Claude interpretar
      return JSON.stringify(parsed);
    } catch {
      // Não é JSON — texto puro mesmo
      return raw;
    }
  } catch (err: any) {
    console.error("[meta-ads-tool] erro:", err?.message);
    return "Não foi possível buscar dados do Meta Ads agora.";
  }
}
