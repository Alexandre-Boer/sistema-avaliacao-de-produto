import { isSameOrigin } from "@/lib/http/same-origin";

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/v1/sign-in", {
    method: "POST",
    headers,
  });
}

describe("isSameOrigin", () => {
  it("aceita requisição sem Origin (curl, testes)", () => {
    expect(isSameOrigin(request({}))).toBe(true);
  });

  it("aceita quando o Origin corresponde ao header Host", () => {
    expect(
      isSameOrigin(
        request({ origin: "http://localhost:3000", host: "localhost:3000" }),
      ),
    ).toBe(true);
  });

  it("rejeita quando o Origin é de outro site", () => {
    expect(
      isSameOrigin(
        request({
          origin: "https://malicioso.example",
          host: "localhost:3000",
        }),
      ),
    ).toBe(false);
  });

  it("rejeita quando só a porta difere", () => {
    expect(
      isSameOrigin(
        request({ origin: "http://localhost:4000", host: "localhost:3000" }),
      ),
    ).toBe(false);
  });

  it("dá preferência ao x-forwarded-host (atrás de proxy)", () => {
    const headers = {
      host: "interno:3000",
      "x-forwarded-host": "app.exemplo.com",
    };
    expect(
      isSameOrigin(request({ ...headers, origin: "https://app.exemplo.com" })),
    ).toBe(true);
    expect(
      isSameOrigin(request({ ...headers, origin: "http://interno:3000" })),
    ).toBe(false);
  });

  it("usa o primeiro valor quando x-forwarded-host traz uma lista", () => {
    expect(
      isSameOrigin(
        request({
          origin: "https://app.exemplo.com",
          "x-forwarded-host": "app.exemplo.com, proxy.interno",
        }),
      ),
    ).toBe(true);
  });

  it("compara sem diferenciar maiúsculas de minúsculas", () => {
    expect(
      isSameOrigin(
        request({ origin: "http://LOCALHOST:3000", host: "localhost:3000" }),
      ),
    ).toBe(true);
  });

  it("usa o host da URL da requisição quando não há header Host", () => {
    expect(isSameOrigin(request({ origin: "http://localhost:3000" }))).toBe(
      true,
    );
    expect(isSameOrigin(request({ origin: "http://outro.example" }))).toBe(
      false,
    );
  });

  it('rejeita Origin opaco ("null") ou malformado', () => {
    expect(isSameOrigin(request({ origin: "null" }))).toBe(false);
    expect(isSameOrigin(request({ origin: "não é url" }))).toBe(false);
  });
});
