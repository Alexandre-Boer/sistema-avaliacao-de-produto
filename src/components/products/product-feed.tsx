"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ProductCard } from "@/components/products/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductsPage } from "@/server/products/list-products";

const PAGE_SIZE = 12;
const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];
const GRID_CLASS = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

async function fetchProductsPage(offset: number): Promise<ProductsPage> {
  const response = await fetch(
    `/api/v1/products?limit=${PAGE_SIZE}&offset=${offset}`,
  );
  if (!response.ok) {
    throw new Error(`Falha ao listar produtos (HTTP ${response.status})`);
  }
  return response.json();
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
    isFetchNextPageError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["products"],
    queryFn: ({ pageParam }) => fetchProductsPage(pageParam),
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

  if (isPending) {
    return (
      <div aria-busy="true">
        <p className="sr-only">Carregando produtos…</p>
        <ProductFeedSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
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
          onClick={() => refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  const products = data.pages.flatMap((page) => page.items);

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">Nenhum produto cadastrado ainda.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Quando houver produtos, eles aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className={GRID_CLASS}>
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      <div className="mt-10 flex min-h-9 flex-col items-center gap-3 text-sm">
        {isError && (
          <p role="alert" className="text-destructive">
            Não foi possível carregar mais produtos.
          </p>
        )}
        {isError ? (
          <Button
            variant="outline"
            className="h-9 rounded-md px-4 text-sm"
            onClick={() => (isFetchNextPageError ? fetchNextPage() : refetch())}
          >
            Tentar novamente
          </Button>
        ) : hasNextPage || isFetchingNextPage ? (
          // O botão continua montado durante a busca para o foco do teclado não se perder.
          <Button
            variant="outline"
            className="h-9 rounded-md px-4 text-sm aria-disabled:opacity-60"
            aria-disabled={isFetchingNextPage}
            onClick={() => {
              if (!isFetchingNextPage) fetchNextPage();
            }}
          >
            {isFetchingNextPage ? "Carregando mais produtos…" : "Carregar mais"}
          </Button>
        ) : (
          <p className="text-muted-foreground">Você viu todos os produtos</p>
        )}
      </div>
    </div>
  );
}
