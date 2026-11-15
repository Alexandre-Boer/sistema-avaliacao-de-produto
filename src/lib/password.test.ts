import { hashPassword, verifyPassword } from "@/lib/password";

describe("hashPassword", () => {
  it("gera hash bcrypt diferente da senha em texto puro", async () => {
    const { hash } = await hashPassword("minha-senha-123");
    expect(hash).not.toBe("minha-senha-123");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("retorna o salt usado, embutido no próprio hash", async () => {
    const { hash, salt } = await hashPassword("minha-senha-123");
    expect(hash.startsWith(salt)).toBe(true);
  });

  it("gera salts diferentes a cada chamada", async () => {
    const a = await hashPassword("minha-senha-123");
    const b = await hashPassword("minha-senha-123");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("verifyPassword", () => {
  it("verifyPassword aceita a senha correta", async () => {
    const { hash } = await hashPassword("minha-senha-123");
    expect(await verifyPassword("minha-senha-123", hash)).toBe(true);
  });

  it("verifyPassword rejeita senha incorreta", async () => {
    const { hash } = await hashPassword("minha-senha-123");
    expect(await verifyPassword("outra-senha", hash)).toBe(false);
  });
});
