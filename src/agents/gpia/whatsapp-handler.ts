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
import { buildContext } from "../controller/context-builder";
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

/** Remove todos os não-dígitos e sufixos WhatsApp */
function limparPhone(raw: string): string {
  return raw.replace(/@s\.whatsapp\.net$/, "").replace(/@g\.us$/, "").replace(/\D/g, "");
}

/**
 * Gera variantes do número para lidar com o 9° dígito brasileiro.
 * Ex: "5511995320721" → ["5511995320721", "55119995320721"] (e vice-versa)
 */
function variantesPhone(num: string): string[] {
  const variants = [num];
  // Remove código do país (55) para verificar comprimento
  if (num.startsWith("55") && num.length === 12) {
    // 10 dígitos após 55 → adiciona 9 após DDD (posição 4)
    variants.push(num.slice(0, 4) + "9" + num.slice(4));
  } else if (num.startsWith("55") && num.length === 13) {
    // 11 dígitos após 55 → remove o 9 após DDD
    variants.push(num.slice(0, 4) + num.slice(5));
  }
  return variants;
}

export const GESTORES_LIST: { phone: string; gestor: Gestor }[] = [
  { phone: limparPhone(process.env.GPIA_PHONE_BU1     ?? "5511995320721"), gestor: { nome: "Christian", bu: "BU1", role: "gestor" } },
  { phone: limparPhone(process.env.GPIA_PHONE_ARMANDO ?? "5511994053632"), gestor: { nome: "Armando",   bu: "BU2", role: "cmo"    } },
  { phone: limparPhone(process.env.GPIA_PHONE_BU3     ?? "5514991534843"), gestor: { nome: "Bruna",     bu: "BU3", role: "gestor" } },
  ...(process.env.GPIA_PHONE_BRUNO
    ? [{ phone: limparPhone(process.env.GPIA_PHONE_BRUNO), gestor: { nome: "Bruno", bu: null as BU | null, role: "ceo" as const } }]
    : []),
];

/** Retorna o Gestor correspondente ao número, ou null se desconhecido.
 *  Tenta variantes com/sem 9° dígito brasileiro. */
export function identificarGestor(phone: string): Gestor | null {
  const clean    = limparPhone(phone);
  const variants = variantesPhone(clean);
  for (const entry of GESTORES_LIST) {
    if (variants.includes(entry.phone) || variantesPhone(entry.phone).includes(clean)) {
      return entry.gestor;
    }
  }
  return null;
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

// ─── Contexto operacional completo via NocoDB ─────────────────────────────────
async function buildContextoGestor(gestor: Gestor): Promise<string> {
  try {
    const ctx = await buildContext();
    const FECHADOS = new Set(["✅ Entregue","Concluído","📦 Arquivado","📦 Arquivo","❌ Cancelado","Cancelado"]);
    const linhas: string[] = [];

    // ── Clientes ──────────────────────────────────────────────────────────────
    const clientes = ctx.clients.filter(c => !gestor.bu || c.bu === gestor.bu || gestor.role === "ceo");
    if (clientes.length > 0) {
      linhas.push(`CLIENTES (${clientes.length}):`);
      for (const c of clientes) {
        const pacote = c.pacote && c.pacote !== "—" ? ` [${c.pacote}]` : "";
        const canais = c.canaisAtivos && c.canaisAtivos !== "—" ? ` | ${c.canaisAtivos}` : "";
        linhas.push(`  ${c.bu} | ${c.name} (${c.segment})${pacote} | ${c.status}${canais}`);
      }
      linhas.push("");
    }

    // ── Tasks abertas por área ────────────────────────────────────────────────
    const todasAbertas = ctx.tasks.filter(t => !FECHADOS.has(t.status));
    const areas = gestor.bu
      ? [gestor.bu, "Design", "Edição"]
      : ["BU1", "BU2", "BU3", "Design", "Edição"];

    for (const area of areas) {
      const tasks = todasAbertas.filter(t => t.area === area);
      if (tasks.length === 0) continue;
      const atrasadas = tasks.filter(t => t.sla?.includes("Atrasado")).length;
      const atencao   = tasks.filter(t => t.sla?.includes("Atenção")).length;
      linhas.push(`TASKS ${area} (${tasks.length} abertas${atrasadas > 0 ? ` | 🔴 ${atrasadas} atrasadas` : ""}${atencao > 0 ? ` | ⚠️ ${atencao} atenção` : ""}):`);
      for (const t of tasks) {
        const dias = t.daysLeft != null ? ` | ${t.daysLeft}d` : "";
        const sla  = t.sla && t.sla !== "—" ? ` [${t.sla}]` : "";
        linhas.push(`  - ${t.title} | ${t.client} | ${t.status}${sla} | ${t.responsible}${dias}`);
      }
      linhas.push("");
    }

    // ── Métricas de design ────────────────────────────────────────────────────
    const thisMonth = new Date().toISOString().slice(0, 7);
    const dm = [...(ctx.designMetrics ?? [])].filter(m => m.month <= thisMonth).sort((a, b) => b.month.localeCompare(a.month))[0];
    if (dm) {
      linhas.push(`DESIGN — ${dm.label}: ${dm.delivered} artes entregues de ${dm.totalPlanned} total (${dm.completionPct}%) | ${dm.inApproval} em aprovação | ${dm.withRevision} com revisão | média ${dm.avgDailyProduction}/dia`);
      linhas.push("");
    }

    // ── Métricas de edição ────────────────────────────────────────────────────
    const em = [...(ctx.edicaoMetrics ?? [])].filter(m => m.month <= thisMonth).sort((a, b) => b.month.localeCompare(a.month))[0];
    if (em) {
      linhas.push(`EDIÇÃO — ${em.label}: ${em.delivered} vídeos entregues de ${em.totalPlanned} total (${em.completionPct}%) | ${em.withRevision} com alteração`);
      linhas.push("");
    }

    linhas.push(`Data atual: ${new Date().toLocaleDateString("pt-BR")}`);
    return linhas.join("\n");
  } catch (e: any) {
    log("warn", `[gpia/wpp] erro ao buscar contexto: ${e?.message}`);
    return "";
  }
}

// ─── System prompt de personalidade do GPIA ──────────────────────────────────
function buildSystemPrompt(gestor: Gestor): string {
  const quemEh = gestor.bu
    ? `Você está conversando com *${gestor.nome}*, ${gestor.role === "gestor" ? "gestor(a)" : gestor.role} da ${gestor.bu}.`
    : `Você está conversando com *${gestor.nome}* (${gestor.role}), com acesso a todas as BUs.`;

  return `Você é o GPIA — Gestor de Projetos IA do Grupo Venda, agência de marketing digital.

${quemEh}

## Estrutura da agência

**Diretoria:**
- Bruno Zanardo — CEO
- Armando Cavazana — CMO e gestor da BU2

**Unidades de Negócio (BUs):**
- BU1 — Gestor: Christian Castilhoni
  Clientes: Fernanda Aoki, Net Infinito, AWF Contábil, Moura Leite Loteamentos, Biointegra, Café com Padre, Geezer Cervejaria, Atacado Agropet, Dr. Joaquim Almeida, VendAgro, Grupo Venda
- BU2 — Gestor: Armando Cavazana
  Clientes: Hidroaço, DNA Imóveis
- BU3 — Gestora: Bruna Benevides
  Clientes: Acquafit, Inovameta

**Produção:**
- Design: Bruna Benevides (artes, identidade visual, feed, stories, carrosséis)
- Edição de vídeo: Samantha (Reels, cortes, edições)
- Videomakers: Hebert Luidy, André Talamonte, Daniel (captações)

**Fluxo de status das tasks:**
👤 Atribuído → 🎨 Em Design / 🎬 Em Edição → ⏳ Em Aprovação → 🔎 Revisão Interna → ✅ Entregue → 📦 Arquivado

**Status SLA:**
✅ No Prazo | ⚠️ Atenção (≤2 dias) | 🔴 Atrasado

## Seu papel

Você é o co-piloto operacional dos gestores via WhatsApp. Você tem acesso completo ao NocoDB — tasks de todas as BUs, clientes, design e edição — e pode:
- Atualizar status, prazo e observações de qualquer task
- Responder perguntas sobre o que está aberto, atrasado ou em aprovação
- Extrair decisões de atas e reuniões
- Registrar contexto na memória da agência

## Como você se comunica

- Tom direto, humano e objetivo. Sem robotismo.
- Responda como um colega experiente, não como um sistema.
- Use *negrito* para destacar informações importantes no WhatsApp.
- Seja conciso — máximo 4-5 linhas para mensagens simples, mais apenas se for uma consulta detalhada.
- Não repita o nome do gestor a cada mensagem.
- Não use frases como "recebi sua atualização" ou "processado com sucesso".
- Quando houver tarefas atrasadas ou críticas, sinalize com clareza.
- Para perguntas sobre tasks/clientes, responda com base no contexto real do NocoDB.`;
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
