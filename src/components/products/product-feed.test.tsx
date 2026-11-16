import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ProductFeed,
  ProductFeedLoading,
} from "@/components/products/product-feed";
import { createQueryClient } from "@/lib/query-client";
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

/** Promise controlada pelo teste, para observar a tela durante uma busca. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Segundo argumento do `fetch`: o `signal` do TanStack Query. */
const withSignal = expect.objectContaining({
  signal: expect.any(AbortSignal),
});

/**
 * Espera que cobre a repetição automática de produção: depois de uma falha de
 * rede ou HTTP 5xx o TanStack Query aguarda ~1 s e tenta mais uma vez.
 */
const AFTER_RETRY = { timeout: 4000 };

function renderFeed(props: React.ComponentProps<typeof ProductFeed> = {}) {
  // Mesma configuração de produção (ver `src/app/providers.tsx`).
  const queryClient = createQueryClient();
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
  vi.restoreAllMocks();
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
      withSignal,
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
      .mockRejectedValueOnce(new Error("rede fora"))
      .mockResolvedValueOnce(
        jsonResponse({ items: [product("p1", "Fone X")], nextOffset: null }),
      );
    const user = userEvent.setup();
    renderFeed();

    expect(await screen.findByRole("alert", {}, AFTER_RETRY)).toHaveTextContent(
      "Não foi possível carregar os produtos",
    );
    // Falha de rede: a tentativa original mais uma única repetição automática.
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("link", { name: "Fone X" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("trata HTTP 5xx como falha depois de uma única repetição", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Erro interno" }, 500));
    renderFeed();

    expect(
      await screen.findByRole("alert", {}, AFTER_RETRY),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("mostra o erro na hora, sem repetir, quando a resposta é HTTP 4xx", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Parâmetros inválidos" }, 400),
    );
    renderFeed();

    // Timeout curto de propósito: não pode haver espera de repetição.
    expect(
      await screen.findByRole("alert", {}, { timeout: 500 }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
      withSignal,
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

    expect(await screen.findByRole("alert", {}, AFTER_RETRY)).toHaveTextContent(
      "Não foi possível carregar mais produtos",
    );
    expect(screen.getByRole("link", { name: "Produto 1" })).toBeVisible();

    // Primeira página + tentativa da segunda + uma repetição automática.
    scrollSentinelIntoView();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByRole("link", { name: "Produto 15" }),
    ).toBeVisible();
  });

  it("mostra carregamento e ignora cliques repetidos ao tentar novamente", async () => {
    const retry = deferred<ReturnType<typeof jsonResponse>>();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ items: products(1, 12), nextOffset: 12 }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "Inválido" }, 400))
      .mockReturnValueOnce(retry.promise);
    const user = userEvent.setup();
    renderFeed();

    expect(
      await screen.findByRole("link", { name: "Produto 12" }),
    ).toBeVisible();
    scrollSentinelIntoView();

    const button = await screen.findByRole("button", {
      name: "Tentar novamente",
    });
    await user.click(button);

    // Durante a nova tentativa: some o alerta, aparece o carregamento e o
    // botão (o mesmo elemento, para o foco não se perder) fica indisponível.
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Carregando mais produtos…",
      ),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toHaveAccessibleName("Tentar novamente");
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await user.click(button);
    await user.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await act(async () => {
      retry.resolve(jsonResponse({ items: products(13, 3), nextOffset: null }));
    });
    expect(
      await screen.findByRole("link", { name: "Produto 15" }),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("aborta a requisição em andamento quando o feed sai da tela", async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = renderFeed();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const { signal } = fetchMock.mock.calls[0][1] as { signal: AbortSignal };
    expect(signal.aborted).toBe(false);

    unmount();
    expect(signal.aborted).toBe(true);
  });

  it("não repete o produto que reaparece na página seguinte", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    // Um produto criado entre as duas cargas empurra o p12 para a página 2.
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [product("p12", "Produto 12"), ...products(13, 2)],
        nextOffset: null,
      }),
    );
    renderFeed({ initialPage: { items: products(1, 12), nextOffset: 12 } });

    scrollSentinelIntoView();

    expect(
      await screen.findByRole("link", { name: "Produto 14" }),
    ).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Produto 12" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(14);
    // O React avisa "Encountered two children with the same key" via console.error.
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("anuncia carregamento e fim da lista na mesma região viva", async () => {
    const firstPage = deferred<ReturnType<typeof jsonResponse>>();
    const secondPage = deferred<ReturnType<typeof jsonResponse>>();
    fetchMock
      .mockReturnValueOnce(firstPage.promise)
      .mockReturnValueOnce(secondPage.promise);
    const user = userEvent.setup();
    renderFeed();

    // A região fica montada do começo ao fim; só o texto muda.
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Carregando produtos…");
    // `aria-busy` num ancestral seguraria os anúncios da região.
    expect(status.closest("[aria-busy='true']")).toBeNull();

    await act(async () => {
      firstPage.resolve(
        jsonResponse({ items: products(1, 12), nextOffset: 12 }),
      );
    });
    expect(
      await screen.findByRole("link", { name: "Produto 12" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: "Carregar mais" }));
    await waitFor(() =>
      expect(status).toHaveTextContent("Carregando mais produtos…"),
    );

    await act(async () => {
      secondPage.resolve(
        jsonResponse({ items: products(13, 3), nextOffset: null }),
      );
    });
    await waitFor(() =>
      expect(status).toHaveTextContent("Você viu todos os produtos"),
    );
    expect(screen.getByRole("status")).toBe(status);
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
      withSignal,
    );
  });
});

describe("ProductFeedLoading", () => {
  it("dá texto ao esqueleto para quem usa leitor de tela", () => {
    render(<ProductFeedLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando produtos…",
    );
  });
});
