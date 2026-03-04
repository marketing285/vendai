import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Classification {
  type: "new_demand" | "doubt" | "approval" | "adjustment" | "urgency" | "financial" | "contract";
  area: "design" | "video" | "capture" | "content" | "traffic" | "commercial" | "financial" | "ops";
  priority: "P0" | "P1" | "P2";
  clientName: string;
  summary: string;
  missingBriefing: string[]; // campos que faltam para o briefing mínimo
  assignee: string;          // nome do responsável sugerido
  slaHours: number;
}

const ROUTING_MAP: Record<string, string> = {
  design: "Bruna",
  video: "Ana Laura",
  capture: "Gestora de Captação",
  content: "Gestor do cliente",
  traffic: "Gestor de Tráfego",
  commercial: "SDR",
  financial: "Financeiro/CEO",
  ops: "Armando (Diretor)",
};

const SLA_MAP: Record<string, Record<string, number>> = {
  P0: { design: 4, video: 8, capture: 4, content: 4, traffic: 4, commercial: 1 },
  P1: { design: 24, video: 48, capture: 48, content: 24, traffic: 24, commercial: 2 },
  P2: { design: 48, video: 96, capture: 72, content: 48, traffic: 48, commercial: 8 },
};

export async function classifyMessage(
  messageText: string,
  groupName: string,
  senderName: string
): Promise<Classification> {
  const prompt = `Você é o classificador do Grupo Venda IA.

Analise a mensagem abaixo e retorne um JSON com a classificação.

**Grupo:** ${groupName}
**Remetente:** ${senderName}
**Mensagem:**
"${messageText}"

Retorne SOMENTE o JSON, sem markdown, sem explicação:

{
  "type": "new_demand" | "doubt" | "approval" | "adjustment" | "urgency" | "financial" | "contract",
  "area": "design" | "video" | "capture" | "content" | "traffic" | "commercial" | "financial" | "ops",
  "priority": "P0" | "P1" | "P2",
  "clientName": "nome do cliente ou empresa mencionada, ou 'Desconhecido'",
  "summary": "resumo em 1 linha do que está sendo pedido (máx 80 caracteres)",
  "missingBriefing": ["lista de campos que faltam do briefing mínimo: objetivo, formato, prazo, referencias_cta"]
}

Regras de prioridade:
- P0: urgência, incidente, prazo hoje, palavra 'urgente'
- P1: prazo amanhã, anúncio, demanda importante
- P2: demanda normal sem urgência declarada

Regras de área:
- design: artes, posts, carrossel, banners, identidade visual
- video: edição, reels, corte, trilha, legenda
- capture: gravação, filmagem, captação, visita de produção
- content: pauta, texto, copy, planejamento, calendário editorial
- traffic: anúncios, campanha, meta ads, google ads, tráfego pago
- commercial: lead, proposta, orçamento, venda, cliente novo
- financial: boleto, nf, nota fiscal, pagamento, contrato, cobrança
- ops: processo, reunião, operacional`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";

  let parsed: Partial<Classification>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      type: "new_demand",
      area: "ops",
      priority: "P2",
      clientName: "Desconhecido",
      summary: messageText.slice(0, 80),
      missingBriefing: ["objetivo", "formato", "prazo", "referencias_cta"],
    };
  }

  const area = parsed.area ?? "ops";
  const priority = parsed.priority ?? "P2";

  return {
    type: parsed.type ?? "new_demand",
    area,
    priority,
    clientName: parsed.clientName ?? "Desconhecido",
    summary: parsed.summary ?? messageText.slice(0, 80),
    missingBriefing: parsed.missingBriefing ?? [],
    assignee: ROUTING_MAP[area] ?? "Gestor do cliente",
    slaHours: SLA_MAP[priority]?.[area] ?? 48,
  };
}
