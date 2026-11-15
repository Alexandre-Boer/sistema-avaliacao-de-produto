import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1, { message: "Informe o nome" }),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  externalLink: z.url({ message: "Informe um link válido" }),
  imageUrl: z.url({ message: "Informe uma URL de imagem válida" }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const LIST_PRODUCTS_DEFAULT_LIMIT = 12;

/** Query string de `GET /api/v1/products`: valores chegam como texto. */
export const listProductsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(LIST_PRODUCTS_DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
