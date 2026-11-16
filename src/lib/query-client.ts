import { QueryClient } from "@tanstack/react-query";

/** Falha de uma chamada HTTP que chegou ao servidor e voltou com status de erro. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Quantas vezes uma query é repetida sozinha depois da primeira falha. */
export const MAX_QUERY_RETRIES = 1;

/**
 * Política de repetição das queries:
 * - HTTP 4xx é determinístico (a mesma requisição falha de novo): não repete;
 * - falha de rede ou HTTP 5xx pode ser passageira: repete no máximo 1 vez.
 *
 * O padrão do TanStack Query (3 repetições com espera crescente) segurava o
 * estado de erro por ~7 s mesmo quando repetir não adiantava.
 */
export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < MAX_QUERY_RETRIES;
}

/**
 * Fábrica do `QueryClient` da aplicação. Os testes usam esta mesma função para
 * exercitar a configuração de produção. Só as queries são configuradas: as
 * mutations ficam com o padrão da biblioteca (sem repetição).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetryQuery },
    },
  });
}
