import { POST } from "@/app/api/v1/sign-in/route";
import { createSessionToken } from "@/lib/session";
import {
  authenticate,
  InvalidCredentialsError,
} from "@/server/accounts/authenticate";
import {
  clearFailedSignIns,
  getSignInBlock,
  recordFailedSignIn,
} from "@/server/accounts/sign-in-attempts";

vi.mock("@/server/accounts/sign-in-attempts", () => ({
  getSignInBlock: vi.fn(),
  recordFailedSignIn: vi.fn(),
  clearFailedSignIns: vi.fn(),
}));

vi.mock("@/server/accounts/authenticate", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/server/accounts/authenticate")>();
  return {
    InvalidCredentialsError: original.InvalidCredentialsError,
    authenticate: vi.fn(),
  };
});

vi.mock("@/lib/session", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/session")>();
  return { ...original, createSessionToken: vi.fn() };
});

const authenticateMock = vi.mocked(authenticate);
const createSessionTokenMock = vi.mocked(createSessionToken);
const getSignInBlockMock = vi.mocked(getSignInBlock);
const recordFailedSignInMock = vi.mocked(recordFailedSignIn);
const clearFailedSignInsMock = vi.mocked(clearFailedSignIns);

const session = {
  accountId: "acc_1",
  firstName: "Ana",
  lastName: "Silva",
  email: "ana@exemplo.com",
};

const validBody = { email: "ana@exemplo.com", password: "senha-forte-123" };

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/v1/sign-in", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

beforeEach(() => {
  authenticateMock.mockReset();
  createSessionTokenMock.mockReset();
  createSessionTokenMock.mockResolvedValue("tok");
  getSignInBlockMock.mockReset();
  getSignInBlockMock.mockResolvedValue(null);
  recordFailedSignInMock.mockReset();
  clearFailedSignInsMock.mockReset();
});

describe("POST /api/v1/sign-in", () => {
  it("retorna 200, o id e o cookie de sessão HttpOnly quando as credenciais conferem", async () => {
    authenticateMock.mockResolvedValueOnce(session);
    const res = await POST(post(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "acc_1" });
    expect(createSessionTokenMock).toHaveBeenCalledWith(session);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("session=tok");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("entrega ao serviço o e-mail normalizado pelo schema", async () => {
    authenticateMock.mockResolvedValueOnce(session);
    await POST(post({ ...validBody, email: " Ana@Exemplo.COM " }));
    expect(authenticateMock).toHaveBeenCalledWith(validBody);
  });

  it("retorna 400 quando o body não é JSON válido", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/sign-in", {
        method: "POST",
        body: "{nao-json",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o schema rejeita e não chama authenticate", async () => {
    const res = await POST(post({ email: "nao-e-email", password: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Dados inválidos");
    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it("retorna 401 com mensagem genérica em InvalidCredentialsError", async () => {
    authenticateMock.mockRejectedValueOnce(new InvalidCredentialsError());
    const res = await POST(post(validBody));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "E-mail ou senha inválidos" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("retorna 500 para erros inesperados, sem vazar o detalhe", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    authenticateMock.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(post(validBody));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Erro interno" });
    expect(res.headers.get("set-cookie")).toBeNull();
    consoleError.mockRestore();
  });

  it("retorna 403 quando o Origin é de outro site, sem autenticar", async () => {
    const res = await POST(
      post(validBody, { origin: "https://malicioso.example" }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Origem não permitida" });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it("aceita quando o Origin corresponde ao host da requisição", async () => {
    authenticateMock.mockResolvedValueOnce(session);
    const res = await POST(
      post(validBody, {
        origin: "https://app.exemplo.com",
        "x-forwarded-host": "app.exemplo.com",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("retorna 415 quando o Content-Type não é application/json", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/sign-in", {
        method: "POST",
        body: JSON.stringify(validBody),
        headers: { "content-type": "text/plain" },
      }),
    );
    expect(res.status).toBe(415);
    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it("retorna 415 quando o formulário é enviado sem JavaScript (urlencoded)", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/sign-in", {
        method: "POST",
        body: new URLSearchParams(validBody),
      }),
    );
    expect(res.status).toBe(415);
    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it("aceita application/json com parâmetro de charset", async () => {
    authenticateMock.mockResolvedValueOnce(session);
    const res = await POST(
      post(validBody, { "content-type": "application/json; charset=utf-8" }),
    );
    expect(res.status).toBe(200);
  });

  describe("limite de tentativas", () => {
    it("retorna 429 com Retry-After e mensagem em português, sem verificar a senha", async () => {
      getSignInBlockMock.mockResolvedValueOnce({ retryAfterSeconds: 300 });
      const res = await POST(
        post({ ...validBody, email: " Ana@Exemplo.COM " }),
      );
      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("300");
      expect(await res.json()).toEqual({
        error: "Muitas tentativas de login. Tente de novo em 5 minutos.",
      });
      expect(res.headers.get("set-cookie")).toBeNull();
      expect(getSignInBlockMock).toHaveBeenCalledWith("ana@exemplo.com");
      expect(authenticateMock).not.toHaveBeenCalled();
      expect(recordFailedSignInMock).not.toHaveBeenCalled();
    });

    it("usa o singular e arredonda para cima os minutos da mensagem", async () => {
      getSignInBlockMock.mockResolvedValueOnce({ retryAfterSeconds: 42 });
      const res = await POST(post(validBody));
      expect(res.headers.get("retry-after")).toBe("42");
      expect((await res.json()).error).toBe(
        "Muitas tentativas de login. Tente de novo em 1 minuto.",
      );
    });

    it("registra a falha com o e-mail normalizado no 401", async () => {
      authenticateMock.mockRejectedValueOnce(new InvalidCredentialsError());
      const res = await POST(
        post({ ...validBody, email: " Ana@Exemplo.COM " }),
      );
      expect(res.status).toBe(401);
      expect(recordFailedSignInMock).toHaveBeenCalledTimes(1);
      expect(recordFailedSignInMock).toHaveBeenCalledWith("ana@exemplo.com");
      expect(clearFailedSignInsMock).not.toHaveBeenCalled();
    });

    it("apaga as falhas do e-mail quando o login dá certo", async () => {
      authenticateMock.mockResolvedValueOnce(session);
      const res = await POST(post(validBody));
      expect(res.status).toBe(200);
      expect(clearFailedSignInsMock).toHaveBeenCalledWith("ana@exemplo.com");
      expect(recordFailedSignInMock).not.toHaveBeenCalled();
    });

    it("não conta como tentativa de senha um erro inesperado (500) nem dados inválidos (400)", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      authenticateMock.mockRejectedValueOnce(new Error("boom"));
      await POST(post(validBody));
      await POST(post({ email: "nao-e-email", password: "" }));
      expect(recordFailedSignInMock).not.toHaveBeenCalled();
      expect(clearFailedSignInsMock).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
