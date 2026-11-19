// @vitest-environment node
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSummaryModel } from "@/mastra/summary-model";
import { getAiSummary } from "@/server/ai-summary/get-ai-summary";
import { summarizeFeedbacks } from "@/server/ai-summary/summarize-feedbacks";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/mastra/summary-model", () => ({ resolveSummaryModel: vi.fn() }));
vi.mock("@/server/ai-summary/summarize-feedbacks", () => ({
  summarizeFeedbacks: vi.fn(),
}));

type Result = { data?: unknown; count?: number | null; error: unknown };

/** O que cada consulta devolve neste teste. */
let db: {
  count: Result;
  stored: Result;
  recent: Result;
  upsert: Result;
};
const upsertSpy = vi.fn();
const limitSpy = vi.fn();

/**
 * Dublê do cliente do Supabase: cada método devolve o próprio construtor, e
 * aguardar a consulta resolve com o resultado combinado em `db`.
 */
function fakeSupabase() {
  return {
    from(table: string) {
      let result: Result =
        table === "products_ai_summaries" ? db.stored : db.recent;
      const builder = {
        select(_columns: string, options?: { head?: boolean }) {
          if (options?.head) {
            result = db.count;
          }
          return builder;
        },
        eq: () => builder,
        order: () => builder,
        limit(n: number) {
          limitSpy(n);
          return builder;
        },
        maybeSingle: () => builder,
        upsert(row: unknown) {
          upsertSpy(row);
          result = db.upsert;
          return builder;
        },
        // biome-ignore lint/suspicious/noThenProperty: imita o construtor de consultas do Supabase, que é aguardável.
        then(resolve: (value: Result) => unknown) {
          return Promise.resolve(result).then(resolve);
        },
      };
      return builder;
    },
  };
}

const product = { id: "p1", name: "Fone XYZ" };
const storedRow = {
  summary: "Resumo antigo.",
  feedbacks_count: 3,
  generated_at: "2026-11-18T12:00:00.000Z",
};
const feedbackRows = [
  { score: 5, comment: "Ótimo" },
  { score: 4, comment: "Bom" },
  { score: 1, comment: "Quebrou" },
  { score: 3, comment: "Razoável" },
];

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  db = {
    count: { count: 4, error: null },
    stored: { data: null, error: null },
    recent: { data: feedbackRows, error: null },
    upsert: { error: null },
  };
  upsertSpy.mockReset();
  limitSpy.mockReset();
  vi.mocked(createAdminClient).mockReturnValue(fakeSupabase() as never);
  vi.mocked(resolveSummaryModel).mockReset();
  vi.mocked(resolveSummaryModel).mockReturnValue({
    model: "openai/gpt-4o-mini",
    label: "openai/gpt-4o-mini",
  });
  vi.mocked(summarizeFeedbacks).mockReset();
  vi.mocked(summarizeFeedbacks).mockResolvedValue("Resumo novo.");
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("getAiSummary", () => {
  it("abaixo do mínimo de avaliações devolve null sem chamar o modelo", async () => {
    db.count = { count: 2, error: null };
    db.stored = { data: storedRow, error: null };

    expect(await getAiSummary(product)).toBeNull();
    expect(summarizeFeedbacks).not.toHaveBeenCalled();
  });

  it("devolve o resumo guardado quando a contagem não mudou", async () => {
    db.count = { count: 3, error: null };
    db.stored = { data: storedRow, error: null };

    expect(await getAiSummary(product)).toEqual({
      summary: "Resumo antigo.",
      feedbacksCount: 3,
      generatedAt: "2026-11-18T12:00:00.000Z",
    });
    expect(summarizeFeedbacks).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("gera, grava e devolve o resumo quando ainda não existe", async () => {
    const result = await getAiSummary(product);

    expect(summarizeFeedbacks).toHaveBeenCalledWith("Fone XYZ", feedbackRows);
    expect(limitSpy).toHaveBeenCalledWith(200);
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "p1",
        summary: "Resumo novo.",
        feedbacks_count: 4,
        model: "openai/gpt-4o-mini",
      }),
    );
    expect(result).toMatchObject({
      summary: "Resumo novo.",
      feedbacksCount: 4,
    });
  });

  it("refaz o resumo quando chegou avaliação nova", async () => {
    db.stored = { data: storedRow, error: null };

    expect((await getAiSummary(product))?.summary).toBe("Resumo novo.");
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ feedbacks_count: 4 }),
    );
  });

  it("sem IA configurada não chama o modelo e devolve o que houver guardado", async () => {
    vi.mocked(resolveSummaryModel).mockReturnValue(null);

    expect(await getAiSummary(product)).toBeNull();

    db.stored = { data: storedRow, error: null };
    expect((await getAiSummary(product))?.summary).toBe("Resumo antigo.");
    expect(summarizeFeedbacks).not.toHaveBeenCalled();
  });

  it("se o modelo falhar devolve o resumo anterior, ou null se não houver", async () => {
    vi.mocked(summarizeFeedbacks).mockRejectedValue(new Error("timeout"));

    expect(await getAiSummary(product)).toBeNull();

    db.stored = { data: storedRow, error: null };
    expect((await getAiSummary(product))?.summary).toBe("Resumo antigo.");
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("erro do banco na leitura não derruba a página", async () => {
    db.count = { count: null, error: { message: "boom" } };
    expect(await getAiSummary(product)).toBeNull();
    expect(summarizeFeedbacks).not.toHaveBeenCalled();
  });

  it("falha ao gravar não impede devolver o resumo gerado", async () => {
    db.upsert = { error: { message: "sem permissão" } };

    expect((await getAiSummary(product))?.summary).toBe("Resumo novo.");
    expect(errorSpy).toHaveBeenCalled();
  });
});
