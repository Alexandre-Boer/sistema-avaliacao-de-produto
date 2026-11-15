import { Suspense } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { UserArea } from "@/components/layout/user-area";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Cabeçalho das páginas do site. A marca entra no shell estático; a área do
 * usuário depende do cookie de sessão e chega por streaming dentro do Suspense.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Wordmark />
        <Suspense fallback={<Skeleton className="h-9 w-24 rounded-md" />}>
          <UserArea />
        </Suspense>
      </div>
    </header>
  );
}
