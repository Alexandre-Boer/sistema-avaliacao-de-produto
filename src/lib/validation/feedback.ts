import { z } from "zod";

export const FEEDBACK_COMMENT_MAX_LENGTH = 1000;

const SCORE_RANGE_MESSAGE = "Escolha uma nota de 1 a 5";

/**
 * Pelo menos um caractere que a pessoa enxerga: nem espaço, nem controle ou
 * formatação (largura zero, como U+200B), nem os "preenchedores" em branco
 * (U+3164, U+2800). O `trim()` sozinho não remove nenhum desses.
 */
const VISIBLE_CHARACTER =
  /[^\p{White_Space}\p{Default_Ignorable_Code_Point}\p{C}\u{2800}]/u;

/** O Postgres não armazena U+0000 em colunas `text`. */
const NUL_CHARACTER = String.fromCharCode(0);

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
    .refine((comment) => !comment.includes(NUL_CHARACTER), {
      message: "O comentário contém um caractere inválido",
    })
    .refine((comment) => VISIBLE_CHARACTER.test(comment), {
      message: "Escreva um comentário",
    })
    .max(FEEDBACK_COMMENT_MAX_LENGTH, {
      message: `O comentário deve ter no máximo ${FEEDBACK_COMMENT_MAX_LENGTH} caracteres`,
    }),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
