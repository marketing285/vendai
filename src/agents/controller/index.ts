import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { buildContext } from "./context-builder";
import { buildSystemPrompt } from "./prompt";
import { textToSpeech } from "./voice";
import { metaAdsTool, callMetaAdsWebhook } from "./meta-ads-tool";
import { log, getLogs, getLatest } from "./logger";

export const controllerRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CEO_PIN = process.env.CEO_PIN ?? "0000";

interface SessionState {
  history: Anthropic.MessageParam[];
  ceoAuthenticated: boolean;
}

const sessions: Map<string, SessionState> = new Map();

function getSession(sessionId: string): SessionState {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { history: [], ceoAuthenticated: false });
  }
  return sessions.get(sessionId)!;
}

// ─── Parser de números em português ────────────────────────────────────────
// Aceita: "2011", "dois zero um um", "dois mil e onze"
function parsePortuguesePIN(text: string): string | null {
  const t = text.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Sequência de dígitos direto: "2011" ou "2 0 1 1"
  const digitOnly = t.replace(/\s/g, "").replace(/\D/g, "");
  if (/^\d{4,6}$/.test(digitOnly)) return digitOnly;

  // 2. Dígito por dígito: "dois zero um um" → "2011"
  const DIGIT: Record<string, string> = {
    zero:"0", um:"1", uma:"1", dois:"2", duas:"2",
    três:"3", tres:"3", quatro:"4", cinco:"5",
    seis:"6", sete:"7", oito:"8", nove:"9",
  };
  const words = t.split(" ");
  const seq = words.map(w => DIGIT[w]).filter(Boolean);
  if (seq.length === 4) return seq.join("");

  // 3. Número completo em palavras: "dois mil e onze" → 2011
  const n = parseFullPtNumber(t);
  if (n !== null && n >= 1000 && n <= 999999) return String(n);

  return null;
}

function parseFullPtNumber(t: string): number | null {
  const ONES: Record<string, number> = {
    zero:0, um:1, uma:1, dois:2, duas:2, três:3, tres:3,
    quatro:4, cinco:5, seis:6, sete:7, oito:8, nove:9,
    dez:10, onze:11, doze:12, treze:13, quatorze:14, catorze:14,
    quinze:15, dezesseis:16, dezessete:17, dezoito:18, dezenove:19,
    vinte:20, trinta:30, quarenta:40, cinquenta:50,
    sessenta:60, setenta:70, oitenta:80, noventa:90,
  };
  const HUNDREDS: Record<string, number> = {
    cem:100, cento:100,
    duzentos:200, duzentas:200, trezentos:300, trezentas:300,
    quatrocentos:400, quatrocentas:400, quinhentos:500, quinhentas:500,
    seiscentos:600, seiscentas:600, setecentos:700, setecentas:700,
    oitocentos:800, oitocentas:800, novecentos:900, novecentas:900,
  };

  const clean = t.replace(/\be\b/g, " ").replace(/\s+/g, " ").trim();
  const parts = clean.split(" ");

  let result = 0;
  let current = 0;

  for (const p of parts) {
    if (p === "mil") {
      current = current || 1;
      result += current * 1000;
      current = 0;
    } else if (HUNDREDS[p] !== undefined) {
      current += HUNDREDS[p];
    } else if (ONES[p] !== undefined) {
      current += ONES[p];
    }
  }
  result += current;
  return result > 0 ? result : null;
}

function tryAuthenticate(message: string, session: SessionState): boolean {
  const parsed = parsePortuguesePIN(message);
  if (parsed && parsed === CEO_PIN) {
    session.ceoAuthenticated = true;
    return true;
  }
  return false;
}

// Ferramentas disponíveis — só inclui Meta Ads se webhook configurado
function getTools(): Anthropic.Tool[] {
  if (process.env.N8N_META_ADS_WEBHOOK) return [metaAdsTool];
  return [];
}

// Chamada ao Claude com retry em overload
async function callClaude(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (e: any) {
      const isOverload = e?.status === 529 || e?.message?.includes("overloaded");
      if (isOverload && attempt < 3) {
        log("warn", `API sobrecarregada, tentativa ${attempt}/3...`);
        await new Promise(r => setTimeout(r, attempt * 1500));
      } else {
        throw e;
      }
    }
  }
  throw new Error("Sem resposta após retries");
}

controllerRouter.post("/ask", async (req, res) => {
  const { message, sessionId = "default" } = req.body as {
    message: string;
    sessionId?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Mensagem não pode ser vazia." });
    return;
  }

  log("info", `→ pergunta [${sessionId}]`, message);

  const session = getSession(sessionId);

  if (!session.ceoAuthenticated) {
    const authed = tryAuthenticate(message, session);
    if (authed) log("info", `✅ CEO autenticado [${sessionId}]`);
  }

  try {
    const context = await buildContext();
    const systemPrompt = buildSystemPrompt(context, session.ceoAuthenticated);
    const tools = getTools();

    log("info", `contexto carregado | tools: ${tools.map(t => t.name).join(", ") || "nenhuma"}`);

    session.history.push({ role: "user", content: message });

    // ── Primeira chamada ao Claude ──
    log("info", "chamando Claude (1ª)...");
    let claudeResponse = await callClaude({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: systemPrompt,
      messages: session.history,
      ...(tools.length > 0 && { tools }),
    });
    if (claudeResponse.stop_reason === "tool_use") {
      log("info", "MAX identificando agentes necessários...");
    }

    // ── Loop de tool_use: Claude pode chamar ferramentas ──
    while (claudeResponse.stop_reason === "tool_use") {
      const toolUseBlock = claudeResponse.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      if (!toolUseBlock) break;

      log("info", `tool_use: ${toolUseBlock.name}`, toolUseBlock.input);

      // Executa a ferramenta
      let toolResult = "";
      if (toolUseBlock.name === "query_meta_ads") {
        const qInput = toolUseBlock.input as { empresa?: string; mensagem: string };
        const empresa = (qInput.empresa ?? "").trim();
        const qLower  = (qInput.mensagem ?? "").toLowerCase();

        log("info", empresa
          ? `ativando agente de tráfego → ${empresa}`
          : "ativando agente de tráfego");

        // Logs contextuais baseados na intenção da pergunta
        const contextSteps: string[] = [];
        if (/campanha|ad set|conjunto de anúnci/.test(qLower))              contextSteps.push("varrendo campanhas ativas");
        if (/anúncio|criativo|copy/.test(qLower))                           contextSteps.push("entrando em nível de anúncio");
        if (/roas|cpc|cpm|ctr|alcance|impressões|performance/.test(qLower)) contextSteps.push("coletando métricas de performance");
        if (/investimento|gasto|verba|custo/.test(qLower))                  contextSteps.push("levantando dados de investimento");
        if (/lead|captação|conversão/.test(qLower))                         contextSteps.push("analisando conversões e leads");
        if (contextSteps.length === 0)                                       contextSteps.push("buscando dados de campanhas");

        for (const step of contextSteps) {
          await new Promise(r => setTimeout(r, 350));
          log("info", step);
        }

        // Resolve account_id pelo nome da empresa no contexto já carregado
        let accountId: string | undefined;
        if (empresa) {
          const clientMatch = context.clients.find(
            c => c.name.toLowerCase().includes(empresa.toLowerCase()) ||
                 empresa.toLowerCase().includes(c.name.toLowerCase())
          );
          accountId = clientMatch?.metaAdsAccountId ?? undefined;
          if (accountId) {
            log("info", `account_id encontrado para ${empresa}: ${accountId}`);
          } else {
            log("warn", `account_id não encontrado para "${empresa}" — n8n vai precisar resolver`);
          }
        }

        log("info", "chamando webhook Meta Ads...");
        toolResult = await callMetaAdsWebhook({ ...qInput, account_id: accountId });
        log("info", "webhook respondeu", toolResult.slice(0, 300));
      }

      // Segunda chamada — injeta dados da ferramenta como texto (evita tool_result sem tools)
      // A API da Anthropic rejeita tool_result em messages sem tools definido (HTTP 400).
      // Passar como texto simples resolve o problema e ainda evita loop de tool_use.
      const synthesisMessages: Anthropic.MessageParam[] = [
        ...session.history,
        {
          role: "user",
          content: `[Dados do agente de tráfego]\n${toolResult}\n\nResponda à pergunta original acima.`,
        },
      ];

      log("info", "chamando Claude (2ª, pós-tool)...");
      claudeResponse = await callClaude({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: systemPrompt,
        messages: synthesisMessages,
      });
    }

    const text =
      claudeResponse.content.find(b => b.type === "text")?.type === "text"
        ? (claudeResponse.content.find(b => b.type === "text") as Anthropic.TextBlock).text
        : "";

    log("info", `← resposta (${text.length} chars)`, text.slice(0, 200));

    session.history.push({ role: "assistant", content: text });

    // Limita histórico a 20 mensagens
    if (session.history.length > 20) session.history.splice(0, 2);

    log("info", "gerando áudio TTS...");
    const audioBase64 = await Promise.race([
      textToSpeech(text),
      new Promise<null>(r => setTimeout(() => r(null), 25000)),
    ]);

    if (audioBase64) {
      log("info", `áudio gerado (${Math.round(audioBase64.length / 1024)}KB)`);
    } else {
      log("warn", "TTS falhou ou timeout — resposta sem áudio");
    }

    res.json({ text, audioBase64, ceoAuthenticated: session.ceoAuthenticated });
  } catch (err: any) {
    log("error", "erro no /ask", err?.message || String(err));
    res.status(500).json({ error: "Erro interno ao processar a pergunta." });
  }
});

// Limpa sessão
controllerRouter.delete("/session/:sessionId", (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
});

// Logs em tempo real
controllerRouter.get("/logs", (req, res) => {
  const since = req.query.since ? parseInt(req.query.since as string) : undefined;
  res.json(getLogs(since));
});

// Status atual (último log)
controllerRouter.get("/status", (_req, res) => {
  res.json(getLatest());
});
