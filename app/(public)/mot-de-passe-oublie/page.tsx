import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { AuthShell } from "@/components/auth/ui";

export const metadata: Metadata = { title: "Mot de passe oublié · Milestone" };

export default function MotDePasseOubliePage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Saisissez votre adresse email : vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={
        <Link href="/connexion" className="font-medium text-text-primary underline">
          Retour à la connexion
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
