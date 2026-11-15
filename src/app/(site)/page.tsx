import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDERS = ["a", "b", "c", "d", "e", "f"];

/**
 * Home esqueleto da Fase 0. A feature Home substitui o conteúdo pela listagem
 * real de produtos com scroll infinito.
 */
export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Produtos
      </h1>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDERS.map((key) => (
          <div key={key} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
