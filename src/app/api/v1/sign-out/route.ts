import { forbiddenOriginResponse, isSameOrigin } from "@/lib/http/same-origin";
import { serializeClearedSessionCookie } from "@/lib/session";

export async function POST(request: Request): Promise<Response> {
  // Sem a checagem, a página de outro site conseguiria deslogar a pessoa.
  if (!isSameOrigin(request)) {
    return forbiddenOriginResponse();
  }

  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: { "set-cookie": serializeClearedSessionCookie() },
    },
  );
}
