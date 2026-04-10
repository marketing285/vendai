/**
 * notify.ts
 * Envio de mensagens WhatsApp para gestores e Armando via Evolution API.
 */

import { sendTextMessage } from "../../integrations/whatsapp";
import { BU } from "./analyzer";

// Números configurados via env com fallback hardcoded
const PHONES = {
  BU1:    process.env.GPIA_PHONE_BU1    ?? "5511995320721",  // Christian
  BU2:    process.env.GPIA_PHONE_BU2    ?? "5514991949319",  // Júnior
  ARMANDO: process.env.GPIA_PHONE_ARMANDO ?? "5511994053632", // Armando
};

function toJid(phone: string): string {
  // Evolution API espera formato: 5511999999999@s.whatsapp.net
  const clean = phone.replace(/\D/g, "");
  return clean.includes("@") ? clean : `${clean}@s.whatsapp.net`;
}

export async function notifyGestor(bu: BU, message: string): Promise<void> {
  const jid = toJid(PHONES[bu]);
  console.log(`[gpia/notify] → ${bu} gestor (${jid}): ${message.slice(0, 60)}...`);
  await sendTextMessage(jid, message);
}

export async function notifyArmando(message: string): Promise<void> {
  const jid = toJid(PHONES.ARMANDO);
  console.log(`[gpia/notify] → Armando (${jid}): ${message.slice(0, 60)}...`);
  await sendTextMessage(jid, message);
}

/** Escala um problema para Armando com contexto da BU */
export async function escalateToArmando(bu: BU, gestor: string, problema: string): Promise<void> {
  const msg = `🔴 *ESCALADA — ${bu}*\n\nGestor: ${gestor}\n\n${problema}\n\n_Enviado automaticamente pelo GPIA_`;
  await notifyArmando(msg);
}
