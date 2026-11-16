import { z } from "zod";

export const FEEDBACK_COMMENT_MAX_LENGTH = 1000;

const SCORE_RANGE_MESSAGE = "Escolha uma nota de 1 a 5";

/**
 * Schema compartilhado entre o formulário e o endpoint. A nota precisa ser um
 * número de verdade: sem `coerce`, valores como `true`, `"0x3"` ou `[3]` são
 * rejeitados em vez de virarem uma nota.
 */
export const feedbackSchema = z.object({
  score: z
    .number({ message: SCORE_RANGE_MESSAGE })
    .int({ message: "A nota deve ser um número inteiro" })
    .min(1, { message: SCORE_RANGE_MESSAGE })
    .max(5, { message: SCORE_RANGE_MESSAGE }),
  comment: z
    .string()
    .trim()
    .min(1, { message: "Escreva um comentário" })
    .max(FEEDBACK_COMMENT_MAX_LENGTH, {
      message: `O comentário deve ter no máximo ${FEEDBACK_COMMENT_MAX_LENGTH} caracteres`,
    }),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
