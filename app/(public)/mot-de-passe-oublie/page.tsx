import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { AuthShell } from "@/components/auth/ui";
import { TextLink } from "@/components/ui/TextLink";

export const metadata: Metadata = { title: "Mot de passe oublié · Milestone" };

export default function MotDePasseOubliePage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Saisissez votre adresse email : vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={
        <TextLink href="/connexion">Retour à la connexion</TextLink>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
