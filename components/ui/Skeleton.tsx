/** Bloc de chargement : mêmes teintes et mêmes rayons que les cartes. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-control bg-border-soft/50 ${className}`} />;
}

/** Carte de chargement pleine largeur (pages sous <Suspense>). */
export function CardSkeleton({ className = "h-40" }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement"
      className={`animate-pulse rounded-card border border-line bg-surface ${className}`}
    />
  );
}
