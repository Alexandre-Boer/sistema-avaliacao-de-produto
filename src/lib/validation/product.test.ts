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

  it.each([
    "javascript:alert(1)",
    "data:text/html,<p>x</p>",
    "ftp://loja.com/fone",
    "mailto:alguem@example.com",
  ])("rejeita externalLink com esquema que não é http(s): %s", (link) => {
    expect(
      createProductSchema.safeParse({ ...valid, externalLink: link }).success,
    ).toBe(false);
  });

  it("aceita externalLink http e https", () => {
    expect(
      createProductSchema.safeParse({
        ...valid,
        externalLink: "http://loja.com/fone",
      }).success,
    ).toBe(true);
  });

  it.each([
    "http://img.com/fone.jpg",
    "data:image/png;base64,AAAA",
    "ftp://img.com/fone.jpg",
  ])("rejeita imageUrl que não é https: %s", (url) => {
    expect(
      createProductSchema.safeParse({ ...valid, imageUrl: url }).success,
    ).toBe(false);
  });

  it("rejeita nome e descrição longos demais", () => {
    expect(
      createProductSchema.safeParse({ ...valid, name: "a".repeat(201) })
        .success,
    ).toBe(false);
    expect(
      createProductSchema.safeParse({
        ...valid,
        description: "a".repeat(2001),
      }).success,
    ).toBe(false);
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
