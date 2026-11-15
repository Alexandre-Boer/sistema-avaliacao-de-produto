import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Informe um e-mail válido" })),
  // Só exige presença: a regra de tamanho pertence ao cadastro, e repeti-la
  // aqui revelaria o formato esperado da senha.
  password: z.string().min(1, { message: "Informe sua senha" }),
});

export type SignInInput = z.infer<typeof signInSchema>;
