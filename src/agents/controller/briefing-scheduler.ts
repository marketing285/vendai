/**
 * briefing-scheduler.ts
 * MAX gera briefings operacionais automaticamente em intervalos definidos.
 * O último briefing fica em cache e é servido instantaneamente ao dashboard.
 * Se o cache tiver menos de MAX_AGE_MS, retorna sem chamar Claude novamente.
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildContext } from "./context-builder";
import { buildSystemPrompt } from "./prompt";
import { log } from "./logger";

const INTERVALO_MS  = 15 * 60 * 1000; // gera a cada 15 min
const MAX_AGE_MS    = 14 * 60 * 1000; // cache válido por 14 min (serve ao dashboard sem recalcular)

interface Briefing {
  score: number;
  status: string;
  statusColor: string;
  summary: string;
  areas: { name: string; score: number; note: string }[];
  gargalos: { severity: "alta" | "media" | "baixa"; text: string }[];
  acoes: string[];
  generatedAt: string;
}

let cached: Briefing | null = null;
let generatingNow = false;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateBriefing(): Promise<Briefing> {
  const ctx = await buildContext();
  const systemPrompt = buildSystemPrompt(ctx, false);

  const CLOSED = ["Concluído","Cancelado","✅ Entregue","✅ Concluído","📦 Arquivo","📦 Arquivado"];
  const abertas   = ctx.tasks.filter(t => !CLOSED.includes(t.status));
  const atrasadas = abertas.filter(t => t.sla?.includes("Atrasado"));
  const atencao   = abertas.filter(t => t.sla?.includes("Atenção"));
  const aprovacao = abertas.filter(t => t.status?.includes("Aprovação") || t.status?.includes("Revisão Interna"));

  const areaStats = ["BU1","BU2","Design","Edição"].map(area => {
    const at   = abertas.filter(t => t.area === area);
    const late = at.filter(t => t.sla?.includes("Atrasado")).length;
    const warn = at.filter(t => t.sla?.includes("Atenção")).length;
    return { area, total: at.length, late, warn };
  });

  const dmCurrent = [...(ctx.designMetrics ?? [])].sort((a, b) => b.month.localeCompare(a.month))[0];
  const emCurrent = [...(ctx.edicaoMetrics  ?? [])].sort((a, b) => b.month.localeCompare(a.month))[0];

  const contextResume = [
    `Tasks abertas: ${abertas.length} | Atrasadas: ${atrasadas.length} | Atenção: ${atencao.length} | Aguardando aprovação: ${aprovacao.length}`,
    ...areaStats.map(s => `  ${s.area}: ${s.total} tasks abertas, ${s.late} atrasadas, ${s.warn} atenção`),
    dmCurrent ? `Design (Bruna): ${dmCurrent.delivered} artes entregues de ${dmCurrent.totalPlanned} total | ${dmCurrent.inApproval} artes em aprovação | ${dmCurrent.withRevision} revisões | ${dmCurrent.uniqueDeliveredTasks} tasks entregues de ${dmCurrent.uniqueTasks} total | média ${dmCurrent.avgDailyProduction} artes/dia útil` : "",
    emCurrent ? `Edição (Ana Laura): ${emCurrent.delivered} vídeos entregues de ${emCurrent.totalPlanned} total | ${emCurrent.withRevision} precisaram de alteração` : "",
    `Clientes ativos: ${ctx.clients.filter(c => c.status === "Ativo").length}`,
  ].filter(Boolean).join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    system: systemPrompt,
    messages: [{
      role: "user",
      content: `Com base nos dados operacionais abaixo, gere um briefing estruturado em JSON.

DADOS ATUAIS:
${contextResume}

Retorne SOMENTE um JSON válido, sem markdown, sem explicações, no formato exato abaixo:
{
  "score": <número 0-100 representando saúde geral da operação>,
  "status": <"Operação Saudável" | "Atenção Necessária" | "Situação Crítica">,
  "statusColor": <"#22C55E" | "#F59E0B" | "#EF4444">,
  "summary": <string de 1-2 frases com diagnóstico direto do momento atual>,
  "areas": [
    { "name": "BU1",    "score": <0-100>, "note": <string curta com diagnóstico da área> },
    { "name": "BU2",    "score": <0-100>, "note": <string curta> },
    { "name": "Design", "score": <0-100>, "note": <string curta> },
    { "name": "Edição", "score": <0-100>, "note": <string curta> }
  ],
  "gargalos": [
    { "severity": <"alta" | "media" | "baixa">, "text": <string descrevendo o gargalo> }
  ],
  "acoes": [<string com ação recomendada>, ...]
}

Regras:
- score 0-100: 100 = operação perfeita, 0 = colapso total
- gargalos: máximo 4, só inclua se forem reais com base nos dados
- acoes: máximo 3, objetivas e acionáveis agora
- summary: fale como COO, direto ao ponto, sem enrolação
- IMPORTANTE: para Design, sempre use "artes" (não "tasks") — cada task pode conter múltiplas artes`,
    }],
  });

  const rawText = response.content.find(b => b.type === "text")?.type === "text"
    ? (response.content.find(b => b.type === "text") as Anthropic.TextBlock).text
    : "";

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("MAX não retornou JSON válido");

  // Remove TODOS os caracteres de controle do texto bruto antes de parsear
  // Isso é seguro pois JSON não precisa de \n literais no output do Claude
  const cleanJson = jsonMatch[0]
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ");
  const briefing = JSON.parse(cleanJson) as Briefing;
  briefing.generatedAt = new Date().toISOString();
  return briefing;
}

/** Retorna o briefing em cache ou gera um novo se expirado. */
export async function getBriefing(): Promise<Briefing> {
  if (cached) {
    const age = Date.now() - new Date(cached.generatedAt).getTime();
    if (age < MAX_AGE_MS) return cached;
  }

  // Evita geração dupla simultânea
  if (generatingNow) {
    // Retorna cache antigo enquanto gera, ou espera até 10s
    if (cached) return cached;
    await new Promise(r => setTimeout(r, 3000));
    if (cached) return cached;
    throw new Error("Briefing sendo gerado, tente em instantes");
  }

  generatingNow = true;
  try {
    cached = await generateBriefing();
    log("info", `[briefing] gerado — score: ${cached.score} | ${cached.status}`);
    return cached;
  } finally {
    generatingNow = false;
  }
}

/** Inicia o scheduler que gera briefings em background. */
export function startBriefingScheduler(): void {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    log("warn", "[briefing] ANTHROPIC_API_KEY não configurada — scheduler desativado.");
    return;
  }

  // Primeira geração após 30s do boot (aguarda contexto carregar)
  setTimeout(async () => {
    try { await getBriefing(); }
    catch (e: any) { log("error", "[briefing] erro na geração inicial", e?.message); }
  }, 30_000);

  setInterval(async () => {
    try { await getBriefing(); }
    catch (e: any) { log("error", "[briefing] erro no ciclo", e?.message); }
  }, INTERVALO_MS);

  log("info", `[briefing] scheduler iniciado — intervalo: ${INTERVALO_MS / 60000} min`);
}
