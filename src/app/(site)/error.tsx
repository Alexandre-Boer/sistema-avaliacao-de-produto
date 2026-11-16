"use client"; // Error boundaries precisam ser Client Components.

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Tela de erro das páginas do site. Uma exceção durante a renderização (por
 * exemplo, no `next/image`) cai aqui em vez de derrubar a página inteira com
 * a tela padrão do Next. O cabeçalho continua visível, porque o `layout.tsx`
 * do mesmo segmento fica fora deste error boundary.
 */
export default function SiteError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center gap-4 px-6 py-16">
      {/* As três barras da marca, na cor de destaque. */}
      <svg
        aria-hidden="true"
        width="44"
        height="36"
        viewBox="0 0 44 36"
        className="fill-signal"
      >
        <rect width="22" height="8" rx="4" />
        <rect y="14" width="34" height="8" rx="4" />
        <rect y="28" width="44" height="8" rx="4" />
      </svg>

      <div role="alert" className="flex flex-col gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Algo deu errado
        </h1>
        <p className="max-w-[60ch] text-muted-foreground">
          Não foi possível mostrar esta página. Pode ser uma falha passageira:
          tente de novo em instantes.
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button
          className="h-11 rounded-md px-5 text-[15px] font-semibold"
          // Busca os dados de novo e renderiza o segmento outra vez.
          onClick={() => retry()}
        >
          Tentar novamente
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-md px-5 text-[15px] font-semibold"
        >
          <Link href="/">Ver todos os produtos</Link>
        </Button>
      </div>
    </main>
  );
}
