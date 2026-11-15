import { type ProductRow, toProduct } from "@/server/products/product";

const row: ProductRow = {
  id: "prod_1",
  name: "Fone Bluetooth",
  description: "Cancelamento de ruído",
  image_url: "https://example.com/fone.jpg",
  external_link: "https://example.com/fone",
  score: false,
  created_at: "2026-11-13T12:00:00.000Z",
  updated_at: "2026-11-13T12:30:00.000Z",
};

describe("toProduct", () => {
  it("converte a linha snake_case para o tipo camelCase", () => {
    expect(toProduct(row)).toEqual({
      id: "prod_1",
      name: "Fone Bluetooth",
      description: "Cancelamento de ruído",
      imageUrl: "https://example.com/fone.jpg",
      externalLink: "https://example.com/fone",
      score: false,
      createdAt: "2026-11-13T12:00:00.000Z",
      updatedAt: "2026-11-13T12:30:00.000Z",
    });
  });

  it("preserva campos opcionais nulos", () => {
    const product = toProduct({ ...row, description: null, image_url: null });
    expect(product.description).toBeNull();
    expect(product.imageUrl).toBeNull();
  });
});
