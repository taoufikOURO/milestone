"use client";

import { useActionState } from "react";
import {
  forgotPasswordAction,
  resendVerificationAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  verifyEmailAction,
  type FormState,
} from "@/lib/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { TextLink } from "@/components/ui/TextLink";
import { PASSWORD_MIN } from "@/lib/validation/auth";
import { Field, SubmitButton } from "./ui";

const initial: FormState = {};

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initial);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Nom d'utilisateur" name="username" autoComplete="username" defaultValue={v.username} error={e.username} hint="Unique, non modifiable. Lettres, chiffres, . _ -" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" name="firstName" autoComplete="given-name" defaultValue={v.firstName} error={e.firstName} />
        <Field label="Nom" name="lastName" autoComplete="family-name" defaultValue={v.lastName} error={e.lastName} />
      </div>
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={v.email} error={e.email} />
      <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" error={e.password} hint={`${PASSWORD_MIN} caractères minimum.`} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <SubmitButton pending={pending}>Créer mon compte</SubmitButton>
    </form>
  );
}

export function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);
  return (
    <form action={action} className="space-y-4">
      {callbackUrl ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} />
      <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <SubmitButton pending={pending}>Se connecter</SubmitButton>
      <p className="text-right text-sm">
        <TextLink href="/mot-de-passe-oublie" className="font-medium text-text-secondary">
          Mot de passe oublié ?
        </TextLink>
      </p>
    </form>
  );
}

export function ResendVerificationForm() {
  const [state, action, pending] = useActionState(resendVerificationAction, initial);
  return (
    <form action={action} className="space-y-4">
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <SubmitButton pending={pending}>Renvoyer le mail</SubmitButton>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(verifyEmailAction, initial);
  if (state.message) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <ButtonLink href="/verifier-email" className="w-full">
          Continuer
        </ButtonLink>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <SubmitButton pending={pending}>Valider mon adresse email</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={state.errors?.email} />
      <SubmitButton pending={pending}>Envoyer le lien</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" error={e.password} hint={`${PASSWORD_MIN} caractères minimum.`} />
      <Field label="Confirmer le mot de passe" name="confirm" type="password" autoComplete="new-password" error={e.confirm} />
      {state.error ? (
        <Alert tone="error">
          {state.error}{" "}
          <TextLink href="/mot-de-passe-oublie">Nouveau lien</TextLink>
        </Alert>
      ) : null}
      <SubmitButton pending={pending}>Changer le mot de passe</SubmitButton>
    </form>
  );
}
