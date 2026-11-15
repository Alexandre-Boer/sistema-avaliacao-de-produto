import Link from "next/link";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

/**
 * Lê a sessão do cookie, então só pode ser renderizado dentro de um
 * `<Suspense>` (exigência do `cacheComponents`).
 */
export async function UserArea() {
  const session = await getSession();

  if (!session) {
    return (
      <Button asChild variant="outline" className="h-9 rounded-md px-4 text-sm">
        <Link href="/auth/sign-in">Entrar</Link>
      </Button>
    );
  }

  return <UserMenu session={session} />;
}
