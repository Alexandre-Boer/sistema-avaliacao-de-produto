import { StarIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

const POSITIONS = [1, 2, 3, 4, 5];

const scoreFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

/** Quanto da estrela de uma posição fica preenchido (0 a 1) para a nota dada. */
function fillOf(position: number, score: number): number {
  const fill = Math.min(1, Math.max(0, score - (position - 1)));
  // Duas casas bastam e escondem o resíduo de ponto flutuante (3.7 - 3 = 0.7000000000000002).
  return Math.round(fill * 100) / 100;
}

/**
 * Nota de 0 a 5 em estrelas, só leitura. Lida como "Nota N de 5". Aceita nota
 * fracionária (a média): a estrela da vez é preenchida só em parte, então 4,5
 * aparece como quatro estrelas cheias e meia.
 */
export function ScoreStars({
  score,
  className,
  ...props
}: {
  score: number;
  className?: string;
} & Omit<React.ComponentProps<"span">, "role" | "aria-label" | "children">) {
  return (
    <span
      role="img"
      aria-label={`Nota ${scoreFormatter.format(score)} de 5`}
      className={cn("inline-flex items-center gap-0.5", className)}
      {...props}
    >
      {POSITIONS.map((position) => {
        const fill = fillOf(position, score);
        return (
          <span
            key={position}
            data-fill={fill}
            className="relative inline-flex size-4"
          >
            {fill < 1 && (
              <StarIcon
                aria-hidden="true"
                weight="regular"
                className="size-4 text-input"
              />
            )}
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <StarIcon
                  aria-hidden="true"
                  weight="fill"
                  className="size-4 max-w-none text-primary"
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
