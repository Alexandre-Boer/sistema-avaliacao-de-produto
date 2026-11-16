import { POST } from "@/app/api/v1/sign-out/route";

function post(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/v1/sign-out", {
    method: "POST",
    headers,
  });
}

describe("POST /api/v1/sign-out", () => {
  it("retorna 200 e limpa o cookie de sessão", async () => {
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("session=;");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
  });

  it("aceita quando o Origin corresponde ao host da requisição", async () => {
    const res = await POST(post({ origin: "http://localhost" }));
    expect(res.status).toBe(200);
  });

  it("retorna 403 e mantém o cookie quando o Origin é de outro site", async () => {
    const res = await POST(post({ origin: "https://malicioso.example" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Origem não permitida" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
