import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/forms";
import { Alert, AuthShell } from "@/components/auth/ui";
import { safeCallbackPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Connexion · Milestone" };

export default function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <AuthShell
      title="Se connecter"
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-text-primary underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <Suspense fallback={<SignInForm />}>
        <ConnexionContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function ConnexionContent({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl) ?? undefined;
  return (
    <div className="space-y-4">
      {params.inscription === "ok" ? (
        <Alert tone="info">
          Compte créé. Un email de confirmation vient d&apos;être envoyé : connectez-vous, puis
          validez votre adresse grâce au lien reçu.
        </Alert>
      ) : null}
      {params.reinitialisation === "ok" ? (
        <Alert tone="info">Mot de passe modifié. Vous pouvez vous connecter.</Alert>
      ) : null}
      <SignInForm callbackUrl={callbackUrl} />
    </div>
  );
}
