import { Card, CardContent } from "@/components/ui/card";

/**
 * Bloco exibido no lugar do formulário para quem já avaliou o produto: cada
 * conta avalia um produto uma única vez. Com `justSent`, confirma o envio que
 * acabou de acontecer.
 */
export function AlreadyReviewed({ justSent = false }: { justSent?: boolean }) {
  return (
    <Card className="rounded-xl text-sm [--card-spacing:--spacing(6)]">
      <CardContent>
        <p className="font-display text-lg font-semibold tracking-tight">
          {justSent ? "Avaliação enviada." : "Você já avaliou este produto."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada conta avalia um produto uma única vez. A sua avaliação aparece na
          lista acima.
        </p>
      </CardContent>
    </Card>
  );
}
