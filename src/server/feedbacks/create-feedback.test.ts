import { createAdminClient } from "@/lib/supabase/admin";
import {
  AccountNotFoundError,
  createFeedback,
  DuplicateFeedbackError,
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

  it("lança ProductNotFoundError sem consultar o banco quando o id do produto tem NUL", async () => {
    await expect(
      createFeedback({ ...input, productId: String.fromCharCode(0) }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("lança DuplicateFeedbackError quando a conta já avaliou o produto (23505 no índice único)", async () => {
    insertSpy.mockResolvedValueOnce({
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "products_feedbacks_product_id_created_by_key"',
      },
    });
    await expect(createFeedback(input)).rejects.toBeInstanceOf(
      DuplicateFeedbackError,
    );
  });

  it("não trata outra violação de unicidade (23505) como avaliação repetida", async () => {
    insertSpy.mockResolvedValueOnce({
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "products_feedbacks_pkey"',
      },
    });
    const promise = createFeedback(input);
    await expect(promise).rejects.not.toBeInstanceOf(DuplicateFeedbackError);
    await expect(promise).rejects.toThrow("products_feedbacks_pkey");
  });

  it("lança AccountNotFoundError na violação da FK do autor (conta removida), sem confundir com produto inexistente", async () => {
    insertSpy.mockResolvedValueOnce({
      error: {
        code: "23503",
        message:
          'insert or update on table "products_feedbacks" violates foreign key constraint "products_feedbacks_created_by_fkey"',
      },
    });
    const promise = createFeedback(input);
    await expect(promise).rejects.not.toBeInstanceOf(ProductNotFoundError);
    await expect(promise).rejects.toBeInstanceOf(AccountNotFoundError);
  });

  it("relança erros inesperados", async () => {
    insertSpy.mockResolvedValueOnce({
      error: { code: "XX000", message: "boom" },
    });
    await expect(createFeedback(input)).rejects.toThrow("boom");
  });
});
