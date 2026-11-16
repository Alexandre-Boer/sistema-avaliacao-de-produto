"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { AlreadyReviewed } from "@/components/feedback/already-reviewed";
import { StarRating } from "@/components/feedback/star-rating";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_COMMENT_MAX_LENGTH,
  type FeedbackInput,
  feedbackSchema,
} from "@/lib/validation/feedback";

const FALLBACK_ERROR =
  "Não foi possível enviar sua avaliação. Tente novamente.";

const UNAUTHORIZED = 401;
const CONFLICT = 409;

type FeedbackFormValues = z.input<typeof feedbackSchema>;

class FeedbackRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "FeedbackRequestError";
    this.status = status;
  }
}

function hasStatus(error: unknown, status: number): boolean {
  return error instanceof FeedbackRequestError && error.status === status;
}

async function sendFeedback(
  productId: string,
  input: FeedbackInput,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/products/${productId}/feedbacks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new FeedbackRequestError(FALLBACK_ERROR);
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new FeedbackRequestError(
      data?.error ?? FALLBACK_ERROR,
      response.status,
    );
  }
}

export function FeedbackForm({
  productId,
  authorName,
}: {
  productId: string;
  authorName: string;
}) {
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FeedbackFormValues, unknown, FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { score: 0, comment: "" },
  });

  const mutation = useMutation({
    mutationFn: (input: FeedbackInput) => sendFeedback(productId, input),
    // A lista é renderizada no servidor: o refresh traz a página já com a nova avaliação.
    onSuccess: () => router.refresh(),
    onError: (error) => {
      // A conta já avaliou (em outra aba, por exemplo): a lista também está desatualizada.
      if (hasStatus(error, CONFLICT)) {
        router.refresh();
      }
    },
  });

  // Cada conta avalia um produto uma única vez. Enviada a avaliação (ou
  // recusada por já existir), o formulário dá lugar ao aviso: não sobra estado
  // em que a confirmação de envio apareça junto com erros de validação.
  const alreadyReviewed = hasStatus(mutation.error, CONFLICT);
  if (mutation.isSuccess || alreadyReviewed) {
    return (
      <output className="block">
        <AlreadyReviewed justSent={mutation.isSuccess} />
      </output>
    );
  }

  const commentLength = watch("comment")?.length ?? 0;
  const sessionExpired = hasStatus(mutation.error, UNAUTHORIZED);

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
      <p className="mb-6 text-sm text-muted-foreground">
        Você está avaliando como {authorName}.
      </p>
      <FieldGroup className="gap-6">
        {mutation.isError && (
          <Alert
            variant="destructive"
            className="rounded-md border-destructive/40 bg-destructive/5 px-4 py-3"
          >
            <AlertTitle className="text-sm">Não foi possível enviar</AlertTitle>
            <AlertDescription className="text-sm">
              {mutation.error.message || FALLBACK_ERROR}
              {sessionExpired && (
                <>
                  {" "}
                  <Link href="/auth/sign-in" className="font-medium">
                    Entrar
                  </Link>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Controller
          control={control}
          name="score"
          render={({ field }) => (
            <StarRating
              name={field.name}
              value={Number(field.value) || 0}
              onChange={field.onChange}
              error={errors.score?.message}
            />
          )}
        />

        <Field data-invalid={Boolean(errors.comment)}>
          <FieldLabel htmlFor="comment" className="text-sm font-medium">
            Comentário
          </FieldLabel>
          <Textarea
            id="comment"
            rows={4}
            placeholder="O que funcionou bem? O que poderia ser melhor?"
            className="min-h-28 rounded-md border-input bg-card px-3.5 py-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"
            aria-invalid={Boolean(errors.comment)}
            aria-describedby={
              errors.comment ? "comment-error comment-count" : "comment-count"
            }
            {...register("comment")}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {errors.comment && (
                <FieldError id="comment-error" errors={[errors.comment]} />
              )}
            </div>
            <FieldDescription
              id="comment-count"
              className={
                commentLength > FEEDBACK_COMMENT_MAX_LENGTH
                  ? "shrink-0 text-xs tabular-nums text-destructive"
                  : "shrink-0 text-xs tabular-nums"
              }
            >
              {commentLength}/{FEEDBACK_COMMENT_MAX_LENGTH}
            </FieldDescription>
          </div>
        </Field>

        <div>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-11 rounded-md px-6 text-[15px] font-semibold shadow-sm"
          >
            {mutation.isPending ? "Enviando…" : "Enviar avaliação"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
