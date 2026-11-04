import type { EmailMessage } from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(title: string, intro: string, link: string, cta: string, outro: string): string {
  const href = escapeHtml(link);
  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#fffcf2;font-family:Arial,sans-serif;color:#252422">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>
<p style="color:#403d39;line-height:1.5">${escapeHtml(intro)}</p>
<p style="margin:24px 0"><a href="${href}" style="background:#eb5e28;color:#fffcf2;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">${escapeHtml(cta)}</a></p>
<p style="color:#403d39;font-size:13px;line-height:1.5">${escapeHtml(outro)}</p>
</div></body></html>`;
}

export function verifyEmailMessage(to: string, link: string): EmailMessage {
  const intro = "Confirmez votre adresse email pour commencer à utiliser Milestone.";
  const outro = "Ce lien expire dans 24 heures et ne fonctionne qu'une fois. Si vous n'avez pas créé de compte, ignorez cet email.";
  return {
    to,
    subject: "Milestone : confirmez votre adresse email",
    text: `${intro}\n\n${link}\n\n${outro}`,
    html: layout("Confirmez votre adresse email", intro, link, "Confirmer mon email", outro),
  };
}

export function resetPasswordMessage(to: string, link: string): EmailMessage {
  const intro = "Une réinitialisation du mot de passe de votre compte Milestone a été demandée.";
  const outro = "Ce lien expire dans 1 heure et ne fonctionne qu'une fois. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.";
  return {
    to,
    subject: "Milestone : réinitialisation du mot de passe",
    text: `${intro}\n\n${link}\n\n${outro}`,
    html: layout("Réinitialiser votre mot de passe", intro, link, "Choisir un nouveau mot de passe", outro),
  };
}

/** Envoyé quand quelqu'un tente de s'inscrire avec une adresse déjà utilisée. */
export function accountExistsMessage(to: string, link: string): EmailMessage {
  const intro = "Une inscription à Milestone a été tentée avec votre adresse, mais vous avez déjà un compte.";
  const outro = "Mot de passe oublié ? Utilisez « Mot de passe oublié » sur la page de connexion. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.";
  return {
    to,
    subject: "Milestone : vous avez déjà un compte",
    text: `${intro}\n\n${link}\n\n${outro}`,
    html: layout("Vous avez déjà un compte", intro, link, "Se connecter", outro),
  };
}
