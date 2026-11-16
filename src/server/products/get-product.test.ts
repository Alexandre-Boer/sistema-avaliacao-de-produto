import { createAdminClient } from "@/lib/supabase/admin";
import { getProductById } from "@/server/products/get-product";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const row = {
  id: "p1",
  name: "Fone sem fio",
  description: "Cancelamento de ruído",
  image_url: "https://exemplo.com/fone.png",
  external_link: "https://loja.exemplo.com/fone",
  score: false,
  created_at: "2026-11-13T00:00:00Z",
  updated_at: "2026-11-13T00:00:00Z",
};

const maybeSingleSpy = vi.fn();
const eqSpy = vi.fn(() => ({ maybeSingle: maybeSingleSpy }));
const selectSpy = vi.fn(() => ({ eq: eqSpy }));
const fromSpy = vi.fn(() => ({ select: selectSpy }));

beforeEach(() => {
  maybeSingleSpy.mockReset();
  eqSpy.mockClear();
  fromSpy.mockClear();
  vi.mocked(createAdminClient).mockReturnValue({ from: fromSpy } as never);
});

describe("getProductById", () => {
  it("devolve o produto mapeado quando existe", async () => {
    maybeSingleSpy.mockResolvedValueOnce({ data: row, error: null });

    const product = await getProductById("p1");

    expect(fromSpy).toHaveBeenCalledWith("products");
    expect(eqSpy).toHaveBeenCalledWith("id", "p1");
    expect(product).toMatchObject({
      id: "p1",
      name: "Fone sem fio",
      imageUrl: "https://exemplo.com/fone.png",
      externalLink: "https://loja.exemplo.com/fone",
    });
  });

  it("devolve null quando não existe", async () => {
    maybeSingleSpy.mockResolvedValueOnce({ data: null, error: null });
    expect(await getProductById("nao-existe")).toBeNull();
  });

  it("devolve null sem consultar o banco quando o id tem o caractere NUL", async () => {
    expect(await getProductById(String.fromCharCode(0))).toBeNull();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("relança erros do banco", async () => {
    maybeSingleSpy.mockResolvedValueOnce({
      data: null,
      error: { code: "XX000", message: "boom" },
    });
    await expect(getProductById("p1")).rejects.toThrow("boom");
  });
});
