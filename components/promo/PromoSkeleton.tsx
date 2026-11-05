import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";

// Squelette des pages promo, affiché pendant la lecture de la session et de la base.
export function PromoSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton className="h-44" />
        <CardSkeleton className="h-44" />
      </div>
    </div>
  );
}
