import {
  createQueryClient,
  HttpError,
  shouldRetryQuery,
} from "@/lib/query-client";

describe("shouldRetryQuery", () => {
  it.each([400, 404, 413, 429, 499])("não repete em HTTP %i", (status) => {
    expect(shouldRetryQuery(0, new HttpError(status, "falhou"))).toBe(false);
  });

  it.each([500, 502, 503])("repete uma única vez em HTTP %i", (status) => {
    const error = new HttpError(status, "falhou");
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(false);
  });

  it("repete uma única vez em falha de rede", () => {
    const error = new TypeError("Failed to fetch");
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(false);
  });
});

describe("createQueryClient", () => {
  it("aplica a política de repetição às queries e não mexe nas mutations", () => {
    const { queries, mutations } = createQueryClient().getDefaultOptions();
    expect(queries?.retry).toBe(shouldRetryQuery);
    expect(mutations?.retry).toBeUndefined();
  });

  it("cria um cliente novo a cada chamada", () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
