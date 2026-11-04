import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/forms";
import { AuthShell } from "@/components/auth/ui";

export const metadata: Metadata = { title: "Inscription · Milestone" };

export default function InscriptionPage() {
  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Un email de confirmation vous sera envoyé."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-medium text-text-primary underline">
            Se connecter
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
