import { GET, POST } from "@/app/api/v1/products/route";
import { CREATE_PRODUCT_MAX_BODY_BYTES as MAX_BODY_BYTES } from "@/lib/validation/product";
import { createProduct } from "@/server/products/create-product";
import { listProducts } from "@/server/products/list-products";
import type { Product } from "@/server/products/product";

vi.mock("@/server/products/list-products", () => ({
  listProducts: vi.fn(),
}));
vi.mock("@/server/products/create-product", () => ({
  createProduct: vi.fn(),
}));

const listProductsMock = vi.mocked(listProducts);
const createProductMock = vi.mocked(createProduct);

const URL_BASE = "http://localhost/api/v1/products";

const product: Product = {
  id: "p1",
  name: "Fone X",
  description: "Sem fio",
  imageUrl: "https://img.com/fone.jpg",
  externalLink: "https://loja.com/fone",
  score: false,
  createdAt: "2026-11-13T12:00:00+00:00",
  updatedAt: "2026-11-13T12:00:00+00:00",
};

const validBody = {
  name: "Fone X",
  description: "Sem fio",
  externalLink: "https://loja.com/fone",
  imageUrl: "https://img.com/fone.jpg",
};

function get(query = ""): Request {
  return new Request(`${URL_BASE}${query}`);
}

function post(body: unknown): Request {
  return new Request(URL_BASE, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  listProductsMock.mockReset();
  createProductMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/v1/products", () => {
  it("retorna 200 com items e nextOffset", async () => {
    listProductsMock.mockResolvedValueOnce({
      items: [product],
      nextOffset: 12,
    });
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [product], nextOffset: 12 });
    expect(listProductsMock).toHaveBeenCalledWith({ limit: 12, offset: 0 });
  });

  it("retorna 200 com array vazio quando não há produtos", async () => {
    listProductsMock.mockResolvedValueOnce({ items: [], nextOffset: null });
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], nextOffset: null });
  });

  it("repassa limit e offset da query string", async () => {
    listProductsMock.mockResolvedValueOnce({ items: [], nextOffset: null });
    await GET(get("?limit=20&offset=40"));
    expect(listProductsMock).toHaveBeenCalledWith({ limit: 20, offset: 40 });
  });

  it.each([
    "?limit=abc",
    "?limit=1000",
    "?offset=-1",
    "?offset=9007199254740991",
    "?limit=1e1",
    "?limit=0x10",
    "?offset=1.0",
    "?offset=",
  ])("retorna 400 para query inválida (%s)", async (query) => {
    const res = await GET(get(query));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Parâmetros inválidos");
    expect(listProductsMock).not.toHaveBeenCalled();
  });

  it("retorna 500 quando o serviço falha", async () => {
    listProductsMock.mockRejectedValueOnce(new Error("boom"));
    const res = await GET(get());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Erro interno" });
  });
});

describe("POST /api/v1/products", () => {
  it("retorna 201 com o id", async () => {
    createProductMock.mockResolvedValueOnce({ id: "abc123" });
    const res = await POST(post(validBody));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "abc123" });
    expect(createProductMock).toHaveBeenCalledWith(validBody);
  });

  it("retorna 400 quando o body não é JSON", async () => {
    const res = await POST(
      new Request(URL_BASE, { method: "POST", body: "{nao-json" }),
    );
    expect(res.status).toBe(400);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o schema rejeita e não chama createProduct", async () => {
    const res = await POST(
      post({ ...validBody, externalLink: "www.loja.com" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Dados inválidos");
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("retorna 413 quando o Content-Length passa do limite, sem ler o corpo", async () => {
    const request = new Request(URL_BASE, {
      method: "POST",
      body: JSON.stringify(validBody),
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_BODY_BYTES + 1),
      },
    });
    const res = await POST(request);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({
      error: "Corpo da requisição grande demais",
    });
    expect(request.bodyUsed).toBe(false);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("retorna 413 quando o corpo real passa do limite, mesmo sem Content-Length", async () => {
    const res = await POST(
      post({ ...validBody, description: "a".repeat(MAX_BODY_BYTES) }),
    );
    expect(res.status).toBe(413);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("conta o limite em bytes, não em caracteres", async () => {
    // Cada "é" ocupa 2 bytes em UTF-8: menos caracteres que o limite, mais bytes.
    const res = await POST(
      post({ ...validBody, description: "é".repeat(MAX_BODY_BYTES / 2) }),
    );
    expect(res.status).toBe(413);
  });

  it("retorna 400 quando o corpo vem vazio", async () => {
    const res = await POST(new Request(URL_BASE, { method: "POST" }));
    expect(res.status).toBe(400);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("retorna 500 para erros inesperados", async () => {
    createProductMock.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(post(validBody));
    expect(res.status).toBe(500);
  });
});
