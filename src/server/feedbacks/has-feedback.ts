import { createAdminClient } from "@/lib/supabase/admin";

/** Diz se a conta já avaliou o produto (cada conta avalia um produto uma única vez). */
export async function hasFeedback(
  productId: string,
  accountId: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products_feedbacks")
    .select("id")
    .eq("product_id", productId)
    .eq("created_by", accountId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).length > 0;
}
