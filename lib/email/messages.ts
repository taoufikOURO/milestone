import type { EmailFailureReason } from "./types";

/** Messages affichés à l'utilisateur : la cause est explicite, sans identifiant, code ni réponse brute du serveur. */
export const EMAIL_FAILURE_MESSAGES: Record<EmailFailureReason, string> = {
  config: "L'envoi d'email n'est pas configuré sur le serveur. Contactez l'administrateur.",
  unauthorized: "Le service d'email a refusé les identifiants du serveur. Contactez l'administrateur.",
  quota: "Le quota d'envoi quotidien est atteint. Réessayez demain.",
  unavailable: "Le service d'email est indisponible. Réessayez plus tard.",
  rejected: "Le service d'email a refusé l'envoi. Réessayez dans quelques instants.",
};

export function emailFailureMessage(reason: EmailFailureReason): string {
  return EMAIL_FAILURE_MESSAGES[reason];
}
