import { POST } from "@/app/api/v1/products/[id]/feedbacks/route";
import { getSession } from "@/lib/session";
import {
  AccountNotFoundError,
  createFeedback,
  DuplicateFeedbackError,
  ProductNotFoundError,
} from "@/server/feedbacks/create-feedback";

vi.mock("@/lib/session", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/session")>();
  return {
    serializeClearedSessionCookie: original.serializeClearedSessionCookie,
    getSession: vi.fn(),
  };
});

vi.mock("@/server/feedbacks/create-feedback", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/server/feedbacks/create-feedback")>();
  return {
    AccountNotFoundError: original.AccountNotFoundError,
    DuplicateFeedbackError: original.DuplicateFeedbackError,
    ProductNotFoundError: original.ProductNotFoundError,
    createFeedback: vi.fn(),
  };
});

const getSessionMock = vi.mocked(getSession);
const createFeedbackMock = vi.mocked(createFeedback);

const session = {
  accountId: "acc_1",
  firstName: "Ana",
  lastName: "Silva",
  email: "ana@exemplo.com",
};

const validBody = { score: 5, comment: "Top" };

function post(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/v1/products/${id}/feedbacks`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  getSessionMock.mockReset();
  createFeedbackMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/v1/products/[id]/feedbacks", () => {
  it("retorna 401 sem sessão e não chama createFeedback", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const res = await POST(post("p1", validBody), ctx("p1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Faça login para avaliar" });
    expect(createFeedbackMock).not.toHaveBeenCalled();
  });

  it("retorna 201 com o id e usa accountId da sessão e productId da URL, ignorando created_by do body", async () => {
    getSessionMock.mockResolvedValueOnce(session);
    createFeedbackMock.mockResolvedValueOnce({ id: "f1" });

    const res = await POST(
      post("p1", { ...validBody, created_by: "hacker", productId: "p9" }),
      ctx("p1"),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "f1" });
    expect(createFeedbackMock).toHaveBeenCalledWith({
      productId: "p1",
      accountId: "acc_1",
      score: 5,
      comment: "Top",
    });
  });

  it("retorna 400 quando o body não é JSON", async () => {
    getSessionMock.mockResolvedValueOnce(session);

    const res = await POST(post("p1", "{nao-json"), ctx("p1"));

    expect(res.status).toBe(400);
    expect(createFeedbackMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o schema rejeita (nota 6)", async () => {
    getSessionMock.mockResolvedValueOnce(session);

    const res = await POST(post("p1", { ...validBody, score: 6 }), ctx("p1"));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Dados inválidos");
    expect(data.issues).toHaveLength(1);
    expect(createFeedbackMock).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o produto não existe", async () => {
    getSessionMock.mockResolvedValueOnce(session);
    createFeedbackMock.mockRejectedValueOnce(new ProductNotFoundError());

    const res = await POST(post("nao-existe", validBody), ctx("nao-existe"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Produto não encontrado" });
  });

  it("retorna 400 quando o comentário tem o caractere NUL", async () => {
    getSessionMock.mockResolvedValueOnce(session);

    const res = await POST(
      post("p1", { score: 5, comment: `Bom${String.fromCharCode(0)}` }),
      ctx("p1"),
    );

    expect(res.status).toBe(400);
    expect(createFeedbackMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o comentário só tem caracteres de largura zero", async () => {
    getSessionMock.mockResolvedValueOnce(session);

    const res = await POST(
      post("p1", { score: 5, comment: String.fromCharCode(0x200b) }),
      ctx("p1"),
    );

    expect(res.status).toBe(400);
    expect(createFeedbackMock).not.toHaveBeenCalled();
  });

  it("retorna 409 quando a conta já avaliou o produto", async () => {
    getSessionMock.mockResolvedValueOnce(session);
    createFeedbackMock.mockRejectedValueOnce(new DuplicateFeedbackError());

    const res = await POST(post("p1", validBody), ctx("p1"));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Você já avaliou este produto" });
  });

  it("retorna 401 e apaga o cookie quando a conta da sessão não existe mais", async () => {
    getSessionMock.mockResolvedValueOnce(session);
    createFeedbackMock.mockRejectedValueOnce(new AccountNotFoundError());

    const res = await POST(post("p1", validBody), ctx("p1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Sua sessão expirou. Entre novamente para avaliar.",
    });
    expect(res.headers.get("set-cookie")).toContain("session=;");
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("retorna 500 para erros inesperados", async () => {
    getSessionMock.mockResolvedValueOnce(session);
    createFeedbackMock.mockRejectedValueOnce(new Error("boom"));

    const res = await POST(post("p1", validBody), ctx("p1"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Erro interno" });
  });
});
