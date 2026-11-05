"use client";

import { useActionState } from "react";
import { Field, SubmitButton } from "@/components/auth/ui";
import { Alert } from "@/components/ui/Alert";
import type { FormState } from "@/lib/actions/auth";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/profile";
import { PASSWORD_MIN } from "@/lib/validation/auth";

const initial: FormState = {};

export function ProfileForm({ firstName, lastName }: { firstName: string; lastName: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  const e = state.errors ?? {};
  const v = state.values ?? { firstName, lastName };
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" name="firstName" autoComplete="given-name" defaultValue={v.firstName} error={e.firstName} />
        <Field label="Nom" name="lastName" autoComplete="family-name" defaultValue={v.lastName} error={e.lastName} />
      </div>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <SubmitButton pending={pending}>Enregistrer</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Mot de passe actuel" name="currentPassword" type="password" autoComplete="current-password" error={e.currentPassword} />
      <Field label="Nouveau mot de passe" name="newPassword" type="password" autoComplete="new-password" error={e.newPassword} hint={`${PASSWORD_MIN} caractères minimum, différent de l'actuel.`} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <SubmitButton pending={pending}>Changer le mot de passe</SubmitButton>
    </form>
  );
}
