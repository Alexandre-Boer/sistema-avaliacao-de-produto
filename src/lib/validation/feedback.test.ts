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
