import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/forms";
import { AuthShell } from "@/components/auth/ui";
import { TextLink } from "@/components/ui/TextLink";

export const metadata: Metadata = { title: "Inscription · Milestone" };

export default function InscriptionPage() {
  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Un email de confirmation vous sera envoyé."
      footer={
        <>
          Déjà inscrit ?{" "}
          <TextLink href="/connexion">Se connecter</TextLink>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
