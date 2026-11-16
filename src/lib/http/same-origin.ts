/**
 * Proteção contra CSRF para endpoints que mudam o estado da sessão.
 *
 * O navegador envia o header `Origin` em todo `POST` feito por uma página; se
 * ele estiver presente e não for o host desta aplicação, a requisição veio de
 * outro site. Requisições sem `Origin` (curl, testes, chamadas servidor a
 * servidor) não partem de uma página de terceiros e continuam aceitas.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) {
    return true;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    // `Origin: null` (iframe em sandbox, redirecionamentos) ou valor malformado.
    return false;
  }

  return originHost.toLowerCase() === requestHost(request).toLowerCase();
}

function requestHost(request: Request): string {
  // Atrás de um proxy, `Host` é o endereço interno; o host que a pessoa
  // acessou vem em `x-forwarded-host` (o primeiro, se houver uma lista).
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    .trim();

  return (
    forwardedHost || request.headers.get("host") || new URL(request.url).host
  );
}

export function forbiddenOriginResponse(): Response {
  return Response.json({ error: "Origem não permitida" }, { status: 403 });
}
