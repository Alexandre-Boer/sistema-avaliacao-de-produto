const criteria = [
  { label: "Qualidade de construção", score: 8.5 },
  { label: "Conforto de uso", score: 9 },
  { label: "Autonomia da bateria", score: 7 },
  { label: "Custo-benefício", score: 8 },
];

const finalScore =
  criteria.reduce((sum, item) => sum + item.score, 0) / criteria.length;

const formatScore = (value: number) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/**
 * Ficha de avaliação ilustrativa: mostra ao visitante o que ele fará
 * depois de criar a conta. Decorativa para leitores de tela.
 */
export function EvaluationPreview() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.06] p-6 text-primary-foreground shadow-[0_24px_60px_-30px_oklch(0_0_0/0.6)] backdrop-blur-sm"
    >
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-white/60">Avaliação</span>
        <span className="font-medium">Fone de ouvido sem fio</span>
      </div>

      <ul className="mt-6 space-y-4">
        {criteria.map((item, index) => (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>{item.label}</span>
              <span className="text-white/80 tabular-nums">
                {formatScore(item.score)}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="bar-fill h-full rounded-full bg-signal"
                style={{
                  width: `${item.score * 10}%`,
                  animationDelay: `${200 + index * 120}ms`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-7 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
        <div>
          <div className="text-sm text-white/60">Nota final</div>
          <div className="mt-1 font-display text-4xl font-semibold leading-none tabular-nums">
            {formatScore(finalScore)}
          </div>
        </div>
        <span className="rounded-full bg-success-soft/15 px-3 py-1 text-sm font-medium text-success-soft">
          Recomendado
        </span>
      </div>
    </div>
  );
}
