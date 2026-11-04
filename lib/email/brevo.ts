import { EmailDeliveryError, type EmailMessage, type EmailTransport } from "./types";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

type Sender = { name?: string; email: string };

/** « Milestone <no-reply@exemple.fr> » ou « no-reply@exemple.fr ». */
export function parseSender(value: string): Sender | null {
  const match = /^\s*(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/.exec(value);
  if (match) return match[1] ? { name: match[1], email: match[2] } : { email: match[2] };
  const bare = value.trim();
  return /^[^<>\s]+@[^<>\s]+$/.test(bare) ? { email: bare } : null;
}

type BrevoOptions = {
  apiKey: string | undefined;
  from: string | undefined;
  fetchImpl?: typeof fetch;
};

/**
 * API transactionnelle Brevo, appelée avec fetch (sans SDK). Une configuration
 * absente n'empêche pas le démarrage : l'envoi échoue avec EmailDeliveryError.
 */
export function createBrevoTransport({ apiKey, from, fetchImpl = fetch }: BrevoOptions): EmailTransport {
  return {
    async send(message: EmailMessage) {
      if (!apiKey) throw new EmailDeliveryError("BREVO_API_KEY est manquante.");
      const sender = from ? parseSender(from) : null;
      if (!sender) throw new EmailDeliveryError("MAIL_FROM est manquante ou invalide.");

      let response: Response;
      try {
        response = await fetchImpl(BREVO_ENDPOINT, {
          method: "POST",
          headers: {
            "api-key": apiKey,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            sender,
            to: [{ email: message.to }],
            subject: message.subject,
            textContent: message.text,
            htmlContent: message.html,
          }),
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new EmailDeliveryError("Brevo injoignable.");
      }
      if (!response.ok) {
        // Le corps de la réponse n'est pas recopié : il peut contenir des données du compte.
        throw new EmailDeliveryError(`Brevo a refusé l'envoi (HTTP ${response.status}).`);
      }
    },
  };
}
