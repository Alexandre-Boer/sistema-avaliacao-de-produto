import {
  createProductSchema,
  listProductsQuerySchema,
} from "@/lib/validation/product";
import { createProduct } from "@/server/products/create-product";
import { listProducts } from "@/server/products/list-products";

export async function GET(request: Request): Promise<Response> {
  const query = Object.fromEntries(new URL(request.url).searchParams);

  const parsed = listProductsQuerySchema.safeParse(query);
  if (!parsed.success) {
    return Response.json(
      { error: "Parâmetros inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const page = await listProducts(parsed.data);
    return Response.json(page);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const { id } = await createProduct(parsed.data);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
