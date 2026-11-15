import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export type Session = {
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
};

export const SESSION_COOKIE_NAME = "session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const ALGORITHM = "HS256";
const MIN_SECRET_LENGTH = 32;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Variável de ambiente SESSION_SECRET ausente ou curta: defina um valor aleatório com pelo menos ${MIN_SECRET_LENGTH} caracteres`,
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({
    accountId: session.accountId,
    firstName: session.firstName,
    lastName: session.lastName,
    email: session.email,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/** Token inválido, expirado ou adulterado resulta em `null`. */
export async function verifySessionToken(
  token: string,
): Promise<Session | null> {
  const key = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALGORITHM],
    });
    const { accountId, firstName, lastName, email } = payload;

    if (
      typeof accountId !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string"
    ) {
      return null;
    }

    return { accountId, firstName, lastName, email };
  } catch {
    return null;
  }
}

function serializeCookie(value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function serializeSessionCookie(token: string): string {
  return serializeCookie(token, SESSION_MAX_AGE_SECONDS);
}

export function serializeClearedSessionCookie(): string {
  return serializeCookie("", 0);
}

/**
 * Lê a sessão do cookie da requisição. Como acessa `cookies()`, todo Server
 * Component que chamar esta função precisa estar dentro de um `<Suspense>`.
 */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
