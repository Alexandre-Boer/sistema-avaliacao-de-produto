import { feedbackSchema } from "@/lib/validation/feedback";

const valid = { score: 4, comment: "Ótimo produto" };

describe("feedbackSchema", () => {
  it("aceita uma avaliação válida", () => {
    expect(feedbackSchema.parse(valid)).toEqual(valid);
  });

  it("rejeita nota que não é número (string, booleano, lista)", () => {
    for (const score of ["5", "0x3", true, [3], null]) {
      const result = feedbackSchema.safeParse({ ...valid, score });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Escolha uma nota de 1 a 5");
    }
  });

  it("rejeita nota 0, 6 e 4.5", () => {
    for (const score of [0, 6, 4.5]) {
      expect(feedbackSchema.safeParse({ ...valid, score }).success).toBe(false);
    }
  });

  it("rejeita comentário em branco", () => {
    const result = feedbackSchema.safeParse({ ...valid, comment: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Escreva um comentário");
  });

  it("rejeita comentário acima de 1000 caracteres", () => {
    expect(
      feedbackSchema.safeParse({ ...valid, comment: "a".repeat(1001) }).success,
    ).toBe(false);
    expect(
      feedbackSchema.safeParse({ ...valid, comment: "a".repeat(1000) }).success,
    ).toBe(true);
  });
});

/** Monta o texto pelos códigos, para o arquivo não conter caracteres invisíveis. */
function chars(...codePoints: number[]): string {
  return String.fromCodePoint(...codePoints);
}

describe("feedbackSchema: caracteres invisíveis e NUL", () => {
  it("rejeita comentário só com caracteres de largura zero ou invisíveis", () => {
    for (const comment of [
      chars(0x200b),
      chars(0x200b, 0x200c, 0x200d, 0xfeff),
      ` ${chars(0x2060)} ${chars(0xad)} `,
      chars(0x3164),
      chars(0x2800),
    ]) {
      const result = feedbackSchema.safeParse({ ...valid, comment });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Escreva um comentário");
    }
  });

  it("aceita comentário visível que também tem caracteres de largura zero (emoji composto)", () => {
    // "Gostei" + mulher + ZWJ + computador + espaço de largura zero
    const comment = `Gostei ${chars(0x1f469, 0x200d, 0x1f4bb, 0x200b)}`;
    expect(feedbackSchema.safeParse({ ...valid, comment }).success).toBe(true);
  });

  it("rejeita comentário com o caractere NUL, que o Postgres não armazena", () => {
    const result = feedbackSchema.safeParse({
      ...valid,
      comment: `Bom${chars(0)}produto`,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "O comentário contém um caractere inválido",
    );
  });
});
