/**
 * nocodb-webhook.ts
 * Recebe eventos do NocoDB e executa automações.
 *
 * Automação: Tasks Edição → status "Aprovado"
 *   → copia para Depósito Edição
 *   → remove da Tasks Edição
 */

import { Router } from "express";
import { NDB, ndbCreate, ndbDelete, ndbList } from "./nocodb-tool";

export const nocoWebhookRouter = Router();

// ─── POST /webhook/nocodb/task-aprovado ───────────────────────────────────
nocoWebhookRouter.post("/task-aprovado", async (req, res) => {
  // NocoDB envia o payload no body
  const payload = req.body;

  // Suporta tanto evento direto quanto wrapper { data: { ... } }
  const row = payload?.data?.row ?? payload?.row ?? payload;

  const status = row?.Status ?? row?.status;
  const id     = row?.Id ?? row?.id;

  if (!status || !id) {
    return res.status(200).json({ skip: "sem dados suficientes" });
  }

  if (status !== "Aprovado") {
    return res.status(200).json({ skip: `status ${status} ignorado` });
  }

  try {
    // Mapeia campos Tasks Edição → Depósito Edição
    const fields: Record<string, any> = {
      "Tarefa":               row["Título"]         ?? null,
      "Cliente":              row["Cliente"]         ?? null,
      "Data de Entrega":      row["Prazo de Entrega"]?? null,
      "Responsável Aprovação":row["Aprovado por"]    ?? null,
      "Data da solicitação":  new Date().toISOString().slice(0, 10),
      "Status":               "Entregue",
      "Observações":          row["Observações"]     ?? null,
    };

    // Remove nulls
    Object.keys(fields).forEach(k => { if (fields[k] == null) delete fields[k]; });

    // Insere no Depósito Edição
    await ndbCreate(NDB.tables.deposito_edicao, fields);

    // Remove da Tasks Edição
    await ndbDelete(NDB.tables.tasks_edicao, Number(id));

    console.log(`[Webhook] Task #${id} aprovada → movida para Depósito Edição`);
    return res.status(200).json({ ok: true, moved: id });

  } catch (err: any) {
    console.error(`[Webhook] Erro ao mover task #${id}:`, err.message);
    return res.status(500).json({ error: err.message });
  }
});
