import type { NextAuthConfig } from "next-auth";
import { applySignIn } from "@/lib/auth/session";

/**
 * Partie de la configuration sans base de données ni argon2, partagée avec
 * proxy.ts. Le JWT ne contient que l'identifiant de l'utilisateur et l'instant
 * de connexion (authTime) : les droits (email validé, mot de passe changé
 * depuis, rôles) sont toujours relus en base par auth.ts et les guards.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/connexion" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` n'est présent qu'à la connexion : authTime n'est posé qu'une fois.
      if (user?.id) return applySignIn(token, user.id);
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.authTime = token.authTime;
      return session;
    },
  },
} satisfies NextAuthConfig;
