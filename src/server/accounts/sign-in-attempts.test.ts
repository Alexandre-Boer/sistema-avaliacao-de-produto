import { createAdminClient } from "@/lib/supabase/admin";
import {
  clearFailedSignIns,
  getSignInBlock,
  MAX_FAILED_SIGN_INS,
  recordFailedSignIn,
  SIGN_IN_WINDOW_MS,
} from "@/server/accounts/sign-in-attempts";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

const NOW = new Date("2026-11-15T12:00:00.000Z");
const email = "ana@exemplo.com";

// Consulta: from().select().eq().gte().order().limit()
const limitSpy = vi.fn();
const orderSpy = vi.fn(() => ({ limit: limitSpy }));
const gteSpy = vi.fn(() => ({ order: orderSpy }));
const selectEqSpy = vi.fn(() => ({ gte: gteSpy }));
const selectSpy = vi.fn(() => ({ eq: selectEqSpy }));
// Registro: from().insert()
const insertSpy = vi.fn();
// Limpeza: from().delete().eq()
const deleteEqSpy = vi.fn();
const deleteSpy = vi.fn(() => ({ eq: deleteEqSpy }));
const fromSpy = vi.fn(() => ({
  select: selectSpy,
  insert: insertSpy,
  delete: deleteSpy,
}));

/** Falhas ocorridas há `minutesAgo` minutos, da mais recente para a mais antiga. */
function failures(...minutesAgo: number[]) {
  return minutesAgo.map((minutes) => ({
    created_at: new Date(NOW.getTime() - minutes * 60_000).toISOString(),
  }));
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  limitSpy.mockResolvedValue({ data: [], error: null });
  insertSpy.mockResolvedValue({ error: null });
  deleteEqSpy.mockResolvedValue({ error: null });
  vi.mocked(createAdminClient).mockReturnValue({ from: fromSpy } as never);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  consoleError.mockRestore();
});

describe("getSignInBlock", () => {
  it("consulta as falhas do e-mail dentro da janela de 15 minutos", async () => {
    await getSignInBlock(email);

    expect(SIGN_IN_WINDOW_MS).toBe(15 * 60_000);
    expect(MAX_FAILED_SIGN_INS).toBe(5);
    expect(fromSpy).toHaveBeenCalledWith("sign_in_attempts");
    expect(selectSpy).toHaveBeenCalledWith("created_at");
    expect(selectEqSpy).toHaveBeenCalledWith("email", email);
    expect(gteSpy).toHaveBeenCalledWith(
      "created_at",
      "2026-11-15T11:45:00.000Z",
    );
    expect(orderSpy).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limitSpy).toHaveBeenCalledWith(5);
  });

  it("não bloqueia com menos de 5 falhas na janela", async () => {
    limitSpy.mockResolvedValueOnce({
      data: failures(1, 2, 3, 4),
      error: null,
    });
    await expect(getSignInBlock(email)).resolves.toBeNull();
  });

  it("bloqueia com 5 falhas e informa em quantos segundos a mais antiga delas sai da janela", async () => {
    limitSpy.mockResolvedValueOnce({
      data: failures(1, 2, 3, 4, 10),
      error: null,
    });
    // A mais antiga das cinco foi há 10 min: faltam 5 min para ela expirar.
    await expect(getSignInBlock(email)).resolves.toEqual({
      retryAfterSeconds: 300,
    });
  });

  it("arredonda o Retry-After para cima e nunca devolve menos de 1 segundo", async () => {
    limitSpy.mockResolvedValueOnce({
      data: [
        ...failures(1, 2, 3, 4),
        { created_at: new Date(NOW.getTime() - 899_500).toISOString() },
      ],
      error: null,
    });
    await expect(getSignInBlock(email)).resolves.toEqual({
      retryAfterSeconds: 1,
    });
  });

  it("não bloqueia (e loga) quando a consulta devolve erro", async () => {
    limitSpy.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(getSignInBlock(email)).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalled();
  });

  it("não bloqueia (e loga) quando o client lança", async () => {
    limitSpy.mockRejectedValueOnce(new Error("rede"));
    await expect(getSignInBlock(email)).resolves.toBeNull();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("recordFailedSignIn", () => {
  it("insere uma linha com o e-mail", async () => {
    await recordFailedSignIn(email);
    expect(fromSpy).toHaveBeenCalledWith("sign_in_attempts");
    expect(insertSpy).toHaveBeenCalledWith({ email });
  });

  it("não lança (e loga) quando o insert devolve erro ou o client lança", async () => {
    insertSpy.mockResolvedValueOnce({ error: { message: "boom" } });
    await expect(recordFailedSignIn(email)).resolves.toBeUndefined();
    insertSpy.mockRejectedValueOnce(new Error("rede"));
    await expect(recordFailedSignIn(email)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledTimes(2);
  });
});

describe("clearFailedSignIns", () => {
  it("apaga só as linhas daquele e-mail", async () => {
    await clearFailedSignIns(email);
    expect(fromSpy).toHaveBeenCalledWith("sign_in_attempts");
    expect(deleteSpy).toHaveBeenCalled();
    expect(deleteEqSpy).toHaveBeenCalledWith("email", email);
  });

  it("não lança (e loga) quando o delete devolve erro ou o client lança", async () => {
    deleteEqSpy.mockResolvedValueOnce({ error: { message: "boom" } });
    await expect(clearFailedSignIns(email)).resolves.toBeUndefined();
    deleteEqSpy.mockRejectedValueOnce(new Error("rede"));
    await expect(clearFailedSignIns(email)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledTimes(2);
  });
});
