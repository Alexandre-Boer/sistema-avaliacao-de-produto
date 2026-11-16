import { Skeleton } from "@/components/ui/skeleton";

const FEEDBACK_PLACEHOLDERS = ["a", "b", "c"];

/** Esqueleto com a mesma estrutura da página: produto, avaliações e formulário. */
export default function ProductLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-10"
    >
      <span className="sr-only">Carregando produto…</span>

      <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-center md:gap-12">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-2 h-11 w-36 rounded-md" />
        </div>
      </div>

      <div>
        <Skeleton className="h-8 w-40" />
        <div className="mt-2 divide-y">
          {FEEDBACK_PLACEHOLDERS.map((key) => (
            <div key={key} className="flex gap-4 py-6">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
