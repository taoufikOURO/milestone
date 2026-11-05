import { CircleAlert, CircleCheck, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const TONES = {
  error: { box: "border-accent/30 bg-accent-soft text-text-primary", icon: "text-accent", Icon: CircleAlert },
  info: { box: "border-line bg-surface text-text-secondary", icon: "text-text-secondary", Icon: Info },
  success: { box: "border-line bg-surface text-text-primary", icon: "text-accent", Icon: CircleCheck },
} as const;

/** Message de formulaire ou de page : une icône, une phrase. Les erreurs sont annoncées (role="alert"). */
export function Alert({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof TONES;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const t = TONES[tone];
  const Icon = icon ?? t.Icon;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-control border px-3.5 py-2.5 text-sm leading-relaxed ${t.box}`}
    >
      <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${t.icon}`} />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
