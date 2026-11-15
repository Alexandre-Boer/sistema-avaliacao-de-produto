import { createAdminClient } from "@/lib/supabase/admin";
import type { ListProductsQuery } from "@/lib/validation/product";
import {
  type Product,
  type ProductRow,
  toProduct,
} from "@/server/products/product";

export type ProductsPage = {
  items: Product[];
  /** Offset da próxima página, ou `null` quando esta é a última. */
  nextOffset: number | null;
};

export async function listProducts({
  limit,
  offset,
}: ListProductsQuery): Promise<ProductsPage> {
  const supabase = createAdminClient();
  // `range` é inclusivo nas duas pontas: pede `limit + 1` linhas. A linha extra
  // só serve para saber se existe uma próxima página, sem um `count` separado.
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ProductRow[];

  return {
    items: rows.slice(0, limit).map(toProduct),
    nextOffset: rows.length > limit ? offset + limit : null,
  };
}
