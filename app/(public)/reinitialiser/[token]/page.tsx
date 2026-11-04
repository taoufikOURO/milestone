import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/forms";
import { AuthShell } from "@/components/auth/ui";

export const metadata: Metadata = {
  title: "Nouveau mot de passe · Milestone",
  // Le token est dans l'URL : pas d'envoi du Referer vers d'autres sites.
  referrer: "no-referrer",
};

export default function ReinitialiserPage({ params }: PageProps<"/reinitialiser/[token]">) {
  return (
    <AuthShell title="Choisir un nouveau mot de passe">
      <Suspense fallback={null}>
        <ResetContent params={params} />
      </Suspense>
    </AuthShell>
  );
}

// Le token est vérifié à la soumission (usage unique, expiration), pas à l'affichage.
async function ResetContent({ params }: Pick<PageProps<"/reinitialiser/[token]">, "params">) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
