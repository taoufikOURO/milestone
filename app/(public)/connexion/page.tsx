import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/forms";
import { AuthShell } from "@/components/auth/ui";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextLink } from "@/components/ui/TextLink";
import { SESSION_EXPIRED_MESSAGE } from "@/lib/auth/session";
import { safeCallbackPath } from "@/lib/routes";

export const metadata: Metadata = { title: "Connexion · Milestone" };

export default function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <AuthShell
      title="Se connecter"
      footer={
        <>
          Pas encore de compte ?{" "}
          <TextLink href="/inscription">Créer un compte</TextLink>
        </>
      }
    >
      {/* Squelette (et non le formulaire) : un formulaire de secours serait remplacé par le vrai et perdrait la saisie. */}
      <Suspense fallback={<SignInSkeleton />}>
        <ConnexionContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

function SignInSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement" className="space-y-4">
      <Skeleton className="h-[4.6rem]" />
      <Skeleton className="h-[4.6rem]" />
      <Skeleton className="h-10" />
    </div>
  );
}

async function ConnexionContent({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl) ?? undefined;
  return (
    <div className="space-y-4">
      {params.inscription === "ok" ? (
        <Alert tone="success">
          Compte créé. Un email de confirmation vient d&apos;être envoyé : connectez-vous, puis
          validez votre adresse grâce au lien reçu.
        </Alert>
      ) : null}
      {params.session === "expiree" ? <Alert tone="info" icon={Clock}>
          {SESSION_EXPIRED_MESSAGE}
        </Alert> : null}
      {params.reinitialisation === "ok" ? (
        <Alert tone="success">Mot de passe modifié. Vous pouvez vous connecter.</Alert>
      ) : null}
      <SignInForm callbackUrl={callbackUrl} />
    </div>
  );
}
