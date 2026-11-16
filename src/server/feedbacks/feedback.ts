/** Avaliação como a aplicação a enxerga (camelCase, data em ISO 8601). */
export type Feedback = {
  id: string;
  score: number;
  comment: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
};

/**
 * O que a página de um produto mostra: as avaliações mais recentes e o resumo
 * de todas elas. O resumo vem de contagens no banco, não das linhas listadas.
 */
export type FeedbackListing = {
  feedbacks: Feedback[];
  total: number;
  /** `null` quando o produto ainda não tem avaliações. */
  average: number | null;
  /** Quantidade de avaliações por nota (chaves de 1 a 5). */
  distribution: Record<number, number>;
};

/** Linha de `public.products_feedbacks` com o autor embutido via `created_by`. */
export type FeedbackRow = {
  id: string;
  score: number;
  comment: string;
  created_at: string;
  accounts: { first_name: string; last_name: string };
};

export function toFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    score: row.score,
    comment: row.comment,
    createdAt: row.created_at,
    author: {
      firstName: row.accounts.first_name,
      lastName: row.accounts.last_name,
    },
  };
}
