import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";
import { EvaluationPreview } from "@/components/brand/evaluation-preview";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = {
  title: "Entrar — Sistema de Avaliação de Produto",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-svh flex-1 flex-col lg:flex-row">
      <section className="brand-panel flex flex-col gap-10 px-6 py-8 lg:w-[46%] lg:justify-between lg:px-14 lg:py-10">
        <Wordmark />

        <div className="flex flex-col gap-10">
          <div className="max-w-md">
            <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight text-balance lg:text-5xl">
              Suas avaliações estão onde você deixou.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-white/70">
              Entre para avaliar produtos e acompanhar o que outras pessoas
              acharam de cada um.
            </p>
          </div>

          <div className="hidden lg:block">
            <EvaluationPreview />
          </div>
        </div>
      </section>

      <section className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 lg:py-16">
        <div className="mx-auto w-full max-w-[26rem]">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Entrar
          </h2>
          <p className="mt-2 mb-8 text-base text-muted-foreground">
            Use o e-mail e a senha da sua conta.
          </p>
          <SignInForm />
        </div>
      </section>
    </main>
  );
}
