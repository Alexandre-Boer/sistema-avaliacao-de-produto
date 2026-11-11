import { z } from "zod";

export const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1, { message: "Informe seu nome" }),
    lastName: z.string().trim().min(1, { message: "Informe seu sobrenome" }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email({ message: "Informe um e-mail válido" })),
    password: z
      .string()
      .min(8, { message: "A senha deve ter pelo menos 8 caracteres" }),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem",
    path: ["passwordConfirmation"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
