import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateProductInput } from "@/lib/validation/product";

export async function createProduct(
  input: CreateProductInput,
): Promise<{ id: string }> {
  const id = nanoid();

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    id,
    name: input.name,
    description: input.description ?? null,
    external_link: input.externalLink,
    image_url: input.imageUrl,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { id };
}
