import { z } from "zod";

export const PASSWORD_MIN = 8;
// Borne haute pour limiter le coût du hachage sur des entrées énormes.
export const PASSWORD_MAX = 128;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`)
  .max(PASSWORD_MAX, `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX} caractères.`);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Adresse email trop longue.")
  .pipe(z.email("Adresse email invalide."));

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères.")
  .max(30, "Le nom d'utilisateur ne doit pas dépasser 30 caractères.")
  .regex(
    /^[a-z0-9._-]+$/,
    "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points, tirets et tirets bas.",
  );

const nameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} est obligatoire.`)
    .max(100, `${label} ne doit pas dépasser 100 caractères.`);

export const signUpSchema = z.object({
  username: usernameSchema,
  firstName: nameSchema("Le prénom"),
  lastName: nameSchema("Le nom"),
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

// À la connexion, on ne révèle pas les règles : un format invalide donne le
// même message générique qu'un mauvais mot de passe.
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const tokenSchema = z.string().min(20).max(200);

export const resetPasswordSchema = z
  .object({
    token: tokenSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Les deux mots de passe ne correspondent pas.",
  });

export type FieldErrors = Partial<Record<string, string>>;

/** Premier message d'erreur par champ, pour l'affichage dans les formulaires. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
