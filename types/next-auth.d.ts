import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
    /** Instant de connexion (ms), comparé à users.password_changed_at. */
    authTime?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Instant de connexion (ms), posé une seule fois, à la connexion. */
    authTime?: number;
  }
}
