import { getEnvironment, readSmtpConfig } from "@/lib/config";
import { consoleTransport } from "./console";
import { createSmtpTransport } from "./smtp";
import { EmailDeliveryError, type EmailDelivery, type EmailMessage, type EmailTransport, type EmailTransportKind } from "./types";

export { emailFailureMessage } from "./messages";
export {
  EmailDeliveryError,
  type EmailDelivery,
  type EmailFailureReason,
  type EmailMessage,
  type EmailTransport,
  type EmailTransportKind,
} from "./types";

/** SMTP si ENVIRONMENT vaut exactement « production », console sinon (valeur absente comprise). */
export function emailTransportKind(environment: string | undefined): EmailTransportKind {
  return getEnvironment(environment) === "production" ? "smtp" : "console";
}

/**
 * Garde-fou : sous Vitest, le transport est toujours console, même si
 * ENVIRONMENT=production traîne dans l'environnement. (Les configurations de
 * test et Playwright forcent aussi ENVIRONMENT=test.)
 */
function isTestRun(): boolean {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
}

let smtpTransport: EmailTransport | undefined;

export function getEmailTransport(): EmailTransport {
  if (isTestRun() || emailTransportKind(process.env.ENVIRONMENT) === "console") return consoleTransport;
  if (!smtpTransport) {
    try {
      smtpTransport = createSmtpTransport(readSmtpConfig());
    } catch (error) {
      throw new EmailDeliveryError(error instanceof Error ? error.message : "Configuration SMTP invalide.", "config");
    }
  }
  return smtpTransport;
}

export async function sendEmail(message: EmailMessage): Promise<EmailDelivery> {
  const transport = getEmailTransport();
  await transport.send(message);
  return { transport: transport.kind };
}
