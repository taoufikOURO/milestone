import nodemailer from "nodemailer";
import type { SmtpConfig } from "@/lib/config";
import {
  EmailDeliveryError,
  type EmailFailureReason,
  type EmailMessage,
  type EmailTransport,
} from "./types";

/** Ce que le transport attend de nodemailer (remplacé par un double dans les tests). */
export type SmtpMailer = {
  sendMail(mail: { from: string; to: string; subject: string; text: string; html: string }): Promise<unknown>;
};

export type CreateMailer = (config: SmtpConfig) => SmtpMailer;

/**
 * Options nodemailer : port 465 en TLS direct, sinon STARTTLS obligatoire
 * (Gmail, port 587). Journalisation de nodemailer coupée : elle pourrait
 * afficher l'échange AUTH.
 */
export function smtpOptions(config: SmtpConfig) {
  const secure = config.port === 465;
  return {
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    logger: false,
    debug: false,
  };
}

const createNodemailer: CreateMailer = (config) => nodemailer.createTransport(smtpOptions(config));

/** Transport SMTP (Gmail en production). */
export function createSmtpTransport(config: SmtpConfig, createMailer: CreateMailer = createNodemailer): EmailTransport {
  const mailer = createMailer(config);
  return {
    kind: "smtp",
    async send(message: EmailMessage) {
      try {
        await mailer.sendMail({
          from: config.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });
      } catch (error) {
        const { code, responseCode } = readSmtpError(error);
        // Seuls le code nodemailer et le code SMTP sont repris : le message brut
        // et la réponse du serveur ne sont jamais journalisés ni chaînés.
        const detail = [code, responseCode].filter(Boolean).join(", ");
        throw new EmailDeliveryError(
          `Échec de l'envoi SMTP${detail ? ` (${detail})` : ""}.`,
          classifySmtpError(error),
        );
      }
    },
  };
}

type SmtpErrorFields = { code?: string; responseCode?: number; response?: string };

function readSmtpError(error: unknown): SmtpErrorFields {
  if (!error || typeof error !== "object") return {};
  const { code, responseCode, response } = error as Record<string, unknown>;
  return {
    code: typeof code === "string" && /^[A-Z0-9_]{1,32}$/.test(code) ? code : undefined,
    responseCode: typeof responseCode === "number" ? responseCode : undefined,
    response: typeof response === "string" ? response : undefined,
  };
}

const UNAVAILABLE_CODES = new Set([
  "ECONNECTION",
  "ETIMEDOUT",
  "ESOCKET",
  "EDNS",
  "ETLS",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

/**
 * Traduit une erreur nodemailer en cause affichable.
 * - quota : Gmail répond « 550 5.4.5 Daily user sending limit exceeded »
 *   (ou 421/454 avec un message de limite d'envoi) ;
 * - unauthorized : identifiants refusés (EAUTH, 534, 535) ;
 * - unavailable : serveur injoignable, délai dépassé, 421.
 */
export function classifySmtpError(error: unknown): EmailFailureReason {
  const { code, responseCode, response = "" } = readSmtpError(error);
  if (/\b5\.4\.5\b/.test(response) || /sending (limit|quota)|daily (user )?sending/i.test(response)) {
    return "quota";
  }
  if (code === "EAUTH" || code === "ENOAUTH" || responseCode === 534 || responseCode === 535) {
    return "unauthorized";
  }
  if ((code && UNAVAILABLE_CODES.has(code)) || responseCode === 421) return "unavailable";
  return "rejected";
}
