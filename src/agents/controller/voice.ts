import { ElevenLabsClient } from "elevenlabs";

let _client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient | null {
  if (!process.env.ELEVENLABS_API_KEY) return null;
  if (!_client) _client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  return _client;
}

const MODEL_ID = "eleven_flash_v2_5";

// Limpa o texto antes de enviar ao ElevenLabs:
// remove markdown, pontuação excessiva e expande abreviações
export function cleanTextForSpeech(text: string): string {
  return text
    // Remove cabeçalhos markdown
    .replace(/#{1,6}\s+/g, "")
    // Remove negrito e itálico
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Remove marcadores de lista
    .replace(/^[\-•*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    // Remove URLs
    .replace(/https?:\/\/[^\s]+/g, "")
    // Expande prioridades
    .replace(/\bP0\b/g, "Prioridade zero")
    .replace(/\bP1\b/g, "Prioridade um")
    .replace(/\bP2\b/g, "Prioridade dois")
    // Expande horas: "4h" → "4 horas", "1h" → "1 hora"
    .replace(/\b1h\b/g, "1 hora")
    .replace(/\b(\d+)h\b/g, "$1 horas")
    // Expande minutos
    .replace(/\b1min\b/g, "1 minuto")
    .replace(/\b(\d+)min\b/g, "$1 minutos")
    // Expande porcentagem
    .replace(/(\d+)%/g, "$1 por cento")
    // Troca travessão e hífen isolado por pausa
    .replace(/\s[—–-]\s/g, ", ")
    // Remove protocolos de data (2026-03-03-0042)
    .replace(/\d{4}-\d{2}-\d{2}-\d{4}/g, "o protocolo")
    // Remove emojis
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    // Colon no fim de frase vira ponto
    .replace(/:\s*\n/g, ". ")
    // Múltiplas quebras de linha viram pausa
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    // Limpa espaços extras
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function textToSpeech(rawText: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";

  try {
    const cleaned = cleanTextForSpeech(rawText);
    const truncated = cleaned.length > 2500 ? cleaned.slice(0, 2500) : cleaned;

    const audioStream = await client.generate({
      voice: VOICE_ID,
      text: truncated,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("base64");
  } catch (err: any) {
    console.error("[voice] ElevenLabs error:", err?.message || err);
    return null;
  }
}
