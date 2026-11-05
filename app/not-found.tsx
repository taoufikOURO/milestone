import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Page introuvable · Milestone" };

// Page affichée quand une route, un groupe ou une tâche n'existe pas (ou n'est pas accessible).
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card tone="panel" className="w-full max-w-md">
        <h1 className="sr-only">Page introuvable</h1>
        <EmptyState icon={Compass} actions={<ButtonLink href="/accueil">Retour à l&apos;accueil</ButtonLink>}>
          Cette page est introuvable, ou vous n&apos;y avez pas accès.
        </EmptyState>
      </Card>
    </main>
  );
}
