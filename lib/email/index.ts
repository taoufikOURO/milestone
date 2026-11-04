import { createBrevoTransport } from "./brevo";
import { consoleTransport } from "./console";
import type { EmailMessage, EmailTransport } from "./types";

export { EmailDeliveryError, type EmailMessage, type EmailTransport } from "./types";

/**
 * Brevo en production, console ailleurs. EMAIL_TRANSPORT=brevo permet de
 * tester Brevo en local.
 */
export function getEmailTransport(): EmailTransport {
  const useBrevo =
    process.env.NODE_ENV === "production" || process.env.EMAIL_TRANSPORT === "brevo";
  if (!useBrevo) return consoleTransport;
  return createBrevoTransport({
    apiKey: process.env.BREVO_API_KEY,
    from: process.env.MAIL_FROM,
  });
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await getEmailTransport().send(message);
}
