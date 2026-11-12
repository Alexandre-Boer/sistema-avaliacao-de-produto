import Link from "next/link";
import { EvaluationPreview } from "@/components/brand/evaluation-preview";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="brand-panel flex min-h-svh flex-1 flex-col">
      <header className="px-6 py-6 lg:px-14">
        <Wordmark />
      </header>

      <section className="flex flex-1 items-center px-6 pb-20 lg:px-14">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div className="max-w-xl">
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance lg:text-6xl">
              Avalie produtos com critério, não com achismo.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
              Defina critérios, registre notas e chegue a um veredito claro.
              Todo julgamento fica documentado e comparável.
            </p>
            <Button
              asChild
              className="mt-10 h-12 rounded-md bg-signal px-7 text-base font-semibold text-deep shadow-sm hover:bg-signal/90"
            >
              <Link href="/auth/sign-up">Criar conta</Link>
            </Button>
          </div>

          <div className="flex justify-center lg:justify-end">
            <EvaluationPreview />
          </div>
        </div>
      </section>
    </main>
  );
}
