"use client";

import { UserRound } from "lucide-react";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select as UiSelect } from "@/components/ui/Select";
import {
  createPromoAction,
  deletePromoAction,
  joinPromoAction,
  leavePromoAction,
  transferDelegationAction,
  type PromoFormState,
} from "@/lib/actions/promo";

const initial: PromoFormState = {};

type Person = { id: string; username: string; firstName: string; lastName: string };

const personLabel = (p: Person) => `${p.firstName} ${p.lastName} (@${p.username})`;

function ErrorAlert({ state }: { state: PromoFormState }) {
  if (!state.error) return null;
  return (
    <Alert tone="error">
      {state.error}
      {state.groups?.length ? ` Groupes concernés : ${state.groups.map((g) => g.name).join(", ")}.` : null}
    </Alert>
  );
}

export function Select({
  label,
  name,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  options: Person[];
  placeholder: string;
}) {
  return (
    <UiSelect label={label} name={name} required defaultValue="">
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((p) => (
        <option key={p.id} value={p.id}>
          {personLabel(p)}
        </option>
      ))}
    </UiSelect>
  );
}

/**
 * Formulaire soumis seulement après confirmation (§6.5). La confirmation
 * n'est qu'un confort : le service revérifie les droits.
 */
export function ConfirmedForm({
  action,
  pending,
  triggerLabel,
  triggerVariant = "primary",
  title,
  description,
  confirmLabel,
  children,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  triggerLabel: string;
  triggerVariant?: "primary" | "secondary" | "ghost";
  title: string;
  description: ReactNode;
  confirmLabel: string;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <form ref={formRef} action={action} className="space-y-4">
      {children}
      <Button
        variant={triggerVariant}
        disabled={pending}
        onClick={() => {
          if (formRef.current?.reportValidity()) setOpen(true);
        }}
      >
        {pending ? "Patientez…" : triggerLabel}
      </Button>
      <ConfirmDialog
        open={open}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        pending={pending}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
        onCancel={() => setOpen(false)}
      />
    </form>
  );
}

export function CreatePromoForm() {
  const [state, action, pending] = useActionState(createPromoAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Input
        label="Nom de la promo"
        name="name"
        required
        maxLength={100}
        defaultValue={state.values?.name}
        error={state.errors?.name}
        hint="Le code à partager à la classe s'affichera après la création."
      />
      <ErrorAlert state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Patientez…" : "Créer la promo"}
      </Button>
    </form>
  );
}

export function JoinPromoForm() {
  const [state, action, pending] = useActionState(joinPromoAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Input
        label="Code de la promo"
        name="code"
        required
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={64}
        defaultValue={state.values?.code}
        hint="Demandez-le à votre délégué."
      />
      <ErrorAlert state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Patientez…" : "Rejoindre"}
      </Button>
    </form>
  );
}

export function LeavePromoForm({
  isDelegate,
  delegateCandidates,
  ledGroups,
  soloGroups,
}: {
  isDelegate: boolean;
  delegateCandidates: Person[];
  ledGroups: { id: string; name: string; candidates: Person[] }[];
  soloGroups: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(leavePromoAction, initial);

  if (isDelegate && delegateCandidates.length === 0) {
    return (
      <Alert tone="info" icon={UserRound}>
        Vous êtes le seul membre de la promo. Pour la quitter, supprimez-la depuis la page de gestion.
      </Alert>
    );
  }

  const consequences: string[] = [
    "Vous perdez l'accès à vos groupes de cette promo.",
    "Les tâches dont vous étiez le seul assigné deviendront non assignées ; les tâches partagées restent aux autres membres.",
  ];
  if (isDelegate) consequences.push("Le successeur choisi devient délégué.");
  if (ledGroups.length) consequences.push("Les successeurs choisis deviennent chefs de leurs groupes.");
  if (soloGroups.length) {
    consequences.push(
      `Groupes supprimés avec leurs tâches, car vous en êtes le seul membre : ${soloGroups.map((g) => g.name).join(", ")}.`,
    );
  }

  return (
    <ConfirmedForm
      action={action}
      pending={pending}
      triggerLabel="Quitter la promo"
      triggerVariant="ghost"
      title="Quitter la promo ?"
      description={
        <ul className="list-disc space-y-1 pl-5">
          {consequences.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      }
      confirmLabel="Quitter la promo"
    >
      {isDelegate ? (
        <Select
          label="Nouveau délégué"
          name="successorId"
          options={delegateCandidates}
          placeholder="Choisir un membre de la promo"
        />
      ) : null}
      {ledGroups.map((g) => (
        <Select
          key={g.id}
          label={`Nouveau chef du groupe « ${g.name} »`}
          name={`groupSuccessor:${g.id}`}
          options={g.candidates}
          placeholder="Choisir un membre du groupe"
        />
      ))}
      <ErrorAlert state={state} />
    </ConfirmedForm>
  );
}

export function TransferDelegationForm({ promoId, candidates }: { promoId: string; candidates: Person[] }) {
  const [state, action, pending] = useActionState(transferDelegationAction, initial);
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
      triggerLabel="Transmettre la délégation"
      triggerVariant="secondary"
      title="Transmettre la délégation ?"
      description="Le membre choisi devient délégué immédiatement. Vous restez membre de la promo et perdez l'accès à la gestion."
      confirmLabel="Transmettre"
    >
      <input type="hidden" name="promoId" value={promoId} />
      <Select label="Nouveau délégué" name="successorId" options={candidates} placeholder="Choisir un membre" />
      <ErrorAlert state={state} />
    </ConfirmedForm>
  );
}

export function DeletePromoForm({
  promoId,
  promoName,
  memberCount,
  groupCount,
}: {
  promoId: string;
  promoName: string;
  memberCount: number;
  groupCount: number;
}) {
  const [state, action, pending] = useActionState(deletePromoAction, initial);
  const plural = (n: number) => (n > 1 ? "s" : "");
  return (
    <ConfirmedForm
      action={action}
      pending={pending}
      triggerLabel="Supprimer la promo"
      title={`Supprimer « ${promoName} » ?`}
      description={
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {memberCount} membre{plural(memberCount)} quitte{memberCount > 1 ? "nt" : ""} la promo.
          </li>
          <li>
            {groupCount} groupe{plural(groupCount)} supprimé{plural(groupCount)}, avec leurs tâches, assignations,
            dépendances et réunions.
          </li>
          <li>Cette action est définitive.</li>
        </ul>
      }
      confirmLabel="Supprimer définitivement"
    >
      <input type="hidden" name="promoId" value={promoId} />
      <ErrorAlert state={state} />
    </ConfirmedForm>
  );
}
