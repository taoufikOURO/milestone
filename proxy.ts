import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { proxyRedirect } from "@/lib/routes";

// Redirections de confort uniquement. Aucun contrôle de sécurité ici : chaque
// page, server action et service vérifie lui-même l'utilisateur en base
// (requireUser / requireVerifiedUser). Le proxy ne lit que la présence d'un JWT.
const { auth } = NextAuth(authConfig);

export const proxy = auth((request) => {
  const { pathname, search } = request.nextUrl;
  const target = proxyRedirect(pathname, search, Boolean(request.auth?.user));
  return target ? NextResponse.redirect(new URL(target, request.nextUrl)) : NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
