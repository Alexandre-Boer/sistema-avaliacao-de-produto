import { forbiddenOriginResponse, isSameOrigin } from "@/lib/http/same-origin";
import { signUpSchema } from "@/lib/validation/sign-up";
import {
  createAccount,
  DuplicateEmailError,
} from "@/server/accounts/create-account";

export async function POST(request: Request): Promise<Response> {
  // Mesma proteção do sign-in e do sign-out: a página de outro site não cria
  // contas a partir do navegador de quem a visita.
  if (!isSameOrigin(request)) {
    return forbiddenOriginResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const { id } = await createAccount(parsed.data);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Erro ao criar conta:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
