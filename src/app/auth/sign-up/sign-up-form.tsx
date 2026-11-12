"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type SignUpInput, signUpSchema } from "@/lib/validation/sign-up";

const FALLBACK_ERROR = "Não foi possível criar sua conta. Tente novamente.";

const inputClassName =
  "h-11 rounded-md border-input bg-card px-3.5 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/40";

const labelClassName = "text-sm font-medium";

async function signUp(input: SignUpInput): Promise<void> {
  const response = await fetch("/api/v1/sign-up", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? FALLBACK_ERROR);
  }
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

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-success"
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: () => router.push("/auth/sign-up/success"),
  });

  const passwordType = showPassword ? "text" : "password";
  const toggleLabel = showPassword ? "Ocultar senha" : "Mostrar senha";

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
      <FieldGroup className="gap-5">
        {mutation.isError && (
          <Alert
            variant="destructive"
            className="rounded-md border-destructive/40 bg-destructive/5 px-4 py-3"
          >
            <AlertTitle className="text-sm">Erro ao criar conta</AlertTitle>
            <AlertDescription className="text-sm">
              {mutation.error instanceof Error
                ? mutation.error.message
                : FALLBACK_ERROR}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.firstName)}>
            <FieldLabel htmlFor="firstName" className={labelClassName}>
              Nome
            </FieldLabel>
            <Input
              id="firstName"
              autoComplete="given-name"
              className={inputClassName}
              aria-invalid={Boolean(errors.firstName)}
              {...register("firstName")}
            />
            {errors.firstName && <FieldError errors={[errors.firstName]} />}
          </Field>

          <Field data-invalid={Boolean(errors.lastName)}>
            <FieldLabel htmlFor="lastName" className={labelClassName}>
              Sobrenome
            </FieldLabel>
            <Input
              id="lastName"
              autoComplete="family-name"
              className={inputClassName}
              aria-invalid={Boolean(errors.lastName)}
              {...register("lastName")}
            />
            {errors.lastName && <FieldError errors={[errors.lastName]} />}
          </Field>
        </div>

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
            {...register("email")}
          />
          {errors.email && <FieldError errors={[errors.email]} />}
        </Field>

        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password" className={labelClassName}>
            Senha
          </FieldLabel>
          <div className="relative">
            <Input
              id="password"
              type={passwordType}
              autoComplete="new-password"
              className={`${inputClassName} pr-11`}
              aria-invalid={Boolean(errors.password)}
              aria-describedby="password-hint"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={toggleLabel}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {errors.password ? (
            <FieldError errors={[errors.password]} />
          ) : (
            <FieldDescription id="password-hint" className="text-sm">
              Pelo menos 8 caracteres.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={Boolean(errors.passwordConfirmation)}>
          <FieldLabel htmlFor="passwordConfirmation" className={labelClassName}>
            Confirmação de senha
          </FieldLabel>
          <Input
            id="passwordConfirmation"
            type={passwordType}
            autoComplete="new-password"
            className={inputClassName}
            aria-invalid={Boolean(errors.passwordConfirmation)}
            {...register("passwordConfirmation")}
          />
          {errors.passwordConfirmation && (
            <FieldError errors={[errors.passwordConfirmation]} />
          )}
        </Field>

        <Button
          type="submit"
          disabled={mutation.isPending}
          className="mt-1 h-11 w-full rounded-md text-[15px] font-semibold shadow-sm"
        >
          {mutation.isPending ? "Criando conta…" : "Criar conta"}
        </Button>

        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <LockIcon />
          <span>
            Sua senha é guardada como hash criptográfico, nunca em texto puro.
          </span>
        </p>
      </FieldGroup>
    </form>
  );
}
