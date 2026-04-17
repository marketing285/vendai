/**
 * GPIA — Co-piloto Estratégico de Gestão por BU
 *
 * Ciclos:
 *   08h todo dia   → briefing matinal para cada gestor
 *   a cada 30 min  → scan de alertas urgentes
 *   sexta 17h      → relatório semanal para gestor + Armando
 *
 * Skills:
 *   - Análise de cenário completo da BU
 *   - Sugestão de prioridades e ações do dia
 *   - Detecção de problemas e SLA em risco
 *   - Sugestão de melhorias de processo
 *   - Escalada para Armando quando necessário
 *   - Memória persistente de decisões e padrões
 */

import { Router } from "express";
import { buildSnapshot, analyzeScenario, BU } from "./analyzer";
import { notifyGestor, notifyArmando, escalateToArmando } from "./notify";
import { saveMemory } from "./memory";
import { log } from "../controller/logger";
import { sendTextMessage } from "../../integrations/whatsapp";

const SCAN_INTERVAL_MS   = 30 * 60 * 1000; // 30 min
const BUS: BU[]          = ["BU1", "BU2"];

// ─── Ciclo de alertas ─────────────────────────────────────────────────────────
async function scanAlertas(): Promise<void> {
  for (const bu of BUS) {
    try {
      const snapshot = await buildSnapshot(bu);
      const analise  = await analyzeScenario(snapshot, "alerta");

      if (analise === "SEM_ALERTAS" || !analise.trim()) continue;

      await notifyGestor(bu, analise);

      // Detecta se é grave o suficiente para escalar para Armando
      const critico = analise.toLowerCase().includes("churn")
        || analise.toLowerCase().includes("crítico")
        || analise.toLowerCase().includes("cliente em risco");

      if (critico) {
        await escalateToArmando(bu, snapshot.gestor, analise);
        await saveMemory({
          bu,
          tipo:     "alerta",
          conteudo: `Escalada para Armando: ${analise.slice(0, 200)}`,
        });
      }
    } catch (err: any) {
      log("error", `[gpia] erro no scan de alertas ${bu}: ${err?.message}`);
    }
  }
}

// ─── Briefing matinal ─────────────────────────────────────────────────────────
async function enviarBriefingMatinal(): Promise<void> {
  for (const bu of BUS) {
    try {
      log("info", `[gpia] gerando briefing matinal — ${bu}`);
      const snapshot = await buildSnapshot(bu);
      const briefing = await analyzeScenario(snapshot, "briefing");
      await notifyGestor(bu, briefing);
      await saveMemory({
        bu,
        tipo:     "padrao",
        conteudo: `Briefing matinal enviado. Tasks abertas: ${snapshot.tasks.length}, Design: ${snapshot.tasksDesign.length}, Edição: ${snapshot.tasksEdicao.length}`,
      });
      log("info", `[gpia] briefing matinal enviado — ${bu}`);
    } catch (err: any) {
      log("error", `[gpia] erro no briefing matinal ${bu}: ${err?.message}`);
    }
  }
}

// ─── Relatório semanal ────────────────────────────────────────────────────────
async function enviarRelatorioSemanal(): Promise<void> {
  for (const bu of BUS) {
    try {
      log("info", `[gpia] gerando relatório semanal — ${bu}`);
      const snapshot  = await buildSnapshot(bu);
      const relatorio = await analyzeScenario(snapshot, "semanal");
      await notifyGestor(bu, relatorio);
      await notifyArmando(`📋 *Relatório Semanal — ${bu}*\n\n${relatorio}`);
      log("info", `[gpia] relatório semanal enviado — ${bu}`);
    } catch (err: any) {
      log("error", `[gpia] erro no relatório semanal ${bu}: ${err?.message}`);
    }
  }
}

// ─── Agendador ────────────────────────────────────────────────────────────────
function agendarBriefingDiario(): void {
  function proximoDisparo(hora: number, minuto = 0): number {
    const agora  = new Date();
    const alvo   = new Date();
    alvo.setHours(hora, minuto, 0, 0);
    if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);
    return alvo.getTime() - agora.getTime();
  }

  // Briefing às 08h todo dia
  setTimeout(function briefingLoop() {
    enviarBriefingMatinal();
    setTimeout(briefingLoop, 24 * 60 * 60 * 1000);
  }, proximoDisparo(8, 0));

  // Relatório semanal: sexta às 17h
  function agendarSemanal() {
    const agora   = new Date();
    const alvo    = new Date();
    const diasAte = (5 - agora.getDay() + 7) % 7 || 7; // 5 = sexta
    alvo.setDate(alvo.getDate() + diasAte);
    alvo.setHours(17, 0, 0, 0);
    const ms = alvo.getTime() - agora.getTime();
    setTimeout(() => {
      enviarRelatorioSemanal();
      agendarSemanal(); // reagenda para próxima sexta
    }, ms);
  }
  agendarSemanal();

  log("info", "[gpia] briefing diário (08h) e relatório semanal (sexta 17h) agendados");
}

// ─── Loop de scan ─────────────────────────────────────────────────────────────
export function startGPIA(): void {
  const token = process.env.NOCODB_TOKEN;
  if (!token) {
    log("warn", "[gpia] NOCODB_TOKEN não configurado — GPIA desativado.");
    return;
  }

  // Scan de alertas a cada 30 min
  setTimeout(scanAlertas, 60_000); // primeiro scan 1 min após startup
  setInterval(scanAlertas, SCAN_INTERVAL_MS);

  // Agendamentos fixos
  agendarBriefingDiario();

  log("info", "[gpia] iniciado — scan a cada 30min, briefing às 08h, relatório sexta 17h");
}

// ─── Router HTTP (para testes e webhooks futuros) ─────────────────────────────
export const gpiaRouter = Router();

// Força briefing imediato (teste)
gpiaRouter.post("/briefing/:bu", async (req, res) => {
  const bu = req.params.bu.toUpperCase() as BU;
  if (!["BU1", "BU2"].includes(bu)) {
    res.status(400).json({ error: "BU inválida. Use BU1 ou BU2." });
    return;
  }
  try {
    const snapshot = await buildSnapshot(bu);
    const briefing = await analyzeScenario(snapshot, "briefing");
    await notifyGestor(bu, briefing);
    res.json({ ok: true, bu, preview: briefing.slice(0, 200) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Força scan de alertas imediato (teste)
gpiaRouter.post("/scan", async (_req, res) => {
  try {
    await scanAlertas();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Força relatório semanal (teste)
gpiaRouter.post("/relatorio/:bu", async (req, res) => {
  const bu = req.params.bu.toUpperCase() as BU;
  if (!["BU1", "BU2"].includes(bu)) {
    res.status(400).json({ error: "BU inválida. Use BU1 ou BU2." });
    return;
  }
  try {
    const snapshot  = await buildSnapshot(bu);
    const relatorio = await analyzeScenario(snapshot, "semanal");
    await notifyGestor(bu, relatorio);
    await notifyArmando(`📋 *Relatório Semanal — ${bu}*\n\n${relatorio}`);
    res.json({ ok: true, bu, preview: relatorio.slice(0, 200) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Envia mensagem de teste para um destinatário
gpiaRouter.post("/ping", async (req, res) => {
  const { para = "armando", mensagem } = req.body as { para?: string; mensagem?: string };

  const ALVOS: Record<string, string> = {
    armando: process.env.GPIA_PHONE_ARMANDO ?? "5511994053632",
    bu1:     process.env.GPIA_PHONE_BU1     ?? "5511995320721",
    bu2:     process.env.GPIA_PHONE_BU2     ?? "5514991949319",
    ...(process.env.GPIA_PHONE_BRUNO ? { bruno: process.env.GPIA_PHONE_BRUNO } : {}),
  };

  const phone = ALVOS[para.toLowerCase()];
  if (!phone) {
    res.status(400).json({ error: `Destinatário inválido. Use: ${Object.keys(ALVOS).join(", ")}` });
    return;
  }

  const texto = mensagem ?? `👋 *Olá! Aqui é o MAX.*\n\nEstou online e pronto para receber suas atualizações.\n\nMe mande decisões, mudanças de prazo ou transcrições de reunião — vou processar tudo automaticamente.\n\n_Teste enviado em ${new Date().toLocaleString("pt-BR")}_`;

  try {
    await sendTextMessage(phone, texto);
    res.json({ ok: true, para, phone });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Salva feedback do gestor na memória
gpiaRouter.post("/memoria/:bu", async (req, res) => {
  const bu      = req.params.bu.toUpperCase() as BU;
  const { tipo, conteudo, cliente, task_id } = req.body;
  if (!conteudo) {
    res.status(400).json({ error: "Campo 'conteudo' obrigatório." });
    return;
  }
  try {
    await saveMemory({ bu, tipo: tipo ?? "feedback", conteudo, cliente, task_id });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});
