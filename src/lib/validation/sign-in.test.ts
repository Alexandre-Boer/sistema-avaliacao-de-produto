import { signInSchema } from "@/lib/validation/sign-in";

const valid = { email: "ana@exemplo.com", password: "senha-forte-123" };

describe("signInSchema", () => {
  it("aceita dados válidos", () => {
    expect(signInSchema.safeParse(valid).success).toBe(true);
  });

  it("normaliza o e-mail com trim e lowercase", () => {
    expect(
      signInSchema.parse({ ...valid, email: " Ana@Exemplo.COM " }).email,
    ).toBe("ana@exemplo.com");
  });

  it("rejeita e-mail inválido", () => {
    expect(
      signInSchema.safeParse({ ...valid, email: "nao-e-email" }).success,
    ).toBe(false);
  });

  it("rejeita senha vazia", () => {
    expect(signInSchema.safeParse({ ...valid, password: "" }).success).toBe(
      false,
    );
  });
});
