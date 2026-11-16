import { POST } from "@/app/api/v1/sign-up/route";
import {
  createAccount,
  DuplicateEmailError,
} from "@/server/accounts/create-account";

vi.mock("@/server/accounts/create-account", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/server/accounts/create-account")>();
  return {
    DuplicateEmailError: original.DuplicateEmailError,
    createAccount: vi.fn(),
  };
});

const createAccountMock = vi.mocked(createAccount);

const validBody = {
  firstName: "Ana",
  lastName: "Silva",
  email: "ana@exemplo.com",
  password: "senha-forte-123",
  passwordConfirmation: "senha-forte-123",
};

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/v1/sign-up", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

beforeEach(() => {
  createAccountMock.mockReset();
});

describe("POST /api/v1/sign-up", () => {
  it("retorna 403 quando o Origin é de outro site, sem criar a conta", async () => {
    const res = await POST(
      post(validBody, { origin: "https://malicioso.example" }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Origem não permitida" });
    expect(createAccountMock).not.toHaveBeenCalled();
  });

  it("aceita Origin do próprio site", async () => {
    createAccountMock.mockResolvedValueOnce({ id: "abc123" });
    const res = await POST(post(validBody, { origin: "http://localhost" }));
    expect(res.status).toBe(201);
  });

  it("retorna 201 com o id quando os dados são válidos", async () => {
    createAccountMock.mockResolvedValueOnce({ id: "abc123" });
    const res = await POST(post(validBody));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "abc123" });
  });

  it("retorna 400 quando o body não é JSON válido", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/sign-up", {
        method: "POST",
        body: "{nao-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando o schema rejeita (ex.: confirmação divergente)", async () => {
    const res = await POST(
      post({ ...validBody, passwordConfirmation: "diferente-123" }),
    );
    expect(res.status).toBe(400);
    expect(createAccountMock).not.toHaveBeenCalled();
  });

  it("retorna 409 quando o e-mail já existe", async () => {
    createAccountMock.mockRejectedValueOnce(new DuplicateEmailError());
    const res = await POST(post(validBody));
    expect(res.status).toBe(409);
  });

  it("retorna 500 para erros inesperados", async () => {
    createAccountMock.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(post(validBody));
    expect(res.status).toBe(500);
  });
});
