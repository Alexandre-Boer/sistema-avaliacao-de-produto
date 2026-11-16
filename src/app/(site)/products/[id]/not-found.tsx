import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Produto não encontrado
      </h1>
      <p className="max-w-[60ch] text-muted-foreground">
        O endereço pode estar incorreto ou o produto foi removido.
      </p>
      <Button
        asChild
        className="mt-2 h-11 rounded-md px-5 text-[15px] font-semibold"
      >
        <Link href="/">Ver todos os produtos</Link>
      </Button>
    </main>
  );
}
