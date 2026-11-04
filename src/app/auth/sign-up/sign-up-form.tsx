"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { type SignUpInput, signUpSchema } from "@/lib/validation/sign-up";

const FALLBACK_ERROR = "Não foi possível criar sua conta. Tente novamente.";

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

export function SignUpForm() {
  const router = useRouter();

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

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      noValidate
    >
      <FieldGroup>
        {mutation.isError && (
          <Alert variant="destructive">
            <AlertTitle>Erro ao criar conta</AlertTitle>
            <AlertDescription>
              {mutation.error instanceof Error
                ? mutation.error.message
                : FALLBACK_ERROR}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.firstName)}>
            <FieldLabel htmlFor="firstName">Nome</FieldLabel>
            <Input
              id="firstName"
              autoComplete="given-name"
              aria-invalid={Boolean(errors.firstName)}
              {...register("firstName")}
            />
            {errors.firstName && <FieldError errors={[errors.firstName]} />}
          </Field>

          <Field data-invalid={Boolean(errors.lastName)}>
            <FieldLabel htmlFor="lastName">Sobrenome</FieldLabel>
            <Input
              id="lastName"
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
              {...register("lastName")}
            />
            {errors.lastName && <FieldError errors={[errors.lastName]} />}
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email && <FieldError errors={[errors.email]} />}
        </Field>

        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password && <FieldError errors={[errors.password]} />}
        </Field>

        <Field data-invalid={Boolean(errors.passwordConfirmation)}>
          <FieldLabel htmlFor="passwordConfirmation">
            Confirmação de senha
          </FieldLabel>
          <Input
            id="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.passwordConfirmation)}
            {...register("passwordConfirmation")}
          />
          {errors.passwordConfirmation && (
            <FieldError errors={[errors.passwordConfirmation]} />
          )}
        </Field>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Criando conta…" : "Criar conta"}
        </Button>
      </FieldGroup>
    </form>
  );
}
