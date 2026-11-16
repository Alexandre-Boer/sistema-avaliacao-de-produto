import { createAdminClient } from "@/lib/supabase/admin";
import { hasFeedback } from "@/server/feedbacks/has-feedback";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const limitSpy = vi.fn();
const eqSpy = vi.fn();
const selectSpy = vi.fn();
const fromSpy = vi.fn();

beforeEach(() => {
  limitSpy.mockReset();
  eqSpy.mockReset();
  // `eq` é chamado duas vezes em cadeia (produto e autor) antes do `limit`.
  eqSpy.mockReturnValue({ eq: eqSpy, limit: limitSpy });
  selectSpy.mockReset();
  selectSpy.mockReturnValue({ eq: eqSpy });
  fromSpy.mockReset();
  fromSpy.mockReturnValue({ select: selectSpy });
  vi.mocked(createAdminClient).mockReturnValue({ from: fromSpy } as never);
});

describe("hasFeedback", () => {
  it("devolve true quando a conta já avaliou o produto", async () => {
    limitSpy.mockResolvedValueOnce({ data: [{ id: "f1" }], error: null });

    expect(await hasFeedback("p1", "acc_1")).toBe(true);
    expect(fromSpy).toHaveBeenCalledWith("products_feedbacks");
    expect(eqSpy).toHaveBeenCalledWith("product_id", "p1");
    expect(eqSpy).toHaveBeenCalledWith("created_by", "acc_1");
    expect(limitSpy).toHaveBeenCalledWith(1);
  });

  it("devolve false quando a conta ainda não avaliou", async () => {
    limitSpy.mockResolvedValueOnce({ data: [], error: null });
    expect(await hasFeedback("p1", "acc_1")).toBe(false);
  });

  it("relança erros do banco", async () => {
    limitSpy.mockResolvedValueOnce({
      data: null,
      error: { code: "XX000", message: "boom" },
    });
    await expect(hasFeedback("p1", "acc_1")).rejects.toThrow("boom");
  });
});
