import { SparkleIcon } from "@phosphor-icons/react/ssr";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Bloco "Resumo da IA": o resumo geral das avaliações, entre as informações do
 * produto e a lista de avaliações. A borda e o fundo na cor primária, o selo
 * "IA" e o aviso no rodapé deixam claro que o texto não foi escrito por uma
 * pessoa. O resumo entra como texto puro: o React escapa qualquer HTML.
 */
export function AiSummary({ summary }: { summary: string }) {
  return (
    <section
      aria-labelledby="ai-summary-heading"
      className="rounded-xl border border-primary/25 bg-primary/5 p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold tracking-wide text-primary-foreground">
          <SparkleIcon aria-hidden="true" weight="fill" className="size-3.5" />
          IA
        </span>
        <h2
          id="ai-summary-heading"
          className="font-display text-xl font-semibold tracking-tight"
        >
          Resumo da IA
        </h2>
      </div>

      <p className="mt-4 max-w-[75ch] text-base leading-relaxed">{summary}</p>

      <p className="mt-4 text-xs text-muted-foreground">
        Gerado por inteligência artificial a partir das avaliações mais recentes
        deste produto. Pode conter imprecisões.
      </p>
    </section>
  );
}

/** Esqueleto do bloco enquanto o resumo é lido ou gerado. */
export function AiSummarySkeleton() {
  return (
    <div
      aria-busy="true"
      className="rounded-xl border border-primary/25 bg-primary/5 p-6"
    >
      <span className="sr-only">Carregando o resumo da IA…</span>
      <Skeleton className="h-6 w-44" />
      <div className="mt-4 flex flex-col gap-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}
