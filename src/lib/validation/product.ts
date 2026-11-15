import { z } from "zod";

const NAME_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
const URL_MAX_LENGTH = 2048;

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Informe o nome" })
    .max(NAME_MAX_LENGTH, { message: "O nome é longo demais" }),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX_LENGTH, { message: "A descrição é longa demais" })
    .optional()
    .transform((value) => value || undefined),
  // Só http(s): o link vira `href` na interface, então `javascript:`, `data:` etc. ficam de fora.
  externalLink: z
    .url({ protocol: /^https?$/, message: "Informe um link válido" })
    .max(URL_MAX_LENGTH, { message: "Informe um link válido" }),
  // Só https: é o único protocolo liberado para o `next/image` no `next.config.ts`.
  imageUrl: z
    .url({ protocol: /^https$/, message: "Informe uma URL de imagem válida" })
    .max(URL_MAX_LENGTH, { message: "Informe uma URL de imagem válida" }),
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
