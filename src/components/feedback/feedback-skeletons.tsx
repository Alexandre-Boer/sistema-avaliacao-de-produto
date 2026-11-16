import { Skeleton } from "@/components/ui/skeleton";

const FEEDBACK_PLACEHOLDERS = ["a", "b", "c"];

/** Esqueleto da seção de avaliações enquanto a lista chega por streaming. */
export function FeedbackListSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando avaliações…</span>
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
  );
}

/** Esqueleto do bloco "Sua avaliação" enquanto a sessão é lida. */
export function NewFeedbackSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}
