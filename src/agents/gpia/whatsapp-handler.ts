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
import type { BU } from "./analyzer";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Mapeamento de gestores por número de telefone ────────────────────────────
export interface Gestor {
  nome:  string;
  bu:    BU | null;
  role:  "gestor" | "cmo" | "ceo";
}

const GESTORES: Record<string, Gestor> = {
  [process.env.GPIA_PHONE_BU1     ?? "5511995320721"]: { nome: "Christian", bu: "BU1", role: "gestor" },
  [process.env.GPIA_PHONE_ARMANDO ?? "5511994053632"]: { nome: "Armando",   bu: "BU2", role: "cmo"    },
  [process.env.GPIA_PHONE_BU3     ?? "5514991534843"]: { nome: "Bruna",     bu: "BU3", role: "gestor" },
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
  bu?:       "BU1" | "BU2" | "BU3";
  status?:   string;   // novo status
  obs?:      string;   // texto de observação
  prazo?:    string;   // YYYY-MM-DD
  memoria?:  string;   // contexto a salvar na memória do GPIA
  tipo_mem?: MemoryType;
}

interface RespostaIA {
  acoes:    Acao[];
  resposta: string;
}

// ─── Contexto operacional para o GPIA ────────────────────────────────────────
async function buildContextoGestor(gestor: Gestor): Promise<string> {
  try {
    const tables = gestor.bu === "BU1" ? [NDB.tables.tasks_bu1]
                 : gestor.bu === "BU2" ? [NDB.tables.tasks_bu2]
                 : gestor.bu === "BU3" ? [NDB.tables.tasks_bu3]
                 : [NDB.tables.tasks_bu1, NDB.tables.tasks_bu2, NDB.tables.tasks_bu3];

    const FECHADOS = ["✅ Entregue","Concluído","📦 Arquivado","📦 Arquivo","❌ Cancelado"];
    const linhas: string[] = [];

    for (const tid of tables) {
      const rows = await ndbList(tid, "(Status,isnotblank,)", 100);
      const abertas = rows.filter(r => !FECHADOS.includes(r["Status"] ?? ""));
      for (const r of abertas) {
        const sla = r["Status SLA"] ? ` [${r["Status SLA"]}]` : "";
        linhas.push(`- ${r["Tarefa"] ?? "—"} | ${r["Cliente"] ?? "—"} | ${r["Status"] ?? "—"}${sla} | Resp: ${r["Responsável"] ?? "—"} | Prazo: ${r["Prazo de Entrega"] ?? "—"}`);
      }
    }

    return linhas.length > 0
      ? `TASKS ABERTAS DA ${gestor.bu ?? "AGÊNCIA"}:\n${linhas.join("\n")}`
      : `Nenhuma task aberta encontrada para ${gestor.bu ?? "a agência"}.`;
  } catch {
    return "";
  }
}

// ─── System prompt de personalidade do GPIA ──────────────────────────────────
function buildSystemPrompt(gestor: Gestor): string {
  const buCtx = gestor.bu
    ? `Você está conversando com ${gestor.nome}, ${gestor.role === "gestor" ? "gestor(a)" : gestor.role} da ${gestor.bu}.`
    : `Você está conversando com ${gestor.nome}, que tem acesso a todas as BUs da agência.`;

  return `Você é o GPIA — Gestor de Projetos IA do Grupo Venda, uma agência de marketing.

${buCtx}

Seu papel: ser o co-piloto operacional dos gestores via WhatsApp. Você entende o contexto da agência, acompanha as tasks em tempo real e age como um parceiro inteligente — não como um bot.

Como você se comunica:
- Tom direto, humano e objetivo. Sem robotismo, sem formalidade excessiva.
- Responda como um colega experiente que entende o contexto, não como um sistema.
- Se a mensagem for uma atualização, processe e confirme de forma natural.
- Se for uma pergunta, responda com base nas tasks e contexto disponíveis.
- Se for uma ata ou transcrição, extraia as decisões e dê um resumo inteligente.
- Use *negrito* para destacar informações importantes no WhatsApp.
- Seja conciso. Máximo 3-4 linhas de resposta para mensagens simples.
- Não repita o nome do gestor a cada mensagem — isso parece robótico.
- Não use frases como "recebi sua atualização" ou "processado com sucesso".

Você tem acesso ao NocoDB e pode atualizar status, prazos e observações das tasks.`;
}

// ─── Prompt de extração de ações ─────────────────────────────────────────────
function buildUserPrompt(gestor: Gestor, mensagem: string, contexto: string, isAta: boolean): string {
  const instrucao = isAta
    ? `O gestor enviou uma transcrição/ata. Extraia TODAS as decisões e ações operacionais.`
    : `O gestor enviou a mensagem abaixo. Interprete a intenção e gere as ações necessárias.`;

  return `${instrucao}

${contexto ? `${contexto}\n` : ""}
MENSAGEM DE ${gestor.nome.toUpperCase()}:
"""
${mensagem}
"""

Retorne SOMENTE JSON válido (sem markdown):
{
  "acoes": [
    {
      "tipo": "status"|"observacao"|"prazo"|"memoria"|"ignorar",
      "tarefa": "palavras-chave do nome da task",
      "cliente": "nome do cliente",
      "bu": "${gestor.bu ?? "BU1"}",
      "status": "status exato (ex: ✅ Entregue, 🔄 Em Revisão, ⏸️ Pausado, 👤 Atribuído)",
      "obs": "texto da observação",
      "prazo": "YYYY-MM-DD",
      "memoria": "contexto a salvar",
      "tipo_mem": "decisao"|"problema"|"padrao"|"feedback"
    }
  ],
  "resposta": "sua resposta conversacional para o gestor — natural, direta, sem robotismo. Se for consulta sem ação, responda com base no contexto das tasks. Se houver ações, confirme de forma humana o que foi feito."
}

Regras:
- "ignorar" apenas se a mensagem for completamente sem sentido operacional
- Para perguntas sobre tasks/clientes → tipo "ignorar" nas acoes mas preencha "resposta" com a informação
- "bu" sempre ${gestor.bu ?? "conforme contexto"}
- A "resposta" deve parecer que veio de um colega, não de um sistema`;
}

// ─── Busca task por palavras-chave na BU correta ──────────────────────────────
async function buscarTask(tarefa: string, bu: "BU1" | "BU2" | "BU3" | null | undefined): Promise<{ id: number; table: string } | null> {
  const tables = bu === "BU1" ? [NDB.tables.tasks_bu1]
               : bu === "BU2" ? [NDB.tables.tasks_bu2]
               : bu === "BU3" ? [NDB.tables.tasks_bu3]
               : [NDB.tables.tasks_bu1, NDB.tables.tasks_bu2, NDB.tables.tasks_bu3];

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
    const contexto = await buildContextoGestor(gestor);
    const response = await anthropic.messages.create({
      model,
      max_tokens: isAta ? 2000 : 1000,
      system: buildSystemPrompt(gestor),
      messages: [{ role: "user", content: buildUserPrompt(gestor, mensagem, contexto, isAta) }],
    });

    let text = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    text = jsonMatch ? jsonMatch[0] : "{}";
    resposta = JSON.parse(text) as RespostaIA;
  } catch (err: any) {
    log("error", `[gpia/wpp] erro ao chamar Claude: ${err?.message}`);
    await sendTextMessage(phone, "Não consegui processar sua mensagem agora. Tenta de novo?");
    return;
  }

  // Aplica todas as ações no NocoDB
  const erros: string[] = [];
  for (const acao of resposta.acoes ?? []) {
    try {
      await aplicarAcao(acao);
      await new Promise(r => setTimeout(r, 200));
    } catch (err: any) {
      log("warn", `[gpia/wpp] erro ao aplicar ação: ${err?.message}`);
      erros.push(err?.message?.slice(0, 80));
    }
  }

  // Resposta conversacional
  const acoesReais = (resposta.acoes ?? []).filter(a => a.tipo !== "ignorar").length;
  const texto = resposta.resposta?.trim() || "Ok, registrado.";
  const sufixo = erros.length > 0 ? `\n\n⚠️ Alguns itens não foram atualizados: ${erros[0]}` : "";

  await sendTextMessage(phone, texto + sufixo);
  log("info", `[gpia/wpp] ${acoesReais} ação(ões) aplicada(s) para ${gestor.nome}`);
}
