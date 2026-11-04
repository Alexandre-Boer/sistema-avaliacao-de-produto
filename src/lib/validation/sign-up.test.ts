import { signUpSchema } from "@/lib/validation/sign-up";

const valid = {
  firstName: "Ana",
  lastName: "Silva",
  email: "ana@exemplo.com",
  password: "senha-forte-123",
  passwordConfirmation: "senha-forte-123",
};

describe("signUpSchema", () => {
  it("aceita dados válidos", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("normaliza o e-mail com trim e lowercase", () => {
    const result = signUpSchema.parse({ ...valid, email: " Ana@Exemplo.COM " });
    expect(result.email).toBe("ana@exemplo.com");
  });

  it("rejeita e-mail inválido", () => {
    expect(
      signUpSchema.safeParse({ ...valid, email: "nao-e-email" }).success,
    ).toBe(false);
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    expect(
      signUpSchema.safeParse({
        ...valid,
        password: "curta12",
        passwordConfirmation: "curta12",
      }).success,
    ).toBe(false);
  });

  it("rejeita confirmação de senha divergente", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      passwordConfirmation: "outra-senha-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita nome ou sobrenome vazios", () => {
    expect(signUpSchema.safeParse({ ...valid, firstName: "  " }).success).toBe(
      false,
    );
    expect(signUpSchema.safeParse({ ...valid, lastName: "" }).success).toBe(
      false,
    );
  });
});
