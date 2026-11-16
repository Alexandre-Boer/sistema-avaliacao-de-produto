"use client";

import { StarIcon } from "@phosphor-icons/react";
import { useState } from "react";
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
  error?: boolean;
};

/**
 * Seletor de nota: cinco rádios nativos (as setas do teclado funcionam sem
 * código extra) escondidos visualmente; cada `label` desenha a sua estrela.
 */
export function StarRating({ value, onChange, name, error }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const highlighted = hovered || value;

  return (
    <fieldset aria-invalid={error || undefined} className="min-w-0">
      <legend
        className={cn("text-sm font-medium", error && "text-destructive")}
      >
        Nota
      </legend>
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
                  : error
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
    </fieldset>
  );
}
