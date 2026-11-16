"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ProductCard } from "@/components/products/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HttpError } from "@/lib/query-client";
import { cn } from "@/lib/utils";
import type { ProductsPage } from "@/server/products/list-products";
import type { Product } from "@/server/products/product";

const PAGE_SIZE = 12;
const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];
const GRID_CLASS = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

const LOADING_MESSAGE = "Carregando produtos…";
const LOADING_MORE_MESSAGE = "Carregando mais produtos…";
const END_OF_LIST_MESSAGE = "Você viu todos os produtos";

/**
 * O `signal` vem do TanStack Query: quando a busca é cancelada (o feed sai da
 * tela ou outra busca toma o lugar), a requisição em andamento é abortada.
 */
async function fetchProductsPage(
  offset: number,
  signal: AbortSignal,
): Promise<ProductsPage> {
  const response = await fetch(
    `/api/v1/products?limit=${PAGE_SIZE}&offset=${offset}`,
    { signal },
  );
  if (!response.ok) {
    // O status vai junto para a política de repetição (`shouldRetryQuery`).
    throw new HttpError(
      response.status,
      `Falha ao listar produtos (HTTP ${response.status})`,
    );
  }
  return response.json();
}

/**
 * Junta as páginas sem repetir produtos. Com paginação por offset, um produto
 * criado entre a carga de duas páginas empurra o último item da página N para
 * a N+1; sem isso ele apareceria duas vezes, com `key` duplicada.
 */
function uniqueProducts(pages: ProductsPage[]): Product[] {
  const seen = new Set<string>();
  const products: Product[] = [];
  for (const page of pages) {
    for (const product of page.items) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
    }
  }
  return products;
}

/** Mesma silhueta do card, exibida enquanto a primeira página carrega. */
export function ProductFeedSkeleton() {
  return (
    <div className={GRID_CLASS} aria-hidden="true">
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-2/3 rounded-sm" />
            <Skeleton className="h-4 w-full rounded-sm" />
            <Skeleton className="h-4 w-1/3 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Esqueleto com texto para leitor de tela. É o fallback do `<Suspense>` da
 * home, enquanto a primeira página é buscada no servidor.
 */
export function ProductFeedLoading() {
  return (
    <div>
      <div aria-busy="true">
        <ProductFeedSkeleton />
      </div>
      <output aria-live="polite" className="sr-only">
        {LOADING_MESSAGE}
      </output>
    </div>
  );
}

type ProductFeedProps = {
  /**
   * Primeira página já buscada no servidor. Quando presente, os produtos saem
   * no HTML inicial e o cliente só busca da segunda página em diante.
   */
  initialPage?: ProductsPage;
};

export function ProductFeed({ initialPage }: ProductFeedProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isPending,
    isError,
    isFetching,
    isFetchNextPageError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["products"],
    queryFn: ({ pageParam, signal }) => fetchProductsPage(pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [0] }
      : undefined,
    // Evita rebuscar no mount a página que o servidor acabou de entregar.
    staleTime: 60_000,
  });

  // Scroll infinito: o sentinela fica logo abaixo da grade. O observer só existe
  // enquanto há próxima página e nenhuma busca em andamento; depois de uma
  // falha ele não é recriado, para não repetir a requisição a cada scroll.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage || isFetchNextPageError)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchNextPage();
        }
      },
      // Começa a buscar antes de o fim da lista aparecer na tela.
      { rootMargin: "0px 0px 600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const products = data ? uniqueProducts(data.pages) : [];
  const hasProducts = products.length > 0;

  // Depois de uma falha o TanStack Query mantém `isError` até a nova tentativa
  // terminar. Por isso "tentando de novo" (`isError && isFetching`) conta como
  // carregamento: o alerta some e o botão fica indisponível.
  const isLoadingMore = isFetchingNextPage || (isError && isFetching);
  const showLoadMoreError = isError && !isLoadingMore;
  const showLoadMoreButton = isError || hasNextPage || isLoadingMore;

  function loadMore() {
    if (isLoadingMore) return;
    // `cancelRefetch: false`: se já houver uma busca em andamento (dois cliques
    // no mesmo instante, antes de a tela atualizar), ela é reaproveitada em vez
    // de disparar outra requisição.
    if (isError && !isFetchNextPageError) {
      refetch({ cancelRefetch: false });
    } else {
      fetchNextPage({ cancelRefetch: false });
    }
  }

  let statusMessage = "";
  if (isPending) {
    statusMessage = LOADING_MESSAGE;
  } else if (hasProducts && isLoadingMore) {
    statusMessage = LOADING_MORE_MESSAGE;
  } else if (hasProducts && !isError && !hasNextPage) {
    statusMessage = END_OF_LIST_MESSAGE;
  }

  let content: React.ReactNode;
  if (isPending) {
    content = (
      <div aria-busy="true">
        <ProductFeedSkeleton />
      </div>
    );
  } else if (!data) {
    content = (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6"
      >
        <div>
          <p className="font-medium">Não foi possível carregar os produtos.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique sua conexão e tente de novo.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 rounded-md px-4 text-sm"
          onClick={() => refetch({ cancelRefetch: false })}
        >
          Tentar novamente
        </Button>
      </div>
    );
  } else if (!hasProducts) {
    content = (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">Nenhum produto cadastrado ainda.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Quando houver produtos, eles aparecem aqui.
        </p>
      </div>
    );
  } else {
    content = (
      <>
        <ul className={GRID_CLASS}>
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>

        <div ref={sentinelRef} aria-hidden="true" className="h-px" />

        {showLoadMoreButton && (
          <div className="mt-10 flex flex-col items-center gap-3 text-sm">
            {showLoadMoreError && (
              <p role="alert" className="text-destructive">
                Não foi possível carregar mais produtos.
              </p>
            )}
            {/* Um único botão para "Carregar mais" e "Tentar novamente": ele
                continua montado durante a busca para o foco do teclado não se
                perder. `aria-disabled` (em vez de `disabled`) mantém o foco. */}
            <Button
              variant="outline"
              className="h-9 rounded-md px-4 text-sm aria-disabled:cursor-default aria-disabled:opacity-60"
              aria-disabled={isLoadingMore}
              onClick={loadMore}
            >
              {showLoadMoreError ? "Tentar novamente" : "Carregar mais"}
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      {content}
      {/* Região viva única, sempre montada na mesma posição: leitores de tela
          só anunciam mudanças de texto em regiões que já existiam na página.
          Fica fora de qualquer `aria-busy`, que seguraria os anúncios. */}
      <output
        aria-live="polite"
        className={
          hasProducts
            ? cn(
                "block min-h-5 text-center text-sm text-muted-foreground",
                showLoadMoreButton ? "mt-3" : "mt-10",
              )
            : "sr-only"
        }
      >
        {statusMessage}
      </output>
    </div>
  );
}
