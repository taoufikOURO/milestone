export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailTransportKind = "console" | "brevo";

/** Résultat d'un envoi réussi : le transport utilisé. */
export type EmailDelivery = { transport: EmailTransportKind };

export interface EmailTransport {
  readonly kind: EmailTransportKind;
  send(message: EmailMessage): Promise<void>;
}

/**
 * Cause d'un échec d'envoi, sans donnée sensible :
 * - config : clé API ou expéditeur absent côté serveur
 * - unauthorized : clé API refusée par le fournisseur
 * - sender : expéditeur non validé chez le fournisseur
 * - quota : crédits épuisés ou trop d'envois
 * - unavailable : fournisseur injoignable ou en erreur
 * - rejected : autre refus
 */
export type EmailFailureReason =
  | "config"
  | "unauthorized"
  | "sender"
  | "quota"
  | "unavailable"
  | "rejected";

/** Échec d'envoi (configuration manquante ou refus du fournisseur). */
export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly reason: EmailFailureReason = "rejected",
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}
