// Integração com uazapiGO (WhatsApp)
// Docs: https://docs.uazapi.com

const BASE_URL  = process.env.UAZAPI_URL   ?? "";
const TOKEN     = process.env.UAZAPI_TOKEN ?? "";

async function request(path: string, body: object): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": TOKEN,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch (err: any) {
    console.error("[whatsapp] Erro na requisição:", err?.message);
    return null;
  }
}

export async function sendTextMessage(number: string, text: string): Promise<void> {
  if (!TOKEN) {
    console.log(`[whatsapp] Mock — mensagem para ${number}:\n${text}\n`);
    return;
  }

  // uazapiGO: aceita número puro (5511999999999) ou @s.whatsapp.net / @g.us
  const clean = number.replace(/@s\.whatsapp\.net$/, "").replace(/@g\.us$/, "");
  const to    = number.includes("@g.us") ? number : clean;

  await request("/send/text", { number: to, text });
}

// Payload real que o webhook da uazapiGO envia (EventType: "messages")
export interface WhatsAppWebhookPayload {
  EventType:    string;        // "messages"
  instanceName: string;
  owner:        string;
  token?:       string;
  message: {
    chatid:      string;       // "5514991222345@s.whatsapp.net" ou "@g.us"
    sender:      string;       // LID interno — não usar para identificar número
    sender_pn:   string;       // número real: "5514991222345@s.whatsapp.net"
    senderName?: string;
    isGroup:     boolean;
    fromMe:      boolean;
    text?:       string;
    content?:    string;       // fallback — mesmo valor que text
    messageType?: string;
    type?:       string;
    wasSentByApi?: boolean;
    mediaType?:  string;
  };
  chat?: {
    wa_isGroup?: boolean;
    wa_chatid?:  string;
    phone?:      string;
    name?:       string;
  };
}

export function extractMessageText(payload: WhatsAppWebhookPayload): string {
  return payload?.message?.text ?? payload?.message?.content ?? "";
}

export function extractGroupId(payload: WhatsAppWebhookPayload): string {
  return payload?.message?.chatid ?? "";
}

export function extractSenderName(payload: WhatsAppWebhookPayload): string {
  return payload?.message?.senderName ?? "Desconhecido";
}

/** Retorna o número de telefone limpo do remetente (ex: "5514991222345") */
export function extractSenderPhone(payload: WhatsAppWebhookPayload): string {
  const pn = payload?.message?.sender_pn ?? payload?.message?.chatid ?? "";
  return pn.replace(/@s\.whatsapp\.net$/, "").replace(/@g\.us$/, "");
}
