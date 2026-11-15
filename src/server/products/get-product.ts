import { createAdminClient } from "@/lib/supabase/admin";
import {
  type Product,
  type ProductRow,
  toProduct,
} from "@/server/products/product";

/** Busca um produto pelo id; `null` quando ele não existe. */
export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toProduct(data as ProductRow) : null;
}
