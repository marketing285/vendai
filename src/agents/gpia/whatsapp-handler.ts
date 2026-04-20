/**
 * whatsapp-handler.ts
 * Canal direto de atualização via WhatsApp para gestores, CEO e CMO.
 *
 * Fluxo:
 *  1. Gestor/CEO envia mensagem direta ao número do MAX
 *  2. Claude extrai decisão/ação em JSON estruturado
 *  3. Aplica atualizações no NocoDB (status, observação, prazo)
 *  4. Salva na memória do GPIA (gpia_memory no Supabase)
 *  5. Responde ao remetente confirmando as ações
 *
 * Mensagens curtas (<500 chars) → Haiku (rápido)
 * Transcrições/atas (≥500 chars ou palavra-chave) → Sonnet (análise profunda)
 */

import Anthropic from "@anthropic-ai/sdk";
import { NDB, ndbList, ndbUpdate } from "../controller/nocodb-tool";
import { sendTextMessage } from "../../integrations/whatsapp";
import { saveMemory, MemoryType } from "./memory";
import { log } from "../controller/logger";
import { BU } from "./analyzer";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Mapeamento de gestores por número de telefone ────────────────────────────
export interface Gestor {
  nome:  string;
  bu:    BU | null;
  role:  "gestor" | "cmo" | "ceo";
}

const GESTORES: Record<string, Gestor> = {
  [process.env.GPIA_PHONE_BU1     ?? "5511995320721"]: { nome: "Christian", bu: "BU1", role: "gestor" },
  [process.env.GPIA_PHONE_ARMANDO ?? "5511994053632"]: { nome: "Armando",   bu: null,  role: "cmo"    },
  ...(process.env.GPIA_PHONE_BRUNO ? {
    [process.env.GPIA_PHONE_BRUNO]: { nome: "Bruno", bu: null, role: "ceo" },
  } : {}),
};

/** Retorna o Gestor correspondente ao número, ou null se desconhecido */
export function identificarGestor(phone: string): Gestor | null {
  const clean = phone.replace(/\D/g, "").replace(/@s\.whatsapp\.net$/, "");
  return GESTORES[clean] ?? null;
}

// ─── Estrutura de ação retornada pelo Claude ──────────────────────────────────
interface Acao {
  tipo:      "status" | "observacao" | "prazo" | "memoria" | "ignorar";
  tarefa?:   string;   // nome (parcial) da task para busca
  cliente?:  string;
  bu?:       "BU1" | "BU2";
  status?:   string;   // novo status
  obs?:      string;   // texto de observação
  prazo?:    string;   // YYYY-MM-DD
  memoria?:  string;   // contexto a salvar na memória do GPIA
  tipo_mem?: MemoryType;
}

interface RespostaIA {
  acoes:   Acao[];
  resumo:  string;   // confirmação em linguagem natural
}

// ─── Prompt para o Claude ─────────────────────────────────────────────────────
function buildPrompt(gestor: Gestor, mensagem: string, isAta: boolean): string {
  const buCtx = gestor.bu ? `BU: ${gestor.bu}` : "Acesso: todas as BUs";

  const instrucao = isAta
    ? `Você está analisando uma transcrição de reunião ou ata enviada por ${gestor.nome} (${gestor.role}, ${buCtx}).

Extraia TODAS as decisões, acordos e informações relevantes que impactam tasks ou clientes.
Para cada decisão/item, gere uma ação no array "acoes".`
    : `Você está interpretando uma mensagem de atualização enviada por ${gestor.nome} (${gestor.role}, ${buCtx}).

Interprete a intenção e gere as ações necessárias no NocoDB.`;

  return `${instrucao}

MENSAGEM:
"""
${mensagem}
"""

Retorne SOMENTE um JSON válido neste formato (sem markdown, sem explicação):
{
  "acoes": [
    {
      "tipo": "status"|"observacao"|"prazo"|"memoria"|"ignorar",
      "tarefa": "nome parcial da task (se aplicável)",
      "cliente": "nome do cliente (se aplicável)",
      "bu": "BU1"|"BU2" (se aplicável),
      "status": "novo status exato (ex: ✅ Entregue, 🔄 Em Revisão, ⏳ Pausado)",
      "obs": "texto da observação",
      "prazo": "YYYY-MM-DD",
      "memoria": "contexto relevante para memória do GPIA",
      "tipo_mem": "decisao"|"problema"|"padrao"|"feedback"
    }
  ],
  "resumo": "confirmação amigável em português do que será feito (1-3 linhas)"
}

Regras:
- Use "ignorar" se a mensagem não tem ação operacional
- Para mensagens sobre clientes/atrasos/negociações sem task específica → use tipo "memoria"
- Para tasks, preencha "tarefa" com palavras-chave do nome da task
- "bu" é obrigatório quando o gestor tem BU fixa; use a BU do gestor se não especificada`;
}

// ─── Busca task por palavras-chave na BU correta ──────────────────────────────
async function buscarTask(tarefa: string, bu: "BU1" | "BU2" | null | undefined): Promise<{ id: number; table: string } | null> {
  const tables = bu === "BU1" ? [NDB.tables.tasks_bu1]
               : bu === "BU2" ? [NDB.tables.tasks_bu2]
               : [NDB.tables.tasks_bu1, NDB.tables.tasks_bu2];

  for (const table of tables) {
    const rows = await ndbList(table, `(Tarefa,like,%${tarefa}%)`, 5);
    if (rows.length > 0) return { id: rows[0]["Id"] as number, table };
  }
  return null;
}

// ─── Aplica uma ação no NocoDB ────────────────────────────────────────────────
async function aplicarAcao(acao: Acao): Promise<string> {
  if (acao.tipo === "ignorar") return "";

  // Ação de memória pura (sem task)
  if (acao.tipo === "memoria") {
    const bu = acao.bu ?? "BU1";
    await saveMemory({
      bu,
      tipo:     acao.tipo_mem ?? "decisao",
      conteudo: acao.memoria ?? acao.obs ?? "",
      cliente:  acao.cliente,
    });
    return `✅ Contexto salvo na memória do GPIA`;
  }

  // Ações que precisam de uma task
  if (!acao.tarefa) return "";

  const found = await buscarTask(acao.tarefa, acao.bu);
  if (!found) {
    return `⚠️ Task "${acao.tarefa}" não encontrada`;
  }

  const update: Record<string, any> = {};
  if (acao.status) update["Status"]       = acao.status;
  if (acao.obs)    update["Observações"]  = acao.obs;
  if (acao.prazo)  update["Prazo de Entrega"] = acao.prazo;

  if (Object.keys(update).length > 0) {
    await ndbUpdate(found.table, found.id, update);
  }

  // Salva contexto na memória do GPIA se houver BU
  if (acao.bu && (acao.memoria || acao.obs)) {
    await saveMemory({
      bu:      acao.bu,
      tipo:    acao.tipo_mem ?? "decisao",
      conteudo: acao.memoria ?? `Task "${acao.tarefa}" atualizada: ${JSON.stringify(update)}`,
      cliente: acao.cliente,
    });
  }

  const campos = Object.entries(update).map(([k, v]) => `${k}: ${v}`).join(", ");
  return `✅ "${acao.tarefa}" → ${campos}`;
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function handleGestorMessage(phone: string, mensagem: string): Promise<void> {
  const gestor = identificarGestor(phone);
  if (!gestor) {
    log("warn", `[gpia/wpp] mensagem de número não cadastrado: ${phone}`);
    return;
  }

  log("info", `[gpia/wpp] mensagem de ${gestor.nome} (${gestor.role}): ${mensagem.slice(0, 80)}`);

  const isAta = mensagem.length >= 500
    || /\b(ata|transcrição|reunião|meeting|call)\b/i.test(mensagem);

  const model = isAta
    ? "claude-sonnet-4-6"
    : "claude-haiku-4-5-20251001";

  let resposta: RespostaIA;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: isAta ? 2000 : 800,
      messages: [{ role: "user", content: buildPrompt(gestor, mensagem, isAta) }],
    });

    let text = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    // Remove markdown code block se o Claude retornar ```json ... ```
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    // Extrai apenas o objeto JSON caso venha com texto antes/depois
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    text = jsonMatch ? jsonMatch[0] : "{}";
    resposta = JSON.parse(text) as RespostaIA;
  } catch (err: any) {
    log("error", `[gpia/wpp] erro ao chamar Claude: ${err?.message}`);
    await sendTextMessage(phone, "⚠️ Não consegui processar sua mensagem. Tente novamente.");
    return;
  }

  // Aplica todas as ações
  const resultados: string[] = [];
  for (const acao of resposta.acoes ?? []) {
    try {
      const r = await aplicarAcao(acao);
      if (r) resultados.push(r);
      await new Promise(r => setTimeout(r, 200));
    } catch (err: any) {
      log("warn", `[gpia/wpp] erro ao aplicar ação: ${err?.message}`);
      resultados.push(`⚠️ Erro: ${err?.message?.slice(0, 80)}`);
    }
  }

  // Monta resposta
  const confirmacao = [
    `*MAX recebeu sua atualização, ${gestor.nome}* 👇`,
    "",
    resposta.resumo ?? "Processado.",
    ...(resultados.length > 0 ? ["", ...resultados] : []),
  ].join("\n");

  await sendTextMessage(phone, confirmacao);
  log("info", `[gpia/wpp] ${resultados.length} ação(ões) aplicada(s) para ${gestor.nome}`);
}
