import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { authenticate } from "@/lib/services/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  logger: {
    // Un mauvais mot de passe n'est pas une erreur serveur : pas de trace.
    error(error) {
      if (error.name === "CredentialsSignin") return;
      console.error(error);
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email", label: "Email" },
        password: { type: "password", label: "Mot de passe" },
      },
      // Validation Zod et vérification argon2 dans le service.
      authorize: (credentials) => authenticate(credentials),
    }),
  ],
});
