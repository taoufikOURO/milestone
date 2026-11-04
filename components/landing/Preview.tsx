const features = [
  { title: "Calendrier de promo", text: "Les échéances de tous les groupes au même endroit." },
  { title: "Groupes et tâches", text: "Répartissez le travail et suivez l’avancement." },
  { title: "Réunions", text: "Planifiez les points d’équipe et retrouvez-les au calendrier." },
];
const steps = [
  "Le délégué crée la promo et partage le code.",
  "Les étudiants rejoignent la promo et forment des groupes.",
  "Chaque groupe planifie ses tâches et suit son avancement.",
];

export function Preview() {
  return (
    <>
      <section id="fonctionnalites" className="scroll-mt-24 px-4 py-16">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
          Fonctionnalités
        </h2>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border-soft bg-border-soft/30 p-5"
            >
              <h3 className="font-bold text-text-primary">{f.title}</h3>
              <p className="mt-2 text-sm text-text-secondary">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="comment-ca-marche" className="scroll-mt-24 px-4 py-16">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
          Comment ça marche
        </h2>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s} className="rounded-2xl border border-border-soft bg-background p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-background">
                {i + 1}
              </span>
              <p className="mt-3 text-sm text-text-secondary">{s}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
