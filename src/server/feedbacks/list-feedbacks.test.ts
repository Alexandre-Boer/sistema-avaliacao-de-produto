import { createAdminClient } from "@/lib/supabase/admin";
import { listFeedbacks } from "@/server/feedbacks/list-feedbacks";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const orderSpy = vi.fn();
const eqSpy = vi.fn(() => ({ order: orderSpy }));
const selectSpy = vi.fn(() => ({ eq: eqSpy }));
const fromSpy = vi.fn(() => ({ select: selectSpy }));

beforeEach(() => {
  orderSpy.mockReset();
  eqSpy.mockClear();
  fromSpy.mockClear();
  vi.mocked(createAdminClient).mockReturnValue({ from: fromSpy } as never);
});

describe("listFeedbacks", () => {
  it("devolve as avaliações com autor mapeado, mais recentes primeiro", async () => {
    orderSpy.mockResolvedValueOnce({
      data: [
        {
          id: "f1",
          score: 5,
          comment: "Top",
          created_at: "2026-11-13T00:00:00Z",
          accounts: { first_name: "Ana", last_name: "Silva" },
        },
      ],
      error: null,
    });

    expect(await listFeedbacks("p1")).toEqual([
      {
        id: "f1",
        score: 5,
        comment: "Top",
        createdAt: "2026-11-13T00:00:00Z",
        author: { firstName: "Ana", lastName: "Silva" },
      },
    ]);
    expect(fromSpy).toHaveBeenCalledWith("products_feedbacks");
    expect(eqSpy).toHaveBeenCalledWith("product_id", "p1");
    expect(orderSpy).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("devolve lista vazia quando não há avaliações", async () => {
    orderSpy.mockResolvedValueOnce({ data: [], error: null });
    expect(await listFeedbacks("p1")).toEqual([]);
  });

  it("relança erros do banco", async () => {
    orderSpy.mockResolvedValueOnce({
      data: null,
      error: { code: "XX000", message: "boom" },
    });
    await expect(listFeedbacks("p1")).rejects.toThrow("boom");
  });
});
