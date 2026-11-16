import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Bloco exibido no lugar do formulário para quem não está autenticado. */
export function AuthRequired() {
  return (
    <Card className="rounded-xl text-sm [--card-spacing:--spacing(6)]">
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight">
            Entre na sua conta para avaliar este produto.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Qualquer pessoa pode ler as avaliações; para escrever a sua, é
            preciso entrar.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button
            asChild
            className="h-11 rounded-md px-5 text-[15px] font-semibold"
          >
            <Link href="/auth/sign-in">Entrar</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-md px-5 text-[15px] font-semibold"
          >
            <Link href="/auth/sign-up">Criar conta</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
