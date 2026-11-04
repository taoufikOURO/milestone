const shadow =
  "shadow-[0_20px_40px_-16px_color-mix(in_srgb,var(--color-text-primary)_30%,transparent)]";

function PromoCalendarMock() {
  const days = Array.from({ length: 21 }, (_, i) => i + 1);
  const marked = new Set([4, 9, 15]);
  return (
    <div className={`w-full rounded-2xl border border-border-soft bg-background p-4 ${shadow}`}>
      <p className="text-sm font-bold text-text-primary">Calendrier de la promo</p>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs text-text-secondary">
        {days.map((d) => (
          <span
            key={d}
            className={`rounded-md py-1.5 ${
              marked.has(d) ? "bg-accent font-semibold text-background" : "bg-border-soft/40"
            }`}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

function GroupProgressMock() {
  const rows = [
    { label: "Maquettes", value: 80 },
    { label: "Rapport", value: 45 },
    { label: "Soutenance", value: 15 },
  ];
  return (
    <div className={`w-full rounded-2xl border border-border-soft bg-background p-4 ${shadow}`}>
      <p className="text-sm font-bold text-text-primary">Avancement du groupe</p>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>{r.label}</span>
              <span>{r.value} %</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-border-soft">
              <div className="h-2 rounded-full bg-accent" style={{ width: `${r.value}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TaskMock() {
  return (
    <div className={`w-full rounded-2xl border border-border-soft bg-border-soft/40 p-4 ${shadow}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Tâche</p>
      <p className="mt-1 text-sm font-bold text-text-primary">Rédiger l’introduction</p>
      <p className="mt-1 text-xs text-text-secondary">Échéance : vendredi</p>
      <span className="mt-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-background">
        En cours
      </span>
    </div>
  );
}

export function FloatingCards() {
  return (
    <div
      aria-hidden
      className="mx-auto mt-14 grid w-full max-w-4xl grid-cols-1 items-center gap-5 px-4 sm:grid-cols-3"
    >
      <div className="sm:-rotate-3 sm:translate-y-4">
        <PromoCalendarMock />
      </div>
      <div className="sm:rotate-1">
        <GroupProgressMock />
      </div>
      <div className="sm:rotate-3 sm:translate-y-6">
        <TaskMock />
      </div>
    </div>
  );
}
