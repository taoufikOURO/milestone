// Squelette des pages promo, affiché pendant la lecture de la session et de la base.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-border-soft/60 ${className}`} />;
}

export function PromoSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <Bar className="h-8 w-48" />
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border-soft bg-white/60 p-4 sm:p-6">
            <Bar className="h-5 w-32" />
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-5/6" />
            <Bar className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
