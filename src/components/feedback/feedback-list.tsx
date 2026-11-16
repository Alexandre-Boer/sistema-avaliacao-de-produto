import { ScoreStars } from "@/components/feedback/score-stars";
import type { Feedback, FeedbackListing } from "@/server/feedbacks/feedback";

const SCORES = [5, 4, 3, 2, 1];

const averageFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const countFormatter = new Intl.NumberFormat("pt-BR");

// Fuso fixo: a data é formatada no servidor e não pode depender de onde ele roda.
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeZone: "America/Sao_Paulo",
});

const graphemes = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

/**
 * Primeiro caractere como a pessoa o enxerga. `charAt(0)` devolveria só metade
 * de um emoji (um par substituto solto) ou a primeira parte de um emoji composto.
 */
function firstGrapheme(text: string): string {
  const [first] = graphemes.segment(text.trim());
  return first?.segment ?? "";
}

function initials(author: Feedback["author"]): string {
  return `${firstGrapheme(author.firstName)}${firstGrapheme(author.lastName)}`.toUpperCase();
}

/** Média em destaque e distribuição das notas em barras (a linguagem visual da marca). */
function ScoreSummary({
  total,
  average,
  distribution,
}: {
  total: number;
  average: number;
  distribution: FeedbackListing["distribution"];
}) {
  // Número e estrelas partem do mesmo valor, já arredondado a uma casa.
  const shownAverage = Math.round(average * 10) / 10;

  return (
    <div className="grid gap-6 rounded-xl border bg-card p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
      <div>
        <p className="text-sm text-muted-foreground">Nota média</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="font-display text-5xl font-semibold leading-none tabular-nums tracking-tight">
            {averageFormatter.format(shownAverage)}
          </span>
          <span className="text-sm text-muted-foreground">de 5</span>
        </p>
        {/* Decorativas: a média já foi lida no número acima. */}
        <div aria-hidden="true" className="mt-3">
          <ScoreStars score={shownAverage} data-testid="average-stars" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {SCORES.map((score, index) => {
          const count = distribution[score] ?? 0;
          return (
            <div
              key={score}
              className="grid grid-cols-[1ch_1fr_minmax(2.5ch,auto)] items-center gap-3 text-sm tabular-nums"
            >
              <span className="text-muted-foreground">
                {score}
                <span className="sr-only">
                  {score === 1 ? " estrela:" : " estrelas:"}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="bar-fill block h-full rounded-full bg-signal"
                  style={{
                    width: `${(count / total) * 100}%`,
                    animationDelay: `${index * 80}ms`,
                  }}
                />
              </span>
              <span className="text-right text-muted-foreground">
                {countFormatter.format(count)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Resumo de todas as avaliações do produto e a lista das mais recentes. `total`,
 * `average` e `distribution` valem para todas; `feedbacks` pode trazer só uma parte.
 */
export function FeedbackList({
  feedbacks,
  total,
  average,
  distribution,
}: FeedbackListing) {
  return (
    <section aria-labelledby="feedbacks-heading">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="feedbacks-heading"
          className="font-display text-2xl font-semibold tracking-tight"
        >
          Avaliações
        </h2>
        {total > 0 && (
          <p className="text-sm text-muted-foreground">
            {total === 1
              ? "1 avaliação"
              : `${countFormatter.format(total)} avaliações`}
          </p>
        )}
      </div>

      {total === 0 || average === null ? (
        <p className="mt-5 rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Ainda não há avaliações. Seja a primeira pessoa a avaliar.
        </p>
      ) : (
        <>
          <div className="mt-5">
            <ScoreSummary
              total={total}
              average={average}
              distribution={distribution}
            />
          </div>

          <ol className="mt-2 divide-y">
            {feedbacks.map((feedback) => (
              <li key={feedback.id} className="flex gap-4 py-6">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary"
                >
                  {initials(feedback.author)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-medium">
                      {`${feedback.author.firstName} ${feedback.author.lastName}`}
                    </p>
                    <time
                      dateTime={feedback.createdAt}
                      className="text-sm text-muted-foreground"
                    >
                      {dateFormatter.format(new Date(feedback.createdAt))}
                    </time>
                  </div>
                  <ScoreStars score={feedback.score} className="mt-1.5" />
                  <p className="mt-3 max-w-[70ch] whitespace-pre-line break-words text-[15px] leading-relaxed">
                    {feedback.comment}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {total > feedbacks.length && (
            <p className="border-t pt-5 text-sm text-muted-foreground">
              {`Mostrando as ${countFormatter.format(feedbacks.length)} avaliações mais recentes de ${countFormatter.format(total)}.`}
            </p>
          )}
        </>
      )}
    </section>
  );
}
