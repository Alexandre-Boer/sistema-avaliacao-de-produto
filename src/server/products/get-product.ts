import { createAdminClient } from "@/lib/supabase/admin";
import {
  type Product,
  type ProductRow,
  toProduct,
} from "@/server/products/product";

/** O Postgres rejeita U+0000 em `text`; um id com ele não é de produto nenhum. */
const NUL_CHARACTER = String.fromCharCode(0);

/** Busca um produto pelo id; `null` quando ele não existe ou o id é inválido. */
export async function getProductById(id: string): Promise<Product | null> {
  if (id.includes(NUL_CHARACTER)) {
    return null;
  }

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
