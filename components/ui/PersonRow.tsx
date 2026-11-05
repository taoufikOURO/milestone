import type { ReactNode } from "react";
import { StaggerItem } from "@/components/motion/Stagger";
import { Avatar } from "@/components/ui/Avatar";

/** Ligne de liste d'une personne (à placer dans un StaggerList) : initiales, nom, @identifiant, badge éventuel. */
export function PersonRow({
  firstName,
  lastName,
  username,
  badge,
}: {
  firstName: string;
  lastName: string;
  username: string;
  badge?: ReactNode;
}) {
  return (
    <StaggerItem className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex min-w-0 items-center gap-3">
        <Avatar firstName={firstName} lastName={lastName} />
        <span className="min-w-0 truncate text-text-primary">
          {firstName} {lastName} <span className="text-sm text-text-secondary">@{username}</span>
        </span>
      </span>
      {badge}
    </StaggerItem>
  );
}
