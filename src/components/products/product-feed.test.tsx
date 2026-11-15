import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductFeed } from "@/components/products/product-feed";
import type { Product } from "@/server/products/product";

const fetchMock = vi.fn();

/** Callbacks dos observers ativos; o teste os dispara para simular o scroll. */
const activeObservers = new Set<IntersectionObserverCallback>();

class IntersectionObserverStub {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe() {
    activeObservers.add(this.callback);
  }
  unobserve() {
    activeObservers.delete(this.callback);
  }
  disconnect() {
    activeObservers.delete(this.callback);
  }
}

function scrollSentinelIntoView() {
  act(() => {
    for (const callback of [...activeObservers]) {
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    }
  });
}

function product(
  id: string,
  name: string,
  overrides: Partial<Product> = {},
): Product {
  return {
    id,
    name,
    description: `Descrição de ${name}`,
    imageUrl: `https://img.com/${id}.jpg`,
    externalLink: `https://loja.com/${id}`,
    score: false,
    createdAt: "2026-11-13T12:00:00+00:00",
    updatedAt: "2026-11-13T12:00:00+00:00",
    ...overrides,
  };
}

function products(from: number, count: number): Product[] {
  return Array.from({ length: count }, (_, index) =>
    product(`p${from + index}`, `Produto ${from + index}`),
  );
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

function renderFeed(props: React.ComponentProps<typeof ProductFeed> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductFeed {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  activeObservers.clear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProductFeed", () => {
  it("renderiza os produtos com nome linkando para /products/<id>", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [product("p1", "Fone X")], nextOffset: null }),
    );
    renderFeed();

    expect(await screen.findByRole("link", { name: "Fone X" })).toHaveAttribute(
      "href",
      "/products/p1",
    );
    expect(screen.getByText("Descrição de Fone X")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver na loja/ })).toHaveAttribute(
      "href",
      "https://loja.com/p1",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/products?limit=12&offset=0",
    );
  });

  it("renderiza placeholder quando o produto não tem imagem nem descrição", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [product("p1", "Fone X", { imageUrl: null, description: null })],
        nextOffset: null,
      }),
    );
    const { container } = renderFeed();

    expect(await screen.findByRole("link", { name: "Fone X" })).toBeVisible();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
    expect(screen.getByText("Sem descrição")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há produtos", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [], nextOffset: null }),
    );
    renderFeed();

    expect(
      await screen.findByText("Nenhum produto cadastrado ainda."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Você viu todos os produtos"),
    ).not.toBeInTheDocument();
  });

  it("mostra erro e permite tentar novamente", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("rede fora"))
      .mockResolvedValueOnce(
        jsonResponse({ items: [product("p1", "Fone X")], nextOffset: null }),
      );
    const user = userEvent.setup();
    renderFeed();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os produtos",
    );
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("link", { name: "Fone X" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("trata resposta HTTP de erro como falha", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "Erro interno" }, 500),
    );
    renderFeed();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("busca a próxima página quando o sentinela entra na tela", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ items: products(1, 12), nextOffset: 12 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: products(13, 3), nextOffset: null }),
      );
    renderFeed();

    expect(
      await screen.findByRole("link", { name: "Produto 12" }),
    ).toBeVisible();
    expect(
      screen.queryByText("Você viu todos os produtos"),
    ).not.toBeInTheDocument();

    scrollSentinelIntoView();

    expect(
      await screen.findByRole("link", { name: "Produto 15" }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/products?limit=12&offset=12",
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(15);
    expect(screen.getByText("Você viu todos os produtos")).toBeInTheDocument();
  });

  it("oferece o botão Carregar mais como alternativa ao scroll", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ items: products(1, 12), nextOffset: 12 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: products(13, 3), nextOffset: null }),
      );
    const user = userEvent.setup();
    renderFeed();

    await user.click(
      await screen.findByRole("button", { name: "Carregar mais" }),
    );

    expect(
      await screen.findByRole("link", { name: "Produto 15" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Carregar mais" }),
    ).not.toBeInTheDocument();
  });

  it("não busca além da última página", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: products(1, 5), nextOffset: null }),
    );
    renderFeed();

    expect(
      await screen.findByRole("link", { name: "Produto 5" }),
    ).toBeVisible();
    scrollSentinelIntoView();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Você viu todos os produtos")).toBeInTheDocument();
  });

  it("mantém os produtos e não insiste sozinho quando a próxima página falha", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ items: products(1, 12), nextOffset: 12 }),
      )
      .mockRejectedValueOnce(new Error("rede fora"))
      .mockResolvedValueOnce(
        jsonResponse({ items: products(13, 3), nextOffset: null }),
      );
    const user = userEvent.setup();
    renderFeed();

    expect(
      await screen.findByRole("link", { name: "Produto 12" }),
    ).toBeVisible();
    scrollSentinelIntoView();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar mais produtos",
    );
    expect(screen.getByRole("link", { name: "Produto 1" })).toBeVisible();

    scrollSentinelIntoView();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByRole("link", { name: "Produto 15" }),
    ).toBeVisible();
  });

  it("usa a primeira página vinda do servidor sem buscá-la de novo", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: products(13, 3), nextOffset: null }),
    );
    renderFeed({ initialPage: { items: products(1, 12), nextOffset: 12 } });

    expect(screen.getByRole("link", { name: "Produto 1" })).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();

    scrollSentinelIntoView();

    expect(
      await screen.findByRole("link", { name: "Produto 15" }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/products?limit=12&offset=12",
    );
  });
});
