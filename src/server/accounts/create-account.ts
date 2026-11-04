import { nanoid } from "nanoid";
import { hashPassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SignUpInput } from "@/lib/validation/sign-up";

const UNIQUE_VIOLATION = "23505";

export class DuplicateEmailError extends Error {
  constructor() {
    super("E-mail já cadastrado");
    this.name = "DuplicateEmailError";
  }
}

export async function createAccount(
  input: SignUpInput,
): Promise<{ id: string }> {
  const id = nanoid();
  const { hash, salt } = await hashPassword(input.password);

  const supabase = createAdminClient();
  const { error } = await supabase.from("accounts").insert({
    id,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    password: hash,
    salt,
    active: true,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new DuplicateEmailError();
    }
    throw new Error(error.message);
  }

  return { id };
}
