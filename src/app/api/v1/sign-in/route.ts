import { createSessionToken, serializeSessionCookie } from "@/lib/session";
import { signInSchema } from "@/lib/validation/sign-in";
import {
  authenticate,
  InvalidCredentialsError,
} from "@/server/accounts/authenticate";

export async function POST(request: Request): Promise<Response> {
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

  try {
    const session = await authenticate(parsed.data);
    const token = await createSessionToken(session);

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
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Erro ao autenticar:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
