import { createAdminClient } from "@/lib/supabase/admin";
import {
  type Feedback,
  type FeedbackRow,
  toFeedback,
} from "@/server/feedbacks/feedback";

/** Lista todas as avaliações de um produto, das mais recentes para as mais antigas. */
export async function listFeedbacks(productId: string): Promise<Feedback[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products_feedbacks")
    .select(
      "id, score, comment, created_at, accounts:created_by (first_name, last_name)",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as FeedbackRow[]).map(toFeedback);
}
