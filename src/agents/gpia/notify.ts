/**
 * notify.ts
 * Envio de mensagens WhatsApp para gestores e Armando via uazapiGO.
 */

import { sendTextMessage } from "../../integrations/whatsapp";
import type { BU } from "./analyzer";

// Números configurados via env com fallback hardcoded (formato: 5511999999999)
const PHONES = {
  BU1:     process.env.GPIA_PHONE_BU1     ?? "5511995320721",  // Christian
  ARMANDO: process.env.GPIA_PHONE_ARMANDO ?? "5511994053632",  // Armando
  BU3:     process.env.GPIA_PHONE_BU3     ?? "5514991534843",   // Bruna
};

export async function notifyGestor(bu: BU, message: string): Promise<void> {
  const phoneMap: Record<string, string | undefined> = {
    BU1: process.env.GPIA_PHONE_BU1 ?? "5511995320721",
    BU2: process.env.GPIA_PHONE_BU2,
    BU3: process.env.GPIA_PHONE_BU3,
  };
  const phone = phoneMap[bu];
  if (!phone) {
    console.log(`[gpia/notify] ${bu} sem gestor configurado — notificação ignorada`);
    return;
  }
  console.log(`[gpia/notify] → ${bu} gestor (${phone}): ${message.slice(0, 60)}...`);
  await sendTextMessage(phone, message);
}

export async function notifyArmando(message: string): Promise<void> {
  const phone = PHONES.ARMANDO;
  console.log(`[gpia/notify] → Armando (${phone}): ${message.slice(0, 60)}...`);
  await sendTextMessage(phone, message);
}

export async function notifyBruno(message: string): Promise<void> {
  const phone = process.env.GPIA_PHONE_BRUNO;
  if (!phone) return;
  console.log(`[gpia/notify] → Bruno CEO (${phone}): ${message.slice(0, 60)}...`);
  await sendTextMessage(phone, message);
}

/** Escala um problema para Armando com contexto da BU */
export async function escalateToArmando(bu: BU, gestor: string, problema: string): Promise<void> {
  const msg = `🔴 *ESCALADA — ${bu}*\n\nGestor: ${gestor}\n\n${problema}\n\n_Enviado automaticamente pelo GPIA_`;
  await notifyArmando(msg);
}
