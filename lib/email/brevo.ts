import {
  EmailDeliveryError,
  type EmailFailureReason,
  type EmailMessage,
  type EmailTransport,
} from "./types";

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
    kind: "brevo",
    async send(message: EmailMessage) {
      if (!apiKey) throw new EmailDeliveryError("BREVO_API_KEY est manquante.", "config");
      const sender = from ? parseSender(from) : null;
      if (!sender) throw new EmailDeliveryError("MAIL_FROM est manquante ou invalide.", "config");

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
        throw new EmailDeliveryError("Brevo injoignable.", "unavailable");
      }
      if (!response.ok) {
        const { code, mentionsSender } = await readBrevoError(response);
        // Seuls le statut et le code Brevo sont journalisés : le message brut peut
        // contenir des données du compte.
        throw new EmailDeliveryError(
          `Brevo a refusé l'envoi (HTTP ${response.status}${code ? `, ${code}` : ""}).`,
          classifyBrevoError(response.status, code, mentionsSender),
        );
      }
    },
  };
}

async function readBrevoError(response: Response): Promise<{ code?: string; mentionsSender: boolean }> {
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return { mentionsSender: false };
    const { code, message } = body as { code?: unknown; message?: unknown };
    return {
      code: typeof code === "string" && /^[a-z_]{1,64}$/.test(code) ? code : undefined,
      mentionsSender: typeof message === "string" && /sender|expéditeur/i.test(message),
    };
  } catch {
    return { mentionsSender: false };
  }
}

/** Traduit un refus Brevo en cause affichable (sans détail du compte). */
export function classifyBrevoError(
  status: number,
  code: string | undefined,
  mentionsSender: boolean,
): EmailFailureReason {
  if (status === 401 || code === "unauthorized") return "unauthorized";
  if (status === 402 || status === 429 || code === "not_enough_credits") return "quota";
  if (mentionsSender) return "sender";
  if (status >= 500) return "unavailable";
  return "rejected";
}
