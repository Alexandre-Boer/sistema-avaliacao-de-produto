import { forbiddenOriginResponse, isSameOrigin } from "@/lib/http/same-origin";
import { createSessionToken, serializeSessionCookie } from "@/lib/session";
import { signInSchema } from "@/lib/validation/sign-in";
import {
  authenticate,
  InvalidCredentialsError,
} from "@/server/accounts/authenticate";
import {
  clearFailedSignIns,
  getSignInBlock,
  recordFailedSignIn,
} from "@/server/accounts/sign-in-attempts";

function isJsonRequest(request: Request): boolean {
  const mediaType = request.headers.get("content-type")?.split(";")[0];
  return mediaType?.trim().toLowerCase() === "application/json";
}

function tooManyAttemptsResponse(retryAfterSeconds: number): Response {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const wait = minutes === 1 ? "1 minuto" : `${minutes} minutos`;
  return Response.json(
    { error: `Muitas tentativas de login. Tente de novo em ${wait}.` },
    { status: 429, headers: { "retry-after": String(retryAfterSeconds) } },
  );
}

export async function POST(request: Request): Promise<Response> {
  // Login CSRF: sem estas duas checagens, a página de outro site conseguiria
  // autenticar o navegador da vítima na conta do atacante.
  if (!isSameOrigin(request)) {
    return forbiddenOriginResponse();
  }

  // Um <form> de outro site só consegue enviar urlencoded, multipart ou
  // text/plain; exigir JSON fecha esse caminho mesmo sem o header Origin.
  if (!isJsonRequest(request)) {
    return Response.json(
      { error: "Content-Type deve ser application/json" },
      { status: 415 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  // Com o limite estourado a senha nem é verificada: a resposta é a mesma
  // para senha certa ou errada, então insistir não ensina nada ao atacante.
  const block = await getSignInBlock(email);
  if (block) {
    return tooManyAttemptsResponse(block.retryAfterSeconds);
  }

  try {
    const session = await authenticate(parsed.data);
    const token = await createSessionToken(session);
    await clearFailedSignIns(email);

    // O cookie vai direto no header da resposta (em vez de `cookies().set`)
    // para o handler continuar testável sem mock de `next/headers`.
    return Response.json(
      { id: session.accountId },
      {
        status: 200,
        headers: { "set-cookie": serializeSessionCookie(token) },
      },
    );
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      // Registrada exista ou não a conta, para o limite não revelar quais
      // e-mails estão cadastrados.
      await recordFailedSignIn(email);
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao autenticar:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
