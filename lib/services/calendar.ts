import { db } from "@/lib/db";
import { groupProgress } from "@/lib/domain/progress";
import type { Actor } from "@/lib/services/promo";

// Calendrier de la promotion (§5.1). Réservé aux membres de la promo : un
// non-membre (ou un compte non validé) ne reçoit rien.

export type PromoCalendarGroup = {
  id: string;
  name: string;
  startDate: Date;
  /** Deadline du groupe (§5.1) : sa date de fin. */
  deadline: Date;
  /** Avancement en % (§4.7) ; 0 pour un groupe sans tâche. */
  progressPercent: number;
  /** Seuls les membres du groupe peuvent l'ouvrir. */
  isMember: boolean;
};

/** Groupes de la promo avec dates, avancement et deadline ; null pour un non-membre. */
export async function getPromoCalendar(actor: Actor, promoId: string): Promise<PromoCalendarGroup[] | null> {
  if (actor.emailVerifiedAt === null) return null;
  const me = await db.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true } });
  if (!me || me.promoId !== promoId) return null;

  const groups = await db.group.findMany({
    where: { promoId },
    orderBy: [{ startDate: "asc" }, { endDate: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      tasks: { select: { durationDays: true, status: true } },
      members: { where: { userId: actor.id }, select: { userId: true } },
    },
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    startDate: g.startDate,
    deadline: g.endDate,
    progressPercent: groupProgress(g.tasks),
    isMember: g.members.length > 0,
  }));
}
