import { cacheLife } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type Product,
  type ProductRow,
  toProduct,
} from "@/server/products/product";

/** O Postgres rejeita U+0000 em `text`; um id com ele não é de produto nenhum. */
const NUL_CHARACTER = String.fromCharCode(0);

/**
 * Busca um produto pelo id; `null` quando ele não existe ou o id é inválido.
 *
 * O resultado fica em cache (`use cache`) por alguns minutos. É o que permite à
 * página `/products/[id]` responder `404` de verdade: com o dado em cache a
 * busca termina durante a pré-renderização, antes de a resposta começar, e o
 * `notFound()` ainda consegue definir o status. Produtos não são editados pela
 * aplicação e o id é gerado no cadastro (nanoid), então um resultado guardado
 * não fica errado; uma alteração feita direto no banco aparece em minutos.
 */
export async function getProductById(id: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");

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
