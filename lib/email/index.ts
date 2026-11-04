import { createBrevoTransport } from "./brevo";
import { consoleTransport } from "./console";
import type { EmailDelivery, EmailMessage, EmailTransport } from "./types";

export {
  EmailDeliveryError,
  type EmailDelivery,
  type EmailFailureReason,
  type EmailMessage,
  type EmailTransport,
  type EmailTransportKind,
} from "./types";

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

export async function sendEmail(message: EmailMessage): Promise<EmailDelivery> {
  const transport = getEmailTransport();
  await transport.send(message);
  return { transport: transport.kind };
}
