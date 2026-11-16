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

/**
 * Tamanho máximo, em bytes, do corpo de `POST /api/v1/products`. Um produto
 * válido cabe com folga em 16 KB (nome, descrição e duas URLs somam ~6,3 KB).
 */
export const CREATE_PRODUCT_MAX_BODY_BYTES = 16 * 1024;

export const LIST_PRODUCTS_DEFAULT_LIMIT = 12;
export const LIST_PRODUCTS_MAX_LIMIT = 50;
/** Teto do `offset`: bem acima do volume do projeto e longe do limite do banco. */
export const LIST_PRODUCTS_MAX_OFFSET = 100_000;

/**
 * Parâmetro inteiro da query string. Só aceita dígitos decimais sem sinal, sem
 * zeros à esquerda, sem espaços, expoente, prefixo `0x` ou casas decimais; o
 * `z.coerce.number()` usava `Number()` e deixava passar `1e1`, `0x10`, `1.0` e
 * até o texto vazio (que vira 0).
 */
function integerParam(min: number, max: number, defaultValue: number) {
  return z
    .string()
    .regex(/^(0|[1-9]\d*)$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max))
    .default(defaultValue);
}

/** Query string de `GET /api/v1/products`: valores chegam como texto. */
export const listProductsQuerySchema = z.object({
  limit: integerParam(1, LIST_PRODUCTS_MAX_LIMIT, LIST_PRODUCTS_DEFAULT_LIMIT),
  offset: integerParam(0, LIST_PRODUCTS_MAX_OFFSET, 0),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
