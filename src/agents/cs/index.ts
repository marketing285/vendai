import { Router } from "express";
import { classifyMessage } from "./classifier";
import { buildBriefingQuestions, isBriefingComplete } from "./briefing";
import { generateProtocolIdFromDB } from "./protocol";
import { createNocoDBTask } from "./nocodb-sync";
import {
  sendTextMessage,
  extractMessageText,
  extractGroupId,
  extractSenderName,
  WhatsAppWebhookPayload,
} from "../../integrations/whatsapp";
import { getSupabase } from "../../integrations/supabase";
import { identificarGestor, handleGestorMessage } from "../gpia/whatsapp-handler";

export const csRouter = Router();

// ─── Webhook principal do uazapiGO ───────────────────────────
csRouter.post("/whatsapp", async (req, res) => {
  const payload = req.body as WhatsAppWebhookPayload;

  // Log bruto completo para debug — mostra estrutura real do uazapiGO
  console.log("[webhook] body completo:", JSON.stringify(req.body, null, 2).slice(0, 1000));

  // Ignora mensagens enviadas pelo próprio bot
  // uazapiGO pode enviar fromMe como boolean ou string "true"/"false"
  const fromMe = payload?.data?.fromMe === true || (payload?.data?.fromMe as any) === "true";
  if (fromMe) {
    res.json({ ok: true });
    return;
  }

  const messageText = extractMessageText(payload);
  if (!messageText.trim()) {
    res.json({ ok: true });
    return;
  }

  // Mensagens diretas (não grupo) de gestores/CEO → GPIA
  // uazapiGO pode enviar isGroup como boolean ou string
  const isGroup = payload?.data?.isGroup === true || (payload?.data?.isGroup as any) === "true";
  if (!isGroup) {
    const sender = payload?.data?.sender ?? "";
    console.log(`[webhook] mensagem direta de: "${sender}" | isGroup: ${payload?.data?.isGroup}`);
    const gestor = identificarGestor(sender);
    console.log(`[webhook] gestor identificado: ${gestor ? gestor.nome : "NÃO ENCONTRADO"}`);
    if (gestor) {
      res.json({ ok: true });
      handleGestorMessage(sender, messageText).catch((err) => {
        console.error("[webhook] erro no handleGestorMessage:", err?.message ?? err);
      });
      return;
    }
  }

  const groupId = extractGroupId(payload);
  const senderName = extractSenderName(payload);
  const groupName = groupId;

  const start = Date.now();

  try {
    // 1. Classifica a mensagem com Claude
    const classification = await classifyMessage(messageText, groupName, senderName);

    // 2. Gera protocolo único
    const protocolId = await generateProtocolIdFromDB();

    // 3. Calcula deadline com base no SLA
    const deadline = new Date(Date.now() + classification.slaHours * 3_600_000);

    // 4. Determina o status inicial
    const hasBriefing = isBriefingComplete(classification.missingBriefing);
    const initialStatus = hasBriefing ? "atribuido" : "triagem";

    // 5. Salva no Supabase (se configurado)
    const db = getSupabase();
    let taskDbId: string | null = null;

    if (db) {
      const { data, error } = await db.from("tasks").insert({
        protocol_id: protocolId,
        title: classification.summary,
        area: classification.area,
        task_type: classification.type,
        priority: classification.priority,
        status: initialStatus,
        deadline: deadline.toISOString(),
        sla_hours: classification.slaHours,
        source_group_id: groupId,
        source_message: messageText,
        briefing: {
          missingFields: classification.missingBriefing,
          clientName: classification.clientName,
        },
      }).select("id").single();

      if (error) {
        console.error("[cs] Supabase insert error:", error.message);
      } else {
        taskDbId = data?.id ?? null;
      }

      // Log da ação
      await db.from("agent_logs").insert({
        agent_id: "AG-01",
        action: "classify_and_create_task",
        task_id: taskDbId,
        input: { messageText, groupId, senderName },
        output: { classification, protocolId, initialStatus },
        success: true,
        duration_ms: Date.now() - start,
      });

      // Salva mensagem WPP
      await db.from("whatsapp_messages").insert({
        group_id: groupId,
        group_name: groupName,
        sender_phone: groupId,
        sender_name: senderName,
        message_type: "text",
        content: messageText,
        classification: classification.type,
        task_id: taskDbId,
        processed: true,
        received_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      });
    }

    // 6. Cria task no NocoDB
    const nocoRowId = await createNocoDBTask({
      protocolId,
      title: classification.summary,
      classification,
      sourceMessage: messageText,
      groupId,
      deadline,
    });

    // Atualiza task no Supabase com ID do NocoDB
    if (db && taskDbId && nocoRowId) {
      await db.from("tasks").update({ notion_task_id: nocoRowId }).eq("id", taskDbId);
    }

    // 7. Monta resposta para o grupo
    const deadlineStr = deadline.toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const isFinancial = classification.type === "financial" || classification.type === "contract";
    let reply = "";

    if (isFinancial) {
      reply = `🔒 *Protocolo ${protocolId}*\n`
        + `📋 ${classification.summary}\n`
        + `➡️ Direcionando ao setor financeiro. Em breve entraremos em contato.`;
    } else if (!hasBriefing) {
      const questions = buildBriefingQuestions(classification.missingBriefing);
      reply = `✅ *Protocolo ${protocolId}* registrado!\n`
        + `📋 ${classification.summary}\n`
        + `👤 Responsável: ${classification.assignee}\n\n`
        + questions;
    } else {
      reply = `✅ *Protocolo ${protocolId}* registrado!\n`
        + `📋 ${classification.summary}\n`
        + `👤 Responsável: ${classification.assignee}\n`
        + `⏱ Prazo: ${deadlineStr}\n`
        + `➡️ Task criada e encaminhada. Acompanharemos o andamento.`;
    }

    // 8. Envia resposta no grupo
    await sendTextMessage(groupId, reply);

    res.json({ ok: true, protocolId, classification });
  } catch (err: any) {
    console.error("[cs] Erro no processamento:", err?.message || err);

    // Salva log de erro
    const db = getSupabase();
    if (db) {
      await db.from("agent_logs").insert({
        agent_id: "AG-01",
        action: "classify_and_create_task",
        input: { messageText, groupId },
        output: null,
        success: false,
        error: err?.message,
        duration_ms: Date.now() - start,
      });
    }

    res.status(500).json({ error: "Erro interno no CS Agent." });
  }
});

// ─── Endpoint de teste (simula mensagem recebida) ─────────────
csRouter.post("/test", async (req, res) => {
  const { message, group = "Grupo Teste", sender = "Cliente Teste" } = req.body;

  if (!message) {
    res.status(400).json({ error: "Campo 'message' obrigatório." });
    return;
  }

  // Monta payload fake no formato do uazapiGO
  const fakePayload: WhatsAppWebhookPayload = {
    event:    "messages",
    instance: "test",
    data: {
      chatid:      "test-group-001@g.us",
      sender:      "5511000000000",
      senderName:  sender,
      isGroup:     true,
      fromMe:      false,
      messageType: "conversation",
      text:        message,
    },
  };

  req.body = fakePayload;

  // Reusa o handler principal (chama internamente)
  try {
    const classification = await classifyMessage(message, group, sender);
    const protocolId = await generateProtocolIdFromDB();
    const hasBriefing = isBriefingComplete(classification.missingBriefing);
    const questions = hasBriefing ? null : buildBriefingQuestions(classification.missingBriefing);

    res.json({
      protocolId,
      classification,
      hasBriefing,
      questions,
      previewReply: hasBriefing
        ? `✅ Protocolo ${protocolId} — ${classification.summary} | Responsável: ${classification.assignee}`
        : `✅ Protocolo ${protocolId} — ${classification.summary}\n\n${questions}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});
