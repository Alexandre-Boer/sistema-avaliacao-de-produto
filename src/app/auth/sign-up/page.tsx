import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/app/auth/sign-up/sign-up-form";
import { EvaluationPreview } from "@/components/brand/evaluation-preview";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = {
  title: "Criar conta — Sistema de Avaliação de Produto",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-svh flex-1 flex-col lg:flex-row">
      <section className="brand-panel flex flex-col gap-10 px-6 py-8 lg:w-[46%] lg:justify-between lg:px-14 lg:py-10">
        <Wordmark />

        <div className="flex flex-col gap-10">
          <div className="max-w-md">
            <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight text-balance lg:text-5xl">
              Todo produto merece um julgamento justo.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-white/70">
              Registre avaliações com critérios claros, compare resultados e
              decida com base em dados, não em achismo.
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
            Criar conta
          </h2>
          <p className="mt-2 mb-8 text-base text-muted-foreground">
            Leva menos de um minuto.
          </p>
          <SignUpForm />
          <p className="mt-6 text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              href="/auth/sign-in"
              className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
