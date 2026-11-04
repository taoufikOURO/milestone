import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GroupNav } from "@/components/group/GroupNav";
import { Badge } from "@/components/ui/Badge";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { getGroupForMember } from "@/lib/services/group";

// Les params et la session sont lus sous <Suspense> (Cache Components). Ce
// contrôle d'accès n'est qu'un confort : chaque page et chaque action
// revérifient l'appartenance au groupe via le service.
export default function GroupLayout({ children, params }: LayoutProps<"/groupes/[id]">) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-20 animate-pulse rounded-2xl bg-border-soft/60" />}>
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
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 break-words text-2xl font-bold text-text-primary sm:text-3xl">{group.name}</h1>
        {group.myRole === "leader" ? <Badge tone="accent">Chef</Badge> : null}
      </div>
      <p className="text-sm text-text-secondary">
        {formatDate(group.startDate)} → <span className="font-semibold">{formatDate(group.endDate)}</span>
      </p>
      <GroupNav groupId={group.id} isLeader={group.myRole === "leader"} />
    </header>
  );
}
