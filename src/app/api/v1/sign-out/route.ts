import { serializeClearedSessionCookie } from "@/lib/session";

export async function POST(): Promise<Response> {
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: { "set-cookie": serializeClearedSessionCookie() },
    },
  );
}
