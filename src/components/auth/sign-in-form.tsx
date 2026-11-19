"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/http/post-json";
import { type SignInInput, signInSchema } from "@/lib/validation/sign-in";

const FALLBACK_ERROR = "Não foi possível entrar. Tente novamente.";

const inputClassName =
  "h-11 rounded-md border-input bg-card px-3.5 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/40";

const labelClassName = "text-sm font-medium";

function signIn(input: SignInInput): Promise<void> {
  return postJson("/api/v1/sign-in", input, FALLBACK_ERROR);
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

export function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: () => {
      router.push("/");
      // O cabeçalho é um Server Component: sem o refresh ele continuaria
      // mostrando "Entrar" a partir do cache do roteador.
      router.refresh();
    },
  });

  const toggleLabel = showPassword ? "Ocultar senha" : "Mostrar senha";
  // Depois do 200 a navegação ainda leva um instante: o botão continua
  // desabilitado para o formulário não ser enviado uma segunda vez.
  const isSubmitting = mutation.isPending || mutation.isSuccess;

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
      <FieldGroup className="gap-5">
        {mutation.isError && (
          <Alert
            variant="destructive"
            className="rounded-md border-destructive/40 bg-destructive/5 px-4 py-3"
          >
            <AlertTitle className="text-sm">Não foi possível entrar</AlertTitle>
            <AlertDescription className="text-sm">
              {mutation.error instanceof Error
                ? mutation.error.message
                : FALLBACK_ERROR}
            </AlertDescription>
          </Alert>
        )}

        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email" className={labelClassName}>
            E-mail
          </FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="ana@empresa.com.br"
            className={inputClassName}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <FieldError id="email-error" errors={[errors.email]} />
          )}
        </Field>

        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password" className={labelClassName}>
            Senha
          </FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={`${inputClassName} pr-11`}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={toggleLabel}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {errors.password && (
            <FieldError id="password-error" errors={[errors.password]} />
          )}
        </Field>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 h-11 w-full rounded-md text-[15px] font-semibold shadow-sm"
        >
          {isSubmitting ? "Entrando…" : "Entrar"}
        </Button>

        <p className="text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link
            href="/auth/sign-up"
            className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            Criar conta
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
