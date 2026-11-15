import { createAdminClient } from "@/lib/supabase/admin";
import { createProduct } from "@/server/products/create-product";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const valid = {
  name: "Fone X",
  description: "Sem fio",
  externalLink: "https://loja.com/fone",
  imageUrl: "https://img.com/fone.jpg",
};

const insertSpy = vi.fn();
const fromSpy = vi.fn();

beforeEach(() => {
  insertSpy.mockReset();
  insertSpy.mockResolvedValue({ error: null });
  fromSpy.mockReset();
  fromSpy.mockReturnValue({ insert: insertSpy });
  vi.mocked(createAdminClient).mockReturnValue({ from: fromSpy } as never);
});

describe("createProduct", () => {
  it("insere com id nanoid e colunas snake_case", async () => {
    const { id } = await createProduct(valid);
    expect(id).toHaveLength(21); // nanoid padrão
    expect(fromSpy).toHaveBeenCalledWith("products");
    expect(insertSpy.mock.calls[0][0]).toMatchObject({
      id,
      name: "Fone X",
      external_link: valid.externalLink,
      image_url: valid.imageUrl,
      description: "Sem fio",
    });
  });

  it("grava description null quando ausente", async () => {
    await createProduct({ ...valid, description: undefined });
    expect(insertSpy.mock.calls[0][0].description).toBeNull();
  });

  it("relança erros do banco", async () => {
    insertSpy.mockResolvedValueOnce({
      error: { code: "XX000", message: "boom" },
    });
    await expect(createProduct(valid)).rejects.toThrow("boom");
  });
});
