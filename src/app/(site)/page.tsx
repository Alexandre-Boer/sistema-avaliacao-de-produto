import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ProductFeed,
  ProductFeedLoading,
} from "@/components/products/product-feed";
import {
  listProducts,
  type ProductsPage,
} from "@/server/products/list-products";

export const metadata: Metadata = {
  title: "Produtos — Sistema de Avaliação de Produto",
};

/**
 * Busca a primeira página no servidor, a cada requisição, para que os produtos
 * já venham no HTML. Se o banco falhar, o feed assume a busca no cliente e
 * mostra o próprio estado de erro com "Tentar novamente".
 */
async function ProductFeedWithFirstPage() {
  await connection();

  let initialPage: ProductsPage | undefined;
  try {
    initialPage = await listProducts({ limit: 12, offset: 0 });
  } catch (error) {
    console.error("Erro ao listar produtos na home:", error);
  }

  return <ProductFeed initialPage={initialPage} />;
}

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Produtos
        </h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Escolha um produto para ver os detalhes e as avaliações de quem já
          usou.
        </p>
      </header>

      <section aria-label="Lista de produtos" className="mt-8">
        <Suspense fallback={<ProductFeedLoading />}>
          <ProductFeedWithFirstPage />
        </Suspense>
      </section>
    </main>
  );
}
