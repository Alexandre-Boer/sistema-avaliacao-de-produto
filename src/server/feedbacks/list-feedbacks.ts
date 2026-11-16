import { createAdminClient } from "@/lib/supabase/admin";
import {
  type FeedbackListing,
  type FeedbackRow,
  toFeedback,
} from "@/server/feedbacks/feedback";

/** Quantas avaliações a página lista; o resumo cobre todas, sem limite. */
export const FEEDBACK_LIST_LIMIT = 50;

const SCORES = [1, 2, 3, 4, 5];

/**
 * Avaliações mais recentes de um produto e o resumo de todas elas.
 *
 * A API do Supabase corta qualquer consulta em 1000 linhas, então total, média
 * e distribuição não podem ser calculados a partir das linhas devolvidas. Em
 * vez disso o banco conta as avaliações de cada nota (`count: "exact"` com
 * `head: true`, que não traz linha nenhuma) e o resumo sai dessas cinco
 * contagens, corretas para qualquer quantidade.
 */
export async function listFeedbacks(
  productId: string,
): Promise<FeedbackListing> {
  const supabase = createAdminClient();

  const [recent, ...counts] = await Promise.all([
    supabase
      .from("products_feedbacks")
      .select(
        "id, score, comment, created_at, accounts:created_by (first_name, last_name)",
      )
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(FEEDBACK_LIST_LIMIT),
    ...SCORES.map((score) =>
      supabase
        .from("products_feedbacks")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId)
        .eq("score", score),
    ),
  ]);

  if (recent.error) {
    throw new Error(recent.error.message);
  }

  const distribution: Record<number, number> = {};
  let total = 0;
  let sum = 0;
  for (const [index, score] of SCORES.entries()) {
    const { count, error } = counts[index];
    if (error) {
      throw new Error(error.message);
    }
    distribution[score] = count ?? 0;
    total += distribution[score];
    sum += score * distribution[score];
  }

  return {
    feedbacks: ((recent.data ?? []) as unknown as FeedbackRow[]).map(
      toFeedback,
    ),
    total,
    average: total > 0 ? sum / total : null,
    distribution,
  };
}
