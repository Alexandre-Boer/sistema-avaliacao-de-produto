"use client";

import { StarIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const OPTIONS = [1, 2, 3, 4, 5];

const DESCRIPTIONS: Record<number, string> = {
  1: "Muito ruim",
  2: "Ruim",
  3: "Regular",
  4: "Bom",
  5: "Excelente",
};

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
  name: string;
  /** Mensagem de erro de validação; com ela o grupo é anunciado como inválido. */
  error?: string;
};

/**
 * Seletor de nota: cinco rádios nativos (as setas do teclado funcionam sem
 * código extra) escondidos visualmente; cada `label` desenha a sua estrela.
 *
 * O grupo é um `radiogroup` e não um `fieldset`: `aria-invalid` não é suportado
 * no role `group`. A mensagem de erro fica ligada por `aria-describedby` ao
 * grupo e a cada rádio, então o leitor de tela anuncia o estado inválido e o
 * motivo tanto ao entrar no grupo quanto ao focar uma estrela.
 */
export function StarRating({ value, onChange, name, error }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const labelId = useId();
  const errorId = useId();
  const highlighted = hovered || value;
  const invalid = Boolean(error);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-required="true"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        className="min-w-0"
      >
        <span
          id={labelId}
          className={cn(
            "block text-sm font-medium",
            invalid && "text-destructive",
          )}
        >
          Nota
        </span>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex gap-1">
            {OPTIONS.map((option) => (
              <label
                key={option}
                onPointerEnter={() => setHovered(option)}
                onPointerLeave={() => setHovered(0)}
                className={cn(
                  "flex size-11 cursor-pointer items-center justify-center rounded-md transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60",
                  option <= highlighted
                    ? "text-primary"
                    : invalid
                      ? "text-destructive/50"
                      : "text-input",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? errorId : undefined}
                  className="sr-only"
                />
                <StarIcon
                  aria-hidden="true"
                  weight={option <= highlighted ? "fill" : "regular"}
                  className="size-8"
                />
                <span className="sr-only">
                  {option === 1 ? "1 estrela" : `${option} estrelas`}
                </span>
              </label>
            ))}
          </div>
          <span aria-hidden="true" className="text-sm text-muted-foreground">
            {highlighted
              ? DESCRIPTIONS[highlighted]
              : "Escolha de 1 a 5 estrelas"}
          </span>
        </div>
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
