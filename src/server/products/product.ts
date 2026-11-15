/** Produto como a aplicação o enxerga (camelCase, datas em ISO 8601). */
export type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  externalLink: string;
  score: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Espelho da tabela `public.products` (snake_case). */
export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  external_link: string;
  score: boolean;
  created_at: string;
  updated_at: string;
};

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    externalLink: row.external_link,
    score: row.score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
