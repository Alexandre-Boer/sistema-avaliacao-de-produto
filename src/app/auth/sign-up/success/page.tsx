import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Conta criada — Sistema de Avaliação de Produto",
};

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">
            Conta criada
          </CardTitle>
          <CardDescription>
            Sua conta foi criada com sucesso. Você já pode usar a plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Ir para a página inicial</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
