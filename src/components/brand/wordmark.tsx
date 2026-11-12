import Link from "next/link";
import { cn } from "@/lib/utils";

type WordmarkProps = {
  className?: string;
};

/**
 * Marca: um quadrado com três barras de comprimentos crescentes,
 * a mesma linguagem visual das barras de nota usadas nas avaliações.
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md text-sm font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        width="28"
        height="28"
        viewBox="0 0 28 28"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="7" className="fill-signal" />
        <rect x="7" y="8" width="8" height="3" rx="1.5" className="fill-deep" />
        <rect
          x="7"
          y="12.5"
          width="12"
          height="3"
          rx="1.5"
          className="fill-deep"
        />
        <rect
          x="7"
          y="17"
          width="15"
          height="3"
          rx="1.5"
          className="fill-deep"
        />
      </svg>
      <span>Sistema de Avaliação de Produto</span>
    </Link>
  );
}
