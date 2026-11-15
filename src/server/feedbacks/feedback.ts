/** Avaliação como a aplicação a enxerga (camelCase, data em ISO 8601). */
export type Feedback = {
  id: string;
  score: number;
  comment: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
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
