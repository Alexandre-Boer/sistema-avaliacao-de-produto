import { StarIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

const POSITIONS = [1, 2, 3, 4, 5];

/** Nota de 1 a 5 em estrelas, só leitura. Lida como "Nota N de 5". */
export function ScoreStars({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Nota ${score} de 5`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {POSITIONS.map((position) => (
        <StarIcon
          key={position}
          aria-hidden="true"
          weight={position <= score ? "fill" : "regular"}
          className={cn(
            "size-4",
            position <= score ? "text-primary" : "text-input",
          )}
        />
      ))}
    </span>
  );
}
