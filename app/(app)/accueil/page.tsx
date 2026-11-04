import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Accueil · Milestone" };

export default function AccueilPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Accueil</h1>
      <Card>
        <p className="text-text-secondary">Aucune promotion.</p>
      </Card>
    </div>
  );
}
