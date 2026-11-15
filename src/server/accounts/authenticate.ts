import { verifyPassword } from "@/lib/password";
import type { Session } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SignInInput } from "@/lib/validation/sign-in";

/**
 * Hash bcrypt (custo 10, igual ao do cadastro) de uma senha que ninguém usa.
 * Quando a conta não existe ou está inativa, a senha informada é comparada
 * contra ele para que a resposta leve o mesmo tempo de uma senha incorreta,
 * sem revelar pelo tempo de resposta quais e-mails têm conta.
 */
const DUMMY_HASH =
  "$2b$10$9DyZToCf56/CjdBI1LVPVe1N.7tLsIL1unejhijeaxWM/6gEaGERW";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("E-mail ou senha inválidos");
    this.name = "InvalidCredentialsError";
  }
}

type AccountRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  active: boolean;
};

export async function authenticate(input: SignInInput): Promise<Session> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, first_name, last_name, email, password, active")
    .eq("email", input.email)
    .maybeSingle<AccountRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.active) {
    await verifyPassword(input.password, DUMMY_HASH);
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await verifyPassword(input.password, data.password);
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return {
    accountId: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
  };
}
