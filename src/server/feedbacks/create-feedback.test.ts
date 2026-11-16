import { createAdminClient } from "@/lib/supabase/admin";
import {
  createFeedback,
  ProductNotFoundError,
} from "@/server/feedbacks/create-feedback";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const input = { productId: "p1", accountId: "acc_1", score: 4, comment: "Bom" };

const insertSpy = vi.fn();
const fromSpy = vi.fn(() => ({ insert: insertSpy }));

beforeEach(() => {
  insertSpy.mockReset();
  insertSpy.mockResolvedValue({ error: null });
  fromSpy.mockClear();
  vi.mocked(createAdminClient).mockReturnValue({ from: fromSpy } as never);
});

describe("createFeedback", () => {
  it("insere com id nanoid, product_id e created_by da entrada", async () => {
    const { id } = await createFeedback(input);

    expect(id).toHaveLength(21); // nanoid padrão
    expect(fromSpy).toHaveBeenCalledWith("products_feedbacks");
    expect(insertSpy.mock.calls[0][0]).toEqual({
      id,
      product_id: "p1",
      created_by: "acc_1",
      score: 4,
      comment: "Bom",
    });
  });

  it("lança ProductNotFoundError na violação da FK do produto (23503)", async () => {
    insertSpy.mockResolvedValueOnce({
      error: {
        code: "23503",
        message:
          'insert or update on table "products_feedbacks" violates foreign key constraint "products_feedbacks_product_id_fkey"',
      },
    });
    await expect(createFeedback(input)).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it("não confunde a FK do autor (conta removida) com produto inexistente", async () => {
    insertSpy.mockResolvedValueOnce({
      error: {
        code: "23503",
        message:
          'insert or update on table "products_feedbacks" violates foreign key constraint "products_feedbacks_created_by_fkey"',
      },
    });
    const promise = createFeedback(input);
    await expect(promise).rejects.not.toBeInstanceOf(ProductNotFoundError);
    await expect(promise).rejects.toThrow("created_by");
  });

  it("relança erros inesperados", async () => {
    insertSpy.mockResolvedValueOnce({
      error: { code: "XX000", message: "boom" },
    });
    await expect(createFeedback(input)).rejects.toThrow("boom");
  });
});
