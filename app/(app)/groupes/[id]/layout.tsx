import { ArrowRight, CalendarRange } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GroupNav } from "@/components/group/GroupNav";
import { Appear } from "@/components/motion/Appear";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { getGroupForMember } from "@/lib/services/group";

// Les params et la session sont lus sous <Suspense> (Cache Components). Ce
// contrôle d'accès n'est qu'un confort : chaque page et chaque action
// revérifient l'appartenance au groupe via le service.
export default function GroupLayout({ children, params }: LayoutProps<"/groupes/[id]">) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<CardSkeleton className="h-28" />}>
        {params.then(({ id }) => (
          <GroupHeader groupId={id} />
        ))}
      </Suspense>
      {children}
    </div>
  );
}

async function GroupHeader({ groupId }: { groupId: string }) {
  const user = await requireVerifiedUser();
  const group = await getGroupForMember(user, groupId);
  if (!group) notFound();
  return (
    <Appear>
      <header className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
              {group.name}
            </h1>
            {group.myRole === "leader" ? <Badge tone="accent">Chef</Badge> : null}
          </div>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-text-secondary">
            <CalendarRange aria-hidden className="size-4" />
            {formatDate(group.startDate)} <ArrowRight aria-hidden className="size-3.5" />{" "}
            <span className="font-semibold text-text-primary">{formatDate(group.endDate)}</span>
          </p>
        </div>
        <GroupNav groupId={group.id} isLeader={group.myRole === "leader"} />
      </header>
    </Appear>
  );
}
