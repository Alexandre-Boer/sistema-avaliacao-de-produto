import bcrypt from "bcryptjs";
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
    expect(verifyPasswordMock.mock.calls[0][0]).toBe("x");
  });

  it("o hash dummy faz o bcrypt trabalhar de verdade, com o mesmo custo do cadastro", async () => {
    // Aqui roda o verifyPassword real. O bcryptjs devolve `false` na hora
    // (sem gastar tempo) quando o hash é malformado, então só o prefixo não
    // prova nada: o hash precisa ser um bcrypt completo de custo 10.
    const real =
      await vi.importActual<typeof import("@/lib/password")>("@/lib/password");
    verifyPasswordMock.mockImplementation(real.verifyPassword);
    maybeSingleSpy.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      authenticate({ email: "x@x.com", password: "senha-forte-123" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(verifyPasswordMock).toHaveBeenCalledTimes(1);
    const dummyHash = verifyPasswordMock.mock.calls[0][1];
    expect(dummyHash).toHaveLength(60);
    expect(bcrypt.getRounds(dummyHash)).toBe(10);
    // Os 29 primeiros caracteres são o salt: se o bcrypt consegue gerar um
    // hash com ele, a comparação percorre todas as rodadas em vez de abortar.
    const rehashed = await bcrypt.hash(
      "senha-forte-123",
      dummyHash.slice(0, 29),
    );
    expect(rehashed).toHaveLength(60);
    expect(rehashed).not.toBe(dummyHash);
    // E a verificação real terminou dizendo que a senha não confere.
    await expect(verifyPasswordMock.mock.results[0].value).resolves.toBe(false);
  });

  it("só rejeita a conta inexistente depois que a verificação de senha termina", async () => {
    let finishVerification: (matches: boolean) => void = () => {};
    verifyPasswordMock.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        finishVerification = resolve;
      }),
    );
    maybeSingleSpy.mockResolvedValueOnce({ data: null, error: null });

    let settled = false;
    const result = authenticate({ email: "x@x.com", password: "x" }).catch(
      (error: unknown) => {
        settled = true;
        return error;
      },
    );

    await vi.waitFor(() => expect(verifyPasswordMock).toHaveBeenCalledTimes(1));
    // Dá várias voltas na fila de microtarefas: sem o `await`, a rejeição já
    // teria chegado aqui.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).toBe(false);

    finishVerification(false);
    expect(await result).toBeInstanceOf(InvalidCredentialsError);
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
