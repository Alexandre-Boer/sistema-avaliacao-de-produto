import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FeedbackInput } from "@/lib/validation/feedback";

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";
const PRODUCT_FOREIGN_KEY = "products_feedbacks_product_id_fkey";
const AUTHOR_FOREIGN_KEY = "products_feedbacks_created_by_fkey";
const ONE_FEEDBACK_PER_ACCOUNT_INDEX =
  "products_feedbacks_product_id_created_by_key";

/** O Postgres rejeita U+0000 em `text`; um id com ele não é de produto nenhum. */
const NUL_CHARACTER = String.fromCharCode(0);

export class ProductNotFoundError extends Error {
  constructor() {
    super("Produto não encontrado");
    this.name = "ProductNotFoundError";
  }
}

/** A conta já avaliou este produto (índice único em `product_id, created_by`). */
export class DuplicateFeedbackError extends Error {
  constructor() {
    super("Você já avaliou este produto");
    this.name = "DuplicateFeedbackError";
  }
}

/** A conta da sessão foi removida: a sessão ainda verifica, mas não vale mais. */
export class AccountNotFoundError extends Error {
  constructor() {
    super("Sua sessão expirou. Entre novamente para avaliar.");
    this.name = "AccountNotFoundError";
  }
}

/**
 * Grava uma avaliação. `accountId` vem da sessão e `productId` da URL: nenhum
 * dos dois é lido do corpo da requisição.
 */
export async function createFeedback(
  input: { productId: string; accountId: string } & FeedbackInput,
): Promise<{ id: string }> {
  if (input.productId.includes(NUL_CHARACTER)) {
    throw new ProductNotFoundError();
  }

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
    // A tabela tem duas FKs: a do produto é "produto inexistente" e a do autor
    // é "conta removida". O nome da constraint vem na mensagem do Postgres.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      if (error.message.includes(PRODUCT_FOREIGN_KEY)) {
        throw new ProductNotFoundError();
      }
      if (error.message.includes(AUTHOR_FOREIGN_KEY)) {
        throw new AccountNotFoundError();
      }
    }
    if (
      error.code === UNIQUE_VIOLATION &&
      error.message.includes(ONE_FEEDBACK_PER_ACCOUNT_INDEX)
    ) {
      throw new DuplicateFeedbackError();
    }
    throw new Error(error.message);
  }

  return { id };
}
