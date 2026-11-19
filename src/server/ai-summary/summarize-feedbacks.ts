import { feedbackSummaryAgent } from "@/mastra/agents/feedback-summary-agent";

/** Tamanho máximo do resumo guardado e exibido. */
export const SUMMARY_MAX_LENGTH = 1200;

/** Quanto de cada comentário vai para o modelo. */
const COMMENT_MAX_LENGTH = 500;

/**
 * Teto de caracteres de avaliações por pedido (cerca de 2.500 tokens). Mantém o
 * pedido dentro da janela de contexto de um modelo local pequeno e limita o
 * custo num modelo pago.
 */
const PROMPT_COMMENTS_BUDGET = 8000;

/** Tempo máximo de espera pelo modelo; a página não fica presa além disso. */
export const SUMMARY_TIMEOUT_MS = 30_000;

export type FeedbackForSummary = { score: number; comment: string };

/**
 * Deixa um texto de cliente seguro para entrar no pedido: sem `<` e `>` (que
 * poderiam fechar o delimitador `<avaliacoes>`) e em uma linha só.
 */
function sanitize(text: string, maxLength: number): string {
  const singleLine = text.replace(/[<>]/g, " ").replace(/\s+/g, " ").trim();
  return singleLine.length <= maxLength
    ? singleLine
    : `${singleLine.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Monta a mensagem enviada ao agente. As avaliações entram na ordem recebida
 * (mais recentes primeiro) até o teto de caracteres; as que não cabem ficam de
 * fora. Só nota e comentário são enviados, nunca quem escreveu.
 */
export function buildSummaryPrompt(
  productName: string,
  feedbacks: FeedbackForSummary[],
): string {
  const lines: string[] = [];
  let used = 0;

  for (const feedback of feedbacks) {
    const line = `[nota ${feedback.score}/5] ${sanitize(feedback.comment, COMMENT_MAX_LENGTH)}`;
    if (lines.length > 0 && used + line.length > PROMPT_COMMENTS_BUDGET) {
      break;
    }
    lines.push(line);
    used += line.length;
  }

  return [
    `Produto: ${sanitize(productName, 200)}`,
    "",
    "<avaliacoes>",
    ...lines,
    "</avaliacoes>",
    "",
    "Escreva o resumo geral dessas avaliações.",
  ].join("\n");
}

/**
 * Pede ao agente do Mastra o resumo das avaliações. Lança se o modelo falhar,
 * demorar demais ou devolver um texto vazio; quem chama decide o que fazer.
 */
export async function summarizeFeedbacks(
  productName: string,
  feedbacks: FeedbackForSummary[],
): Promise<string> {
  const response = await feedbackSummaryAgent.generate(
    buildSummaryPrompt(productName, feedbacks),
    {
      maxSteps: 1,
      modelSettings: {
        temperature: 0.3,
        maxOutputTokens: 300,
        timeout: { totalMs: SUMMARY_TIMEOUT_MS },
      },
    },
  );

  const summary = response.text.replace(/\s+/g, " ").trim();
  if (!summary) {
    throw new Error("O modelo devolveu um resumo vazio");
  }

  return summary.length <= SUMMARY_MAX_LENGTH
    ? summary
    : `${summary.slice(0, SUMMARY_MAX_LENGTH - 1).trimEnd()}…`;
}
