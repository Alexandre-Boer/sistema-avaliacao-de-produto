import {
  CREATE_PRODUCT_MAX_BODY_BYTES,
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

/**
 * Lê o corpo como texto, desistindo assim que ele passa de `maxBytes`. Devolve
 * `null` quando o limite é excedido. O `Content-Length` pode estar ausente ou
 * mentir, então os bytes são contados durante a leitura.
 */
async function readBodyText(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

function payloadTooLarge(): Response {
  return Response.json(
    { error: "Corpo da requisição grande demais" },
    { status: 413 },
  );
}

export async function POST(request: Request): Promise<Response> {
  // Atalho: quando o cliente declara um tamanho acima do limite, nem lê o corpo.
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > CREATE_PRODUCT_MAX_BODY_BYTES) {
    return payloadTooLarge();
  }

  let body: unknown;
  try {
    const text = await readBodyText(request, CREATE_PRODUCT_MAX_BODY_BYTES);
    if (text === null) {
      return payloadTooLarge();
    }
    body = JSON.parse(text);
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
