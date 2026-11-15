import { POST } from "@/app/api/v1/sign-out/route";

describe("POST /api/v1/sign-out", () => {
  it("retorna 200 e limpa o cookie de sessão", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("session=;");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
  });
});
