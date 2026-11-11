import type { Metadata } from "next";
import { SignUpForm } from "@/app/auth/sign-up/sign-up-form";

export const metadata: Metadata = {
  title: "Criar conta — Sistema de Avaliação de Produto",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-svh flex-1 flex-col lg:flex-row">
      <section className="flex flex-col justify-between gap-10 bg-primary px-8 py-10 text-primary-foreground lg:w-[44%] lg:px-14 lg:py-14">
        <p className="text-sm tracking-tight">
          Sistema de Avaliação de Produto
        </p>
        <h1 className="max-w-md text-3xl font-bold leading-tight tracking-tighter text-balance lg:text-5xl">
          Todo produto merece um julgamento justo.
        </h1>
        <p className="max-w-sm text-sm leading-relaxed opacity-80">
          Crie sua conta para registrar avaliações com critério e acompanhar os
          resultados em um só lugar.
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-14">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight">Criar conta</h2>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">
            Preencha seus dados para começar.
          </p>
          <SignUpForm />
        </div>
      </section>
    </main>
  );
}
