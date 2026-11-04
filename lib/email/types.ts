export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

/** Échec d'envoi (configuration manquante ou refus du fournisseur). */
export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}
