import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthRequired } from "@/components/feedback/auth-required";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { ProductHeader } from "@/components/products/product-header";
import { getSession } from "@/lib/session";
import { listFeedbacks } from "@/server/feedbacks/list-feedbacks";
import { getProductById } from "@/server/products/get-product";

// Título estático: um título por produto exigiria outro boundary dinâmico.
export const metadata: Metadata = {
  title: "Detalhes do produto — Sistema de Avaliação de Produto",
};

/**
 * Lê `params`, o banco e o cookie de sessão, tudo em tempo de requisição. O
 * `loading.tsx` ao lado é o boundary de Suspense que o `cacheComponents` exige.
 */
export default async function ProductPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params;

  const [product, feedbacks, session] = await Promise.all([
    getProductById(id),
    listFeedbacks(id),
    getSession(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-10">
      <ProductHeader product={product} />

      <FeedbackList feedbacks={feedbacks} />

      <section aria-labelledby="new-feedback-heading">
        <h2
          id="new-feedback-heading"
          className="font-display text-2xl font-semibold tracking-tight"
        >
          Sua avaliação
        </h2>
        <div className="mt-5">
          {session ? (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                Você está avaliando como {session.firstName} {session.lastName}.
              </p>
              <FeedbackForm productId={product.id} />
            </>
          ) : (
            <AuthRequired />
          )}
        </div>
      </section>

      <p className="text-sm">
        <Link
          href="/"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Voltar para a lista de produtos
        </Link>
      </p>
    </main>
  );
}
