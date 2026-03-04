// Integração com Evolution API (WhatsApp)
// Docs: https://doc.evolution-api.com

const BASE_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const API_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME ?? "grupo-venda";

async function request(path: string, body: object): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch (err: any) {
    console.error("[whatsapp] Erro na requisição:", err?.message);
    return null;
  }
}

export async function sendTextMessage(groupId: string, text: string): Promise<void> {
  if (!API_KEY) {
    console.log(`[whatsapp] Mock — mensagem para ${groupId}:\n${text}\n`);
    return;
  }

  await request(`/message/sendText/${INSTANCE}`, {
    number: groupId,
    textMessage: { text },
  });
}

// Payload normalizado que o webhook da Evolution API envia
export interface WhatsAppWebhookPayload {
  data: {
    key: { remoteJid: string; fromMe: boolean };
    pushName: string;
    message: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      audioMessage?: { url: string };
      imageMessage?: { url: string; caption?: string };
      documentMessage?: { url: string; fileName?: string };
    };
    messageType: string;
  };
  instance: string;
}

export function extractMessageText(payload: WhatsAppWebhookPayload): string {
  const msg = payload.data.message;
  return (
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.documentMessage?.fileName ??
    ""
  );
}

export function extractGroupId(payload: WhatsAppWebhookPayload): string {
  return payload.data.key.remoteJid;
}

export function extractSenderName(payload: WhatsAppWebhookPayload): string {
  return payload.data.pushName ?? "Desconhecido";
}
