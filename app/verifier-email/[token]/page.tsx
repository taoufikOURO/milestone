import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/auth/forms";
import { AuthShell } from "@/components/auth/ui";

export const metadata: Metadata = {
  title: "Validation de l'email · Milestone",
  referrer: "no-referrer",
};

// La validation se fait par un bouton (POST) et non à l'ouverture du lien :
// les antivirus de messagerie qui préchargent les liens ne consomment pas le token.
export default function VerifierEmailTokenPage({ params }: PageProps<"/verifier-email/[token]">) {
  return (
    <AuthShell title="Valider votre adresse email" subtitle="Cliquez pour confirmer votre adresse.">
      <Suspense fallback={null}>
        <TokenContent params={params} />
      </Suspense>
    </AuthShell>
  );
}

async function TokenContent({ params }: Pick<PageProps<"/verifier-email/[token]">, "params">) {
  const { token } = await params;
  return <VerifyEmailForm token={token} />;
}
