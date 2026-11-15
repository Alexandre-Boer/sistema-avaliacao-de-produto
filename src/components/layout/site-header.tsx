import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

/**
 * Cabeçalho das páginas do site. Placeholder da Fase 0: a feature de Sign-in
 * troca o botão "Entrar" pela área do usuário (avatar e menu) quando há sessão.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Wordmark />
        <Button asChild variant="outline">
          <Link href="/auth/sign-in">Entrar</Link>
        </Button>
      </div>
    </header>
  );
}
