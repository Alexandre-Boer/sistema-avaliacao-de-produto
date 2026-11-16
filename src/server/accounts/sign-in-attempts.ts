import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Limite de tentativas de senha por e-mail, guardado em `sign_in_attempts`.
 *
 * Cada falha de credenciais vira uma linha, exista ou não a conta: se só
 * e-mails cadastrados fossem bloqueados, o bloqueio revelaria quais são eles.
 *
 * Nenhuma função daqui lança: se o banco falhar ao registrar ou consultar as
 * tentativas, o erro é logado e o login segue sem o limite, em vez de ficar
 * fora do ar por causa de uma proteção auxiliar.
 */
export const MAX_FAILED_SIGN_INS = 5;
export const SIGN_IN_WINDOW_MS = 15 * 60_000;

const TABLE = "sign_in_attempts";

export type SignInBlock = {
  /** Segundos até uma nova tentativa ser aceita (valor do `Retry-After`). */
  retryAfterSeconds: number;
};

/**
 * Devolve o bloqueio quando o e-mail já acumulou o máximo de falhas na janela,
 * ou `null` quando a tentativa pode seguir.
 */
export async function getSignInBlock(
  email: string,
): Promise<SignInBlock | null> {
  try {
    const now = Date.now();
    const windowStart = new Date(now - SIGN_IN_WINDOW_MS).toISOString();

    const { data, error } = await createAdminClient()
      .from(TABLE)
      .select("created_at")
      .eq("email", email)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(MAX_FAILED_SIGN_INS);

    if (error) {
      throw new Error(error.message);
    }

    const recent = (data ?? []) as { created_at: string }[];
    if (recent.length < MAX_FAILED_SIGN_INS) {
      return null;
    }

    // O bloqueio termina quando a mais antiga das N falhas mais recentes sai
    // da janela: a partir daí restam menos de N falhas dentro dela.
    const oldest = new Date(recent[recent.length - 1].created_at).getTime();
    const remainingMs = oldest + SIGN_IN_WINDOW_MS - now;
    return { retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) };
  } catch (error) {
    console.error("Erro ao consultar tentativas de login:", error);
    return null;
  }
}

export async function recordFailedSignIn(email: string): Promise<void> {
  try {
    const { error } = await createAdminClient().from(TABLE).insert({ email });
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error("Erro ao registrar tentativa de login:", error);
  }
}

export async function clearFailedSignIns(email: string): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from(TABLE)
      .delete()
      .eq("email", email);
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error("Erro ao limpar tentativas de login:", error);
  }
}
