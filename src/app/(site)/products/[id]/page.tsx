import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlreadyReviewed } from "@/components/feedback/already-reviewed";
import { AuthRequired } from "@/components/feedback/auth-required";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import {
  FeedbackListSkeleton,
  NewFeedbackSkeleton,
} from "@/components/feedback/feedback-skeletons";
import { AiSummary, AiSummarySkeleton } from "@/components/products/ai-summary";
import { ProductHeader } from "@/components/products/product-header";
import { getSession } from "@/lib/session";
import { getAiSummary } from "@/server/ai-summary/get-ai-summary";
import { hasFeedback } from "@/server/feedbacks/has-feedback";
import { listFeedbacks } from "@/server/feedbacks/list-feedbacks";
import { getProductById } from "@/server/products/get-product";
import type { Product } from "@/server/products/product";

// Título estático: um título por produto exigiria outro boundary dinâmico.
export const metadata: Metadata = {
  title: "Detalhes do produto — Sistema de Avaliação de Produto",
};

/**
 * Esta rota bloqueia de propósito: a busca do produto acontece antes do
 * primeiro byte da resposta, para que um produto inexistente responda `404` de
 * verdade. Com um `loading.tsx` (ou um `<Suspense>` acima da busca) a resposta
 * começaria a ser transmitida com status `200` antes de o `notFound()` rodar.
 * `instant = false` avisa o `cacheComponents` de que a espera é intencional.
 */
export const instant = false;

/**
 * Sem isto o `404` só valeria em desenvolvimento. Em produção, com
 * `partialPrefetching` ligado, a primeira visita a um id ainda não visto recebe
 * o shell genérico da rota, já com status `200`, e a página só é gerada em
 * segundo plano. `blocking` faz essa primeira visita esperar a página do
 * próprio id; como `getProductById` usa cache, o `notFound()` acontece nessa
 * pré-renderização e o `404` é o status da resposta.
 *
 * Atenção: a API ainda é instável (prefixo `unstable_`) e não está na
 * documentação instalada; o nome pode mudar numa atualização do Next.js. A
 * alternativa documentada é checar o id no `proxy.ts`.
 */
export const unstable_paramMatching = { id: "blocking" };

/**
 * Resumo da IA: chega por streaming, sem segurar o cabeçalho nem a lista. Quando
 * não há resumo (poucas avaliações, IA não configurada ou fora do ar) o bloco
 * simplesmente não aparece.
 */
async function ProductAiSummary({ product }: { product: Product }) {
  const aiSummary = await getAiSummary(product);
  return aiSummary ? <AiSummary summary={aiSummary.summary} /> : null;
}

/** Avaliações do produto: chegam por streaming, depois do cabeçalho. */
async function ProductFeedbacks({ productId }: { productId: string }) {
  const listing = await listFeedbacks(productId);
  return <FeedbackList {...listing} />;
}

/**
 * Bloco "Sua avaliação", que depende do cookie de sessão: pede login a quem
 * não entrou, avisa quem já avaliou e mostra o formulário para os demais.
 */
async function NewFeedback({ productId }: { productId: string }) {
  const session = await getSession();
  if (!session) {
    return <AuthRequired />;
  }

  if (await hasFeedback(productId, session.accountId)) {
    return <AlreadyReviewed />;
  }

  return (
    <FeedbackForm
      productId={productId}
      authorName={`${session.firstName} ${session.lastName}`}
    />
  );
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params;

  // Fora de qualquer `<Suspense>`: é esta consulta que decide entre 200 e 404.
  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-10">
      <ProductHeader product={product} />

      <Suspense fallback={<AiSummarySkeleton />}>
        <ProductAiSummary product={product} />
      </Suspense>

      <Suspense fallback={<FeedbackListSkeleton />}>
        <ProductFeedbacks productId={product.id} />
      </Suspense>

      <section aria-labelledby="new-feedback-heading">
        <h2
          id="new-feedback-heading"
          className="font-display text-2xl font-semibold tracking-tight"
        >
          Sua avaliação
        </h2>
        <div className="mt-5">
          <Suspense fallback={<NewFeedbackSkeleton />}>
            <NewFeedback productId={product.id} />
          </Suspense>
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
