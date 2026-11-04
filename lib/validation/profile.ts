import { z } from "zod";
import { nameSchema, PASSWORD_MAX, passwordSchema } from "./auth";

// strictObject : toute clé inconnue est refusée, en particulier `username`
// (non modifiable, §4.1), même si la requête est forgée.
export const updateProfileSchema = z.strictObject({
  firstName: nameSchema("Le prénom"),
  lastName: nameSchema("Le nom"),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel.").max(PASSWORD_MAX),
    newPassword: passwordSchema,
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Le nouveau mot de passe doit être différent de l'ancien.",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
