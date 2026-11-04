import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ResendVerificationForm } from "@/components/auth/forms";
import { AuthShell } from "@/components/auth/ui";
import { signOutAction } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/guards";
import { HOME_PATH } from "@/lib/routes";

export const metadata: Metadata = { title: "Validez votre email · Milestone" };

export default function VerifierEmailPage() {
  return (
    <AuthShell title="Validez votre adresse email">
      <Suspense fallback={<p className="text-sm text-text-secondary">Chargement…</p>}>
        <VerifyContent />
      </Suspense>
    </AuthShell>
  );
}

async function VerifyContent() {
  // Relu en base : un JWT ne suffit pas à savoir si l'email est validé.
  const user = await requireUser();
  if (user.emailVerifiedAt) redirect(HOME_PATH);
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Un lien de validation a été envoyé à{" "}
        <strong className="text-text-primary">{user.email}</strong>. Tant que votre adresse
        n&apos;est pas validée, vous ne pouvez effectuer aucune action dans Milestone.
      </p>
      <ResendVerificationForm />
      <form action={signOutAction}>
        <button type="submit" className="w-full text-sm text-text-secondary underline">
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
