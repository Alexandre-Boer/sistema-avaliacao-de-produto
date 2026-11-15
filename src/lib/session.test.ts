// @vitest-environment node
import { SignJWT } from "jose";
import {
  createSessionToken,
  getSession,
  SESSION_COOKIE_NAME,
  type Session,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  verifySessionToken,
} from "@/lib/session";

const cookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";

const session: Session = {
  accountId: "acc_123",
  firstName: "Ana",
  lastName: "Souza",
  email: "ana@example.com",
};

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SECRET);
  cookieGet.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createSessionToken / verifySessionToken", () => {
  it("faz o round-trip dos dados da sessão", async () => {
    const token = await createSessionToken(session);
    expect(await verifySessionToken(token)).toEqual(session);
  });

  it("retorna null para token malformado", async () => {
    expect(await verifySessionToken("nao-e-um-jwt")).toBeNull();
  });

  it("retorna null para token adulterado", async () => {
    const token = await createSessionToken(session);
    const [header, payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...session, accountId: "acc_outro" }),
    ).toString("base64url");
    expect(payload).not.toBe(forged);
    expect(
      await verifySessionToken(`${header}.${forged}.${signature}`),
    ).toBeNull();
  });

  it("retorna null para token assinado com outro segredo", async () => {
    const token = await new SignJWT({ ...session })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(
        new TextEncoder().encode("outro-segredo-com-mais-de-32-caracteres!"),
      );
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("retorna null para token expirado", async () => {
    const token = await new SignJWT({ ...session })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("retorna null quando o payload não tem o formato de sessão", async () => {
    const token = await new SignJWT({ accountId: "acc_123" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("lança erro quando SESSION_SECRET está ausente ou curto", async () => {
    vi.stubEnv("SESSION_SECRET", "curto");
    await expect(createSessionToken(session)).rejects.toThrow("SESSION_SECRET");
  });
});

describe("serialização do cookie", () => {
  it("monta o cookie de sessão HttpOnly com 7 dias", () => {
    expect(serializeSessionCookie("abc")).toBe(
      "session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800",
    );
  });

  it("adiciona Secure em produção", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(serializeSessionCookie("abc")).toBe(
      "session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure",
    );
  });

  it("monta o cookie que encerra a sessão", () => {
    expect(serializeClearedSessionCookie()).toBe(
      "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    );
  });
});

describe("getSession", () => {
  it("retorna null sem cookie", async () => {
    cookieGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
    expect(cookieGet).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("retorna a sessão quando o cookie é válido", async () => {
    cookieGet.mockReturnValue({ value: await createSessionToken(session) });
    expect(await getSession()).toEqual(session);
  });

  it("retorna null quando o cookie é inválido", async () => {
    cookieGet.mockReturnValue({ value: "lixo" });
    expect(await getSession()).toBeNull();
  });
});
