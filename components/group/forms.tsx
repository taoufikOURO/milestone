"use client";

import { UserRound } from "lucide-react";
import { useActionState } from "react";
import { ConfirmedForm, Select } from "@/components/promo/forms";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createGroupAction,
  deleteGroupAction,
  leaveGroupAction,
  transferLeadershipAction,
  updateGroupAction,
  type GroupFormState,
} from "@/lib/actions/group";
import {
  cancelInvitationAction,
  inviteAction,
  respondInvitationAction,
  type InvitationFormState,
} from "@/lib/actions/invitation";
import { MAX_MARGIN_PERCENT, MIN_MARGIN_PERCENT } from "@/lib/validation/group";

type Person = { id: string; username: string; firstName: string; lastName: string };
type State = GroupFormState | InvitationFormState;

const initial: State = {};

/** Date DATE (minuit UTC) → valeur d'un <input type="date">. */
const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

function Feedback({ state }: { state: State }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

function GroupFields({
  state,
  defaults,
}: {
  state: GroupFormState;
  defaults?: { name: string; startDate: string; endDate: string };
}) {
  return (
    <>
      <Input
        label="Nom du groupe"
        name="name"
        required
        maxLength={100}
        defaultValue={state.values?.name ?? defaults?.name}
        error={state.errors?.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Date de début"
          name="startDate"
          type="date"
          required
          defaultValue={state.values?.startDate ?? defaults?.startDate}
          error={state.errors?.startDate}
        />
        <Input
          label="Date de fin (deadline)"
          name="endDate"
          type="date"
          required
          defaultValue={state.values?.endDate ?? defaults?.endDate}
          error={state.errors?.endDate}
        />
      </div>
    </>
  );
}

export function CreateGroupForm() {
  const [state, action, pending] = useActionState(createGroupAction, initial);
  return (
    <form action={action} className="space-y-4">
      <GroupFields state={state} />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Patientez…" : "Créer le groupe"}
      </Button>
    </form>
  );
}

export function UpdateGroupForm({
  group,
}: {
  group: { id: string; name: string; startDate: Date; endDate: Date; marginPercent: number };
}) {
  const [state, action, pending] = useActionState(updateGroupAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={group.id} />
      <GroupFields
        state={state}
        defaults={{ name: group.name, startDate: toDateInput(group.startDate), endDate: toDateInput(group.endDate) }}
      />
      <Input
        label="Marge de sécurité du groupe (%)"
        name="marginPercent"
        type="number"
        inputMode="numeric"
        min={MIN_MARGIN_PERCENT}
        max={MAX_MARGIN_PERCENT}
        step={1}
        required
        defaultValue={state.values?.marginPercent ?? String(group.marginPercent)}
        error={state.errors?.marginPercent}
        hint={`Nombre entier de ${MIN_MARGIN_PERCENT} à ${MAX_MARGIN_PERCENT}, appliqué à toutes les tâches du groupe pour la planification. 0 % = pas de marge : la durée planifiée est la durée saisie.`}
      />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Patientez…" : "Enregistrer"}
      </Button>
    </form>
  );
}

export function InviteForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState(inviteAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <Input
        label="Nom d'utilisateur"
        name="username"
        required
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={31}
        defaultValue={state.values?.username}
        error={state.errors?.username}
        hint="Uniquement un étudiant de votre promo."
      />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Patientez…" : "Inviter"}
      </Button>
    </form>
  );
}

export function InvitationResponseForm({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(respondInvitationAction, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" name="decision" value="accept" disabled={pending}>
          Accepter
        </Button>
        <Button type="submit" name="decision" value="decline" variant="ghost" disabled={pending}>
          Refuser
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function CancelInvitationForm({ invitationId, label }: { invitationId: string; label: string }) {
  const [state, action, pending] = useActionState(cancelInvitationAction, initial);
  return (
    <ConfirmedForm
      action={action}
      pending={pending}
      triggerLabel="Annuler"
      triggerVariant="ghost"
      title="Annuler l'invitation ?"
      description={`${label} ne verra plus l'invitation et ne pourra plus rejoindre le groupe sans nouvelle invitation.`}
      confirmLabel="Annuler l'invitation"
    >
      <input type="hidden" name="invitationId" value={invitationId} />
      {state.error ? <Feedback state={state} /> : null}
    </ConfirmedForm>
  );
}

export function LeaveGroupForm({
  groupId,
  groupName,
  isLeader,
  candidates,
}: {
  groupId: string;
  groupName: string;
  isLeader: boolean;
  /** Autres membres du groupe. */
  candidates: Person[];
}) {
  const [state, action, pending] = useActionState(leaveGroupAction, initial);
  const isLast = candidates.length === 0;

  const consequences = isLast
    ? [
        "Vous êtes le dernier membre : le groupe sera supprimé.",
        "Ses tâches, assignations, dépendances, réunions et invitations seront supprimées.",
        "Cette action est définitive.",
      ]
    : [
        "Vous perdez l'accès au groupe.",
        "Les tâches dont vous étiez le seul assigné deviendront non assignées ; les tâches partagées restent aux autres membres.",
        ...(isLeader ? ["Le successeur choisi devient chef du groupe."] : []),
      ];

  return (
    <ConfirmedForm
      action={action}
      pending={pending}
      triggerLabel={isLast ? "Quitter et supprimer le groupe" : "Quitter le groupe"}
      triggerVariant="ghost"
      title={isLast ? `Supprimer « ${groupName} » ?` : `Quitter « ${groupName} » ?`}
      description={
        <ul className="list-disc space-y-1 pl-5">
          {consequences.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      }
      confirmLabel={isLast ? "Quitter et supprimer" : "Quitter le groupe"}
    >
      <input type="hidden" name="groupId" value={groupId} />
      {isLeader && !isLast ? (
        <Select
          label="Nouveau chef du groupe"
          name="successorId"
          options={candidates}
          placeholder="Choisir un membre du groupe"
        />
      ) : null}
      <Feedback state={state} />
    </ConfirmedForm>
  );
}

export function TransferLeadershipForm({ groupId, candidates }: { groupId: string; candidates: Person[] }) {
  const [state, action, pending] = useActionState(transferLeadershipAction, initial);
  if (candidates.length === 0) {
    return (
      <Alert tone="info" icon={UserRound}>
        Aucun autre membre pour l&apos;instant.
      </Alert>
    );
  }
  return (
    <ConfirmedForm
      action={action}
      pending={pending}
      triggerLabel="Nommer ce successeur"
      triggerVariant="secondary"
      title="Transmettre le rôle de chef ?"
      description="Le membre choisi devient chef immédiatement. Vous restez membre du groupe et perdez l'accès aux paramètres."
      confirmLabel="Transmettre"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <Select label="Nouveau chef" name="successorId" options={candidates} placeholder="Choisir un membre" />
      <Feedback state={state} />
    </ConfirmedForm>
  );
}

export function DeleteGroupForm({
  groupId,
  groupName,
  memberCount,
  taskCount,
}: {
  groupId: string;
  groupName: string;
  memberCount: number;
  taskCount: number;
}) {
  const [state, action, pending] = useActionState(deleteGroupAction, initial);
  const plural = (n: number) => (n > 1 ? "s" : "");
  return (
    <ConfirmedForm
      action={action}
      pending={pending}
      triggerLabel="Supprimer le groupe"
      title={`Supprimer « ${groupName} » ?`}
      description={
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {memberCount} membre{plural(memberCount)} perd{memberCount > 1 ? "ent" : ""} l&apos;accès au groupe.
          </li>
          <li>
            {taskCount} tâche{plural(taskCount)} supprimée{plural(taskCount)}, avec les assignations, dépendances,
            réunions et invitations.
          </li>
          <li>Cette action est définitive.</li>
        </ul>
      }
      confirmLabel="Supprimer définitivement"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <Feedback state={state} />
    </ConfirmedForm>
  );
}
