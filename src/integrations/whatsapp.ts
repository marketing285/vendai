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

// Payload que o webhook da uazapiGO envia para o event "messages"
export interface WhatsAppWebhookPayload {
  event:    string;   // "messages", "connection", etc.
  instance: string;   // token da instância
  data: {
    id?:           string;
    messageid?:    string;
    chatid:        string;   // "5511999999999@s.whatsapp.net" ou "@g.us"
    sender:        string;
    senderName?:   string;
    isGroup:       boolean;
    fromMe:        boolean;
    messageType?:  string;
    text?:         string;   // texto principal da mensagem
    fileURL?:      string;
    wasSentByApi?: boolean;
  };
}

export function extractMessageText(payload: WhatsAppWebhookPayload): string {
  return payload?.data?.text ?? "";
}

export function extractGroupId(payload: WhatsAppWebhookPayload): string {
  return payload?.data?.chatid ?? "";
}

export function extractSenderName(payload: WhatsAppWebhookPayload): string {
  return payload?.data?.senderName ?? "Desconhecido";
}
