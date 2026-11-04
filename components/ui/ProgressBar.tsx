/** Barre d'avancement (§4.7, §5.1) : fond #ccc5b9, remplissage #eb5e28. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2.5 w-full overflow-hidden rounded-full bg-border-soft"
    >
      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}
