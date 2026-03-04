// Gera as perguntas de briefing mínimo para campos que faltam.
// Máximo de 3 perguntas por mensagem conforme padrão operacional.

const BRIEFING_QUESTIONS: Record<string, string> = {
  objetivo:
    "🎯 *Qual é o objetivo?*\nInformar / Vender / Institucional / Captar leads?",
  formato:
    "📐 *Qual o formato?*\nReels / Story / Carrossel / Anúncio / Landing Page / outro?",
  prazo:
    "📅 *Qual o prazo ideal?*\nExiste alguma data fixa ou evento específico?",
  referencias_cta:
    "🔗 *Tem referências e CTA?*\nEnvie 1–2 links de referência e o call-to-action desejado (ex: 'Clique e compre', 'Fale pelo WhatsApp').",
};

export function buildBriefingQuestions(missingFields: string[]): string {
  if (missingFields.length === 0) return "";

  // Pega no máximo 3 perguntas de uma vez
  const toAsk = missingFields.slice(0, 3);
  const questions = toAsk
    .map((field) => BRIEFING_QUESTIONS[field] ?? `❓ Informe: ${field}`)
    .join("\n\n");

  return `Para prosseguir, preciso de algumas informações:\n\n${questions}`;
}

export function isBriefingComplete(missingFields: string[]): boolean {
  return missingFields.length === 0;
}
