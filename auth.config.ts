import type { NextAuthConfig } from "next-auth";

/**
 * Partie de la configuration sans base de données ni argon2, partagée avec
 * proxy.ts. Le JWT ne contient que l'identifiant de l'utilisateur : les droits
 * (email validé, rôles) sont toujours relus en base par les guards.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/connexion" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
