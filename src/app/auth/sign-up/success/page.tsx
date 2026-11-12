import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Conta criada — Sistema de Avaliação de Produto",
};

function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      className="text-success"
    >
      <circle
        cx="32"
        cy="32"
        r="29"
        stroke="currentColor"
        strokeWidth="2.5"
        className="draw-stroke"
        style={{ "--stroke-length": 183 } as React.CSSProperties}
      />
      <path
        d="M20 33.5l8.5 8.5L45 23"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="draw-stroke [animation-delay:550ms]"
        style={{ "--stroke-length": 40 } as React.CSSProperties}
      />
    </svg>
  );
}

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-svh flex-1 flex-col">
      <header className="px-6 py-6 lg:px-14">
        <Wordmark className="text-foreground" />
      </header>

      <section className="flex flex-1 items-center px-6 pb-24 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <CheckMark />
          <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">
            Conta criada
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Sua conta está pronta. Você já pode começar a avaliar produtos com
            critério.
          </p>
          <Button
            asChild
            className="mt-8 h-11 rounded-md px-6 text-[15px] font-semibold shadow-sm"
          >
            <Link href="/">Ir para a página inicial</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
