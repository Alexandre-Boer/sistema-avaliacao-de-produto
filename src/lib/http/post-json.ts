export const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar. Verifique sua conexão e tente de novo.";

/**
 * Envia um `POST` com corpo JSON e lança um `Error` cuja mensagem já pode ser
 * mostrada para a pessoa: o `error` devolvido pela API, `fallbackError` quando
 * a resposta de erro não traz mensagem, ou um aviso de conexão quando a
 * requisição nem chega ao servidor (nesse caso o `fetch` rejeita com um texto
 * do navegador, em inglês, como "Failed to fetch").
 */
export async function postJson(
  url: string,
  body: unknown,
  fallbackError: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? fallbackError);
  }
}
