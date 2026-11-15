import { verifyPassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  authenticate,
  InvalidCredentialsError,
} from "@/server/accounts/authenticate";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: vi.fn(),
}));

const verifyPasswordMock = vi.mocked(verifyPassword);

const account = {
  id: "acc_1",
  first_name: "Ana",
  last_name: "Silva",
  email: "ana@exemplo.com",
  password: "$2b$10$hash",
  active: true,
};

const input = { email: "ana@exemplo.com", password: "senha-forte-123" };

const maybeSingleSpy = vi.fn();
const eqSpy = vi.fn(() => ({ maybeSingle: maybeSingleSpy }));
const selectSpy = vi.fn(() => ({ eq: eqSpy }));
const fromSpy = vi.fn(() => ({ select: selectSpy }));

beforeEach(() => {
  maybeSingleSpy.mockReset();
  verifyPasswordMock.mockReset();
  verifyPasswordMock.mockResolvedValue(false);
  eqSpy.mockClear();
  fromSpy.mockClear();
  vi.mocked(createAdminClient).mockReturnValue({ from: fromSpy } as never);
});

describe("authenticate", () => {
  it("retorna a sessão quando e-mail e senha conferem", async () => {
    maybeSingleSpy.mockResolvedValueOnce({ data: account, error: null });
    verifyPasswordMock.mockResolvedValueOnce(true);

    await expect(authenticate(input)).resolves.toEqual({
      accountId: "acc_1",
      firstName: "Ana",
      lastName: "Silva",
      email: "ana@exemplo.com",
    });
    expect(fromSpy).toHaveBeenCalledWith("accounts");
    expect(eqSpy).toHaveBeenCalledWith("email", "ana@exemplo.com");
    expect(verifyPasswordMock).toHaveBeenCalledWith(
      "senha-forte-123",
      "$2b$10$hash",
    );
  });

  it("lança InvalidCredentialsError quando a senha está incorreta", async () => {
    maybeSingleSpy.mockResolvedValueOnce({ data: account, error: null });
    verifyPasswordMock.mockResolvedValueOnce(false);

    await expect(authenticate(input)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it("lança InvalidCredentialsError quando a conta não existe e ainda assim compara contra um hash dummy", async () => {
    maybeSingleSpy.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      authenticate({ email: "x@x.com", password: "x" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(verifyPasswordMock).toHaveBeenCalledTimes(1);
    expect(verifyPasswordMock.mock.calls[0][1]).toMatch(/^\$2[aby]\$10\$/);
  });

  it("lança InvalidCredentialsError quando a conta está inativa, mesmo com a senha correta", async () => {
    maybeSingleSpy.mockResolvedValueOnce({
      data: { ...account, active: false },
      error: null,
    });
    verifyPasswordMock.mockResolvedValueOnce(true);

    await expect(authenticate(input)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(verifyPasswordMock).toHaveBeenCalledTimes(1);
    expect(verifyPasswordMock.mock.calls[0][1]).not.toBe(account.password);
  });

  it("usa a mesma mensagem genérica em todas as falhas de credencial", () => {
    expect(new InvalidCredentialsError().message).toBe(
      "E-mail ou senha inválidos",
    );
  });

  it("relança erros do banco", async () => {
    maybeSingleSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });

    await expect(authenticate(input)).rejects.toThrow("boom");
  });
});
