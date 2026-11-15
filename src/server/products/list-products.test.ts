import { createAdminClient } from "@/lib/supabase/admin";
import { listProducts } from "@/server/products/list-products";
import type { ProductRow } from "@/server/products/product";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const rangeSpy = vi.fn();
const orderSpy = vi.fn();
const fromSpy = vi.fn();

function makeRows(count: number): ProductRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Produto ${index + 1}`,
    description: null,
    image_url: `https://img.com/${index + 1}.jpg`,
    external_link: `https://loja.com/${index + 1}`,
    score: false,
    created_at: "2026-11-13T12:00:00+00:00",
    updated_at: "2026-11-13T12:00:00+00:00",
  }));
}

beforeEach(() => {
  rangeSpy.mockReset();
  rangeSpy.mockResolvedValue({ data: [], error: null });
  orderSpy.mockReset();
  const chain = { order: orderSpy, range: rangeSpy };
  orderSpy.mockReturnValue(chain);
  fromSpy.mockReset();
  fromSpy.mockReturnValue({ select: vi.fn(() => chain) });
  vi.mocked(createAdminClient).mockReturnValue({ from: fromSpy } as never);
});

describe("listProducts", () => {
  it("devolve os itens mapeados e nextOffset quando há mais páginas", async () => {
    rangeSpy.mockResolvedValueOnce({ data: makeRows(13), error: null });
    const result = await listProducts({ limit: 12, offset: 0 });
    expect(result.items).toHaveLength(12);
    expect(result.items[0]).toMatchObject({
      id: "p1",
      imageUrl: expect.any(String),
    });
    expect(result.nextOffset).toBe(12);
  });

  it("devolve nextOffset null na última página", async () => {
    rangeSpy.mockResolvedValueOnce({ data: makeRows(5), error: null });
    const result = await listProducts({ limit: 12, offset: 24 });
    expect(result.items).toHaveLength(5);
    expect(result.nextOffset).toBeNull();
  });

  it("pede range(offset, offset + limit) ordenado por created_at desc", async () => {
    await listProducts({ limit: 12, offset: 24 });
    expect(fromSpy).toHaveBeenCalledWith("products");
    expect(orderSpy).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(orderSpy).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(rangeSpy).toHaveBeenCalledWith(24, 36);
  });

  it("relança erros do banco", async () => {
    rangeSpy.mockResolvedValueOnce({
      data: null,
      error: { code: "XX000", message: "boom" },
    });
    await expect(listProducts({ limit: 12, offset: 0 })).rejects.toThrow(
      "boom",
    );
  });
});
