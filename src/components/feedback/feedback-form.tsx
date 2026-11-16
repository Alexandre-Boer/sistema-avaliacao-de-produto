"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
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

type FeedbackFormValues = z.input<typeof feedbackSchema>;

class FeedbackRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "FeedbackRequestError";
    this.status = status;
  }
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

export function FeedbackForm({ productId }: { productId: string }) {
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FeedbackFormValues, unknown, FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { score: 0, comment: "" },
  });

  const mutation = useMutation({
    mutationFn: (input: FeedbackInput) => sendFeedback(productId, input),
    onSuccess: () => {
      reset();
      // A lista é renderizada no servidor: o refresh traz a página já com a nova avaliação.
      router.refresh();
    },
  });

  const commentLength = watch("comment")?.length ?? 0;
  const sessionExpired =
    mutation.error instanceof FeedbackRequestError &&
    mutation.error.status === 401;

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
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

        <div className="flex flex-col gap-2">
          <Controller
            control={control}
            name="score"
            render={({ field }) => (
              <StarRating
                name={field.name}
                value={Number(field.value) || 0}
                onChange={field.onChange}
                error={Boolean(errors.score)}
              />
            )}
          />
          {errors.score && <FieldError errors={[errors.score]} />}
        </div>

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
            aria-describedby="comment-count"
            {...register("comment")}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {errors.comment && <FieldError errors={[errors.comment]} />}
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

        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-11 rounded-md px-6 text-[15px] font-semibold shadow-sm"
          >
            {mutation.isPending ? "Enviando…" : "Enviar avaliação"}
          </Button>
          {mutation.isSuccess && (
            <output className="text-sm font-medium text-success">
              Avaliação enviada.
            </output>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
