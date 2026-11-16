import { fireEvent, render, screen } from "@testing-library/react";
import { ProductCard } from "@/components/products/product-card";
import type { Product } from "@/server/products/product";

const product: Product = {
  id: "p1",
  name: "Fone X",
  description: "Sem fio",
  imageUrl: "https://img.com/fone.jpg",
  externalLink: "https://loja.com/fone",
  score: false,
  createdAt: "2026-11-13T12:00:00+00:00",
  updatedAt: "2026-11-13T12:00:00+00:00",
};

function image(container: HTMLElement): HTMLImageElement {
  const img = container.querySelector("img");
  if (!img) throw new Error("imagem não encontrada");
  return img;
}

describe("ProductCard", () => {
  it("mostra a imagem do produto quando há imageUrl", () => {
    const { container } = render(<ProductCard product={product} />);

    expect(image(container)).toBeInTheDocument();
    expect(screen.queryByText("Sem imagem")).not.toBeInTheDocument();
  });

  it("mostra o placeholder quando não há imageUrl", () => {
    const { container } = render(
      <ProductCard product={{ ...product, imageUrl: null }} />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
  });

  it("cai no placeholder quando a imagem falha ao carregar", () => {
    const { container } = render(<ProductCard product={product} />);

    fireEvent.error(image(container));

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
  });

  it("tenta de novo quando o produto passa a ter outra imagem", () => {
    const { container, rerender } = render(<ProductCard product={product} />);
    fireEvent.error(image(container));

    rerender(
      <ProductCard
        product={{ ...product, imageUrl: "https://img.com/outra.jpg" }}
      />,
    );

    expect(image(container)).toBeInTheDocument();
    expect(screen.queryByText("Sem imagem")).not.toBeInTheDocument();
  });
});
