export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailTransportKind = "console" | "smtp";

/** Résultat d'un envoi réussi : le transport utilisé. */
export type EmailDelivery = { transport: EmailTransportKind };

export interface EmailTransport {
  readonly kind: EmailTransportKind;
  send(message: EmailMessage): Promise<void>;
}

/**
 * Cause d'un échec d'envoi, sans donnée sensible :
 * - config : variable SMTP absente ou invalide côté serveur
 * - unauthorized : identifiants SMTP refusés
 * - quota : quota d'envoi quotidien atteint
 * - unavailable : serveur injoignable ou délai dépassé
 * - rejected : autre refus
 */
export type EmailFailureReason = "config" | "unauthorized" | "quota" | "unavailable" | "rejected";

/** Échec d'envoi (configuration manquante ou refus du serveur). */
export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly reason: EmailFailureReason = "rejected",
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}
