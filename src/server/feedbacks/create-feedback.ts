import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FeedbackInput } from "@/lib/validation/feedback";

const FOREIGN_KEY_VIOLATION = "23503";
const PRODUCT_FOREIGN_KEY = "products_feedbacks_product_id_fkey";

export class ProductNotFoundError extends Error {
  constructor() {
    super("Produto não encontrado");
    this.name = "ProductNotFoundError";
  }
}

/**
 * Grava uma avaliação. `accountId` vem da sessão e `productId` da URL: nenhum
 * dos dois é lido do corpo da requisição.
 */
export async function createFeedback(
  input: { productId: string; accountId: string } & FeedbackInput,
): Promise<{ id: string }> {
  const id = nanoid();

  const supabase = createAdminClient();
  const { error } = await supabase.from("products_feedbacks").insert({
    id,
    product_id: input.productId,
    created_by: input.accountId,
    score: input.score,
    comment: input.comment,
  });

  if (error) {
    // A tabela tem duas FKs; só a do produto significa "produto inexistente".
    if (
      error.code === FOREIGN_KEY_VIOLATION &&
      error.message.includes(PRODUCT_FOREIGN_KEY)
    ) {
      throw new ProductNotFoundError();
    }
    throw new Error(error.message);
  }

  return { id };
}
