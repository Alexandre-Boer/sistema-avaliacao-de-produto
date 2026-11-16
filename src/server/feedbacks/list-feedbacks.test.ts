import { createAdminClient } from "@/lib/supabase/admin";
import {
  FEEDBACK_LIST_LIMIT,
  listFeedbacks,
} from "@/server/feedbacks/list-feedbacks";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

type Call = { method: string; args: unknown[] };
type Result = { data?: unknown; count?: number | null; error: unknown };

/** Consultas feitas no teste: cada uma é a lista de chamadas encadeadas. */
let queries: Call[][] = [];
let respond: (calls: Call[]) => Result;

/** Imita o query builder do supabase-js: encadeável e "aguardável". */
function fakeQuery(table: string) {
  const calls: Call[] = [{ method: "from", args: [table] }];
  queries.push(calls);
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  // biome-ignore lint/suspicious/noThenProperty: o builder do supabase-js também é um thenable.
  builder.then = (
    resolve: (value: Result) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(respond(calls)).then(resolve, reject);
  return builder;
}

function find(calls: Call[], method: string, firstArg?: unknown) {
  return calls.find(
    (call) =>
      call.method === method &&
      (firstArg === undefined || call.args[0] === firstArg),
  );
}

function isCount(calls: Call[]): boolean {
  const options = find(calls, "select")?.args[1] as
    | { count?: string; head?: boolean }
    | undefined;
  return options?.count === "exact" && options.head === true;
}

/** Responde às contagens por nota com `counts` e à lista com `rows`. */
function respondWith(counts: Record<number, number>, rows: unknown[]) {
  respond = (calls) =>
    isCount(calls)
      ? {
          count: counts[find(calls, "eq", "score")?.args[1] as number] ?? 0,
          error: null,
        }
      : { data: rows, error: null };
}

const row = {
  id: "f1",
  score: 5,
  comment: "Top",
  created_at: "2026-11-13T00:00:00Z",
  accounts: { first_name: "Ana", last_name: "Silva" },
};

beforeEach(() => {
  queries = [];
  vi.mocked(createAdminClient).mockReturnValue({ from: fakeQuery } as never);
});

describe("listFeedbacks", () => {
  it("devolve as avaliações com autor mapeado, mais recentes primeiro e com limite", async () => {
    respondWith({ 5: 1 }, [row]);

    const listing = await listFeedbacks("p1");

    expect(listing.feedbacks).toEqual([
      {
        id: "f1",
        score: 5,
        comment: "Top",
        createdAt: "2026-11-13T00:00:00Z",
        author: { firstName: "Ana", lastName: "Silva" },
      },
    ]);

    const list = queries.find((calls) => !isCount(calls)) as Call[];
    expect(find(list, "from")?.args).toEqual(["products_feedbacks"]);
    expect(find(list, "eq")?.args).toEqual(["product_id", "p1"]);
    expect(find(list, "order")?.args).toEqual([
      "created_at",
      { ascending: false },
    ]);
    expect(find(list, "limit")?.args).toEqual([FEEDBACK_LIST_LIMIT]);
    expect(FEEDBACK_LIST_LIMIT).toBe(50);
  });

  it("conta no banco, por nota, e calcula total, média e distribuição sem depender das linhas devolvidas", async () => {
    // 3000 avaliações no banco; a consulta da lista só devolve uma linha.
    respondWith({ 5: 1500, 4: 900, 3: 300, 2: 200, 1: 100 }, [row]);

    const listing = await listFeedbacks("p1");

    expect(listing.total).toBe(3000);
    expect(listing.distribution).toEqual({
      5: 1500,
      4: 900,
      3: 300,
      2: 200,
      1: 100,
    });
    // (5*1500 + 4*900 + 3*300 + 2*200 + 1*100) / 3000
    expect(listing.average).toBeCloseTo(12500 / 3000, 10);
    expect(listing.feedbacks).toHaveLength(1);

    const counts = queries.filter(isCount);
    expect(counts).toHaveLength(5);
    for (const calls of counts) {
      expect(find(calls, "from")?.args).toEqual(["products_feedbacks"]);
      expect(find(calls, "eq", "product_id")?.args).toEqual([
        "product_id",
        "p1",
      ]);
    }
    expect(
      counts.map((calls) => find(calls, "eq", "score")?.args[1]).sort(),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it("devolve lista vazia, total zero e média nula quando não há avaliações", async () => {
    respondWith({}, []);

    expect(await listFeedbacks("p1")).toEqual({
      feedbacks: [],
      total: 0,
      average: null,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });

  it("relança erros do banco na consulta da lista", async () => {
    respond = (calls) =>
      isCount(calls)
        ? { count: 0, error: null }
        : { data: null, error: { code: "XX000", message: "boom" } };
    await expect(listFeedbacks("p1")).rejects.toThrow("boom");
  });

  it("relança erros do banco nas contagens", async () => {
    respond = (calls) =>
      isCount(calls)
        ? { count: null, error: { code: "XX000", message: "contagem falhou" } }
        : { data: [], error: null };
    await expect(listFeedbacks("p1")).rejects.toThrow("contagem falhou");
  });
});
