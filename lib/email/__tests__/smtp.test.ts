import { afterEach, describe, expect, it, vi } from "vitest";
import type { SmtpConfig } from "@/lib/config";
import { emailFailureMessage } from "@/lib/email/messages";
import { classifySmtpError, createSmtpTransport, smtpOptions, type SmtpMailer } from "@/lib/email/smtp";
import { EmailDeliveryError } from "@/lib/email/types";

// Aucune connexion réelle : nodemailer est remplacé par un double injecté.

const PASSWORD = "mdp-factice-Zx9!secret";

const config: SmtpConfig = {
  host: "smtp.example.test",
  port: 587,
  user: "expediteur@example.test",
  password: PASSWORD,
  from: "Milestone <expediteur@example.test>",
};

const message = { to: "a@example.test", subject: "Objet", text: "Texte", html: "<p>Texte</p>" };

/** Erreur au format nodemailer. Message et réponse contiennent le mot de passe pour vérifier qu'il ne fuit pas. */
function smtpError(fields: { code?: string; responseCode?: number; response?: string }) {
  return Object.assign(new Error(`Échec brut, pass=${PASSWORD}`), {
    ...fields,
    response: fields.response ? `${fields.response} (${PASSWORD})` : undefined,
    command: `AUTH PLAIN ${Buffer.from(`\0${config.user}\0${PASSWORD}`).toString("base64")}`,
  });
}

function failingTransport(error: unknown) {
  const mailer: SmtpMailer = { sendMail: vi.fn().mockRejectedValue(error) };
  return createSmtpTransport(config, () => mailer);
}

async function sendError(error: unknown): Promise<EmailDeliveryError> {
  const caught = await failingTransport(error)
    .send(message)
    .catch((e: unknown) => e);
  expect(caught).toBeInstanceOf(EmailDeliveryError);
  return caught as EmailDeliveryError;
}

const ERROR_CASES = [
  [
    "authentification refusée (EAUTH 535)",
    smtpError({ code: "EAUTH", responseCode: 535, response: "535-5.7.8 Username and Password not accepted" }),
    "unauthorized",
    "Le service d'email a refusé les identifiants du serveur. Contactez l'administrateur.",
  ],
  [
    "quota quotidien Gmail (550 5.4.5)",
    smtpError({ code: "EENVELOPE", responseCode: 550, response: "550 5.4.5 Daily user sending limit exceeded." }),
    "quota",
    "Le quota d'envoi quotidien est atteint. Réessayez demain.",
  ],
  [
    "quota quotidien (message équivalent)",
    smtpError({ code: "EMESSAGE", responseCode: 550, response: "550 Daily sending quota exceeded" }),
    "quota",
    "Le quota d'envoi quotidien est atteint. Réessayez demain.",
  ],
  [
    "serveur injoignable (ECONNECTION)",
    smtpError({ code: "ECONNECTION" }),
    "unavailable",
    "Le service d'email est indisponible. Réessayez plus tard.",
  ],
  [
    "délai dépassé (ETIMEDOUT)",
    smtpError({ code: "ETIMEDOUT" }),
    "unavailable",
    "Le service d'email est indisponible. Réessayez plus tard.",
  ],
  [
    "hôte introuvable (EDNS)",
    smtpError({ code: "EDNS" }),
    "unavailable",
    "Le service d'email est indisponible. Réessayez plus tard.",
  ],
] as const;

describe("transport SMTP", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("STARTTLS obligatoire sur le port 587, journalisation nodemailer coupée", () => {
    expect(smtpOptions(config)).toMatchObject({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: "expediteur@example.test", pass: PASSWORD },
      logger: false,
      debug: false,
    });
    expect(smtpOptions({ ...config, port: 465 })).toMatchObject({ secure: true, requireTLS: false });
  });

  it("envoie le message avec l'expéditeur MAIL_FROM", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "x" });
    const createMailer = vi.fn(() => ({ sendMail }));
    const transport = createSmtpTransport(config, createMailer);
    await transport.send(message);

    expect(transport.kind).toBe("smtp");
    expect(createMailer).toHaveBeenCalledWith(config);
    expect(sendMail).toHaveBeenCalledWith({ from: config.from, ...message });
  });

  it.each(ERROR_CASES)("traduit l'erreur : %s", async (_label, error, reason, expected) => {
    const caught = await sendError(error);
    expect(caught.reason).toBe(reason);
    expect(classifySmtpError(error)).toBe(reason);
    expect(emailFailureMessage(caught.reason)).toBe(expected);
  });

  it("classe une erreur inconnue en refus générique", () => {
    expect(classifySmtpError(new Error("??"))).toBe("rejected");
    expect(classifySmtpError(undefined)).toBe("rejected");
    expect(classifySmtpError(smtpError({ code: "EENVELOPE", responseCode: 553 }))).toBe("rejected");
  });

  it.each(ERROR_CASES)("ne divulgue jamais le mot de passe (%s)", async (_label, error) => {
    const caught = await sendError(error);
    const base64Password = Buffer.from(PASSWORD).toString("base64");
    const exposed = [caught.message, String(caught.stack), JSON.stringify(caught), emailFailureMessage(caught.reason)];
    for (const text of exposed) {
      expect(text).not.toContain(PASSWORD);
      expect(text).not.toContain(base64Password);
      expect(text).not.toContain("AUTH PLAIN");
    }
    // Pas d'erreur d'origine chaînée (elle contient la réponse brute du serveur).
    expect(caught.cause).toBeUndefined();
  });

  it("ne journalise rien lui-même pendant un échec", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    await sendError(ERROR_CASES[0][1]);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
