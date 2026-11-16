import { getSession, serializeClearedSessionCookie } from "@/lib/session";
import { feedbackSchema } from "@/lib/validation/feedback";
import {
  AccountNotFoundError,
  createFeedback,
  DuplicateFeedbackError,
  ProductNotFoundError,
} from "@/server/feedbacks/create-feedback";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/v1/products/[id]/feedbacks">,
): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Faça login para avaliar" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id: productId } = await ctx.params;

  try {
    // O autor vem da sessão e o produto da URL; campos extras do body são descartados pelo schema.
    const { id } = await createFeedback({
      productId,
      accountId: session.accountId,
      score: parsed.data.score,
      comment: parsed.data.comment,
    });
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DuplicateFeedbackError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof AccountNotFoundError) {
      // A conta foi removida: a sessão não vale mais, então o cookie sai junto.
      return Response.json(
        { error: error.message },
        {
          status: 401,
          headers: { "set-cookie": serializeClearedSessionCookie() },
        },
      );
    }
    console.error("Erro ao criar avaliação:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
