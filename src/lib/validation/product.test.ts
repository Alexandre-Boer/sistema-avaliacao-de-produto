import {
  createProductSchema,
  listProductsQuerySchema,
} from "@/lib/validation/product";

const valid = {
  name: "Fone X",
  description: "Sem fio",
  externalLink: "https://loja.com/fone",
  imageUrl: "https://img.com/fone.jpg",
};

describe("createProductSchema", () => {
  it("aceita um produto válido", () => {
    expect(createProductSchema.parse(valid)).toEqual(valid);
  });

  it("aceita descrição ausente e transforma vazia em undefined", () => {
    const { description: _description, ...semDescricao } = valid;
    expect(createProductSchema.parse(semDescricao).description).toBeUndefined();
    expect(
      createProductSchema.parse({ ...valid, description: "  " }).description,
    ).toBeUndefined();
  });

  it("rejeita nome vazio", () => {
    const result = createProductSchema.safeParse({ ...valid, name: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Informe o nome");
  });

  it("rejeita externalLink inválido (sem protocolo)", () => {
    const result = createProductSchema.safeParse({
      ...valid,
      externalLink: "www.loja.com",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Informe um link válido");
  });

  it("rejeita imageUrl inválida", () => {
    const result = createProductSchema.safeParse({
      ...valid,
      imageUrl: "foto.jpg",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Informe uma URL de imagem válida",
    );
  });
});

describe("listProductsQuerySchema", () => {
  it("usa defaults limit=12 offset=0", () => {
    expect(listProductsQuerySchema.parse({})).toEqual({ limit: 12, offset: 0 });
  });

  it("converte strings", () => {
    expect(
      listProductsQuerySchema.parse({ limit: "20", offset: "40" }),
    ).toEqual({ limit: 20, offset: 40 });
  });

  it("rejeita limit acima de 50, não numérico e offset negativo", () => {
    expect(listProductsQuerySchema.safeParse({ limit: "1000" }).success).toBe(
      false,
    );
    expect(listProductsQuerySchema.safeParse({ limit: "abc" }).success).toBe(
      false,
    );
    expect(listProductsQuerySchema.safeParse({ limit: "0" }).success).toBe(
      false,
    );
    expect(listProductsQuerySchema.safeParse({ offset: "-1" }).success).toBe(
      false,
    );
  });
});
