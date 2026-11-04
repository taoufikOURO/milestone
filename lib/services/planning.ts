import { PLANNING_TIMEZONE } from "@/lib/config";
import { db } from "@/lib/db";
import { dayInTimeZone, dayNumber } from "@/lib/domain/timeline";
import { planPromo, type Day, type Plan } from "@/lib/planning";
import { isUuid, isVerified, PERSON, type Person } from "@/lib/services/group";
import {
  projectGroupCalendar,
  projectPersonalCalendar,
  type CalendarView,
  type GroupCalendarView,
  type PlanCatalog,
} from "@/lib/services/planning-view";
import type { Actor } from "@/lib/services/promo";

// Planification de la promo (§4.6) et calendriers (§5.2, §5.3). Le plan est
// calculé à chaque lecture, une seule fois pour toute la promo, puis projeté :
// les vues d'un même groupe ne divergent jamais d'un étudiant à l'autre. Rien
// n'est écrit en base (réunions comprises, voir lib/services/meeting.ts).
//
// Droits (§8) : compte validé et membre de la promo, vérifiés avant toute
// lecture ; le calendrier d'un groupe est réservé à ses membres (un non-membre
// reçoit null, comme pour « groupe introuvable » ailleurs).

/** Aujourd'hui dans PLANNING_TIMEZONE ; seul endroit où l'horloge est lue. */
export const planningToday = (now: Date = new Date()): Day => dayInTimeZone(now, PLANNING_TIMEZONE);

type PromoPlan = { plan: Plan; catalog: PlanCatalog; today: Day };

/** Charge les groupes et tâches de la promo, puis calcule le plan une fois. */
async function computePromoPlan(promoId: string): Promise<PromoPlan> {
  const groups = await db.group.findMany({
    where: { promoId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      marginPercent: true,
      members: { select: { user: { select: PERSON } } },
      tasks: {
        select: {
          id: true,
          title: true,
          durationDays: true,
          status: true,
          createdAt: true,
          assignments: { select: { userId: true } },
          dependencies: { select: { dependsOnTaskId: true } },
        },
      },
    },
  });

  const today = planningToday();
  const people = new Map<string, Person>();
  for (const g of groups) for (const m of g.members) people.set(m.user.id, m.user);
  const catalog: PlanCatalog = {
    groups: new Map(
      groups.map((g) => [
        g.id,
        { id: g.id, name: g.name, startDay: dayNumber(g.startDate), endDay: dayNumber(g.endDate) },
      ]),
    ),
    tasks: new Map(groups.flatMap((g) => g.tasks.map((t) => [t.id, { title: t.title, status: t.status }] as const))),
    people,
  };

  const plan = planPromo({
    today,
    groups: groups.map((g) => ({
      id: g.id,
      startDay: dayNumber(g.startDate),
      endDay: dayNumber(g.endDate),
      marginPercent: g.marginPercent,
    })),
    tasks: groups.flatMap((g) =>
      g.tasks.map((t) => ({
        id: t.id,
        groupId: g.id,
        durationDays: t.durationDays,
        status: t.status,
        assigneeIds: t.assignments.map((a) => a.userId),
        dependsOnIds: t.dependencies.map((d) => d.dependsOnTaskId),
        createdAt: t.createdAt.getTime(),
      })),
    ),
  });

  return { plan, catalog, today };
}

/** Promo de l'utilisateur validé, ou null. */
async function myPromoId(actor: Actor): Promise<string | null> {
  if (!isVerified(actor)) return null;
  const me = await db.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true } });
  return me?.promoId ?? null;
}

/** Calendrier d'un groupe (§5.2) pour l'un de ses membres ; null pour tout autre utilisateur. */
export async function getGroupCalendar(actor: Actor, groupId: string): Promise<GroupCalendarView | null> {
  if (!isUuid(groupId)) return null;
  const promoId = await myPromoId(actor);
  if (!promoId) return null;
  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: actor.id } },
    select: { group: { select: { promoId: true } } },
  });
  if (!membership || membership.group.promoId !== promoId) return null;

  const { plan, catalog, today } = await computePromoPlan(promoId);
  return projectGroupCalendar(plan, groupId, catalog, today);
}

/** « Mon calendrier » (§5.3) pour un membre de la promo ; null sinon. */
export async function getPersonalCalendar(actor: Actor): Promise<CalendarView | null> {
  const promoId = await myPromoId(actor);
  if (!promoId) return null;
  const memberships = await db.groupMember.findMany({
    where: { userId: actor.id, group: { promoId } },
    select: { groupId: true },
  });
  const myGroupIds = new Set(memberships.map((m) => m.groupId));

  const { plan, catalog, today } = await computePromoPlan(promoId);
  return projectPersonalCalendar(plan, actor.id, myGroupIds, catalog, today);
}
