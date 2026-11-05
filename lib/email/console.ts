import { appendFileSync } from "node:fs";
import type { EmailMessage, EmailTransport } from "./types";

/**
 * Boîte d'envoi des tests end-to-end : si EMAIL_OUTBOX_FILE est défini (hors
 * production), chaque email est aussi ajouté à ce fichier, une ligne JSON par
 * message. Les tests y lisent les liens de validation.
 */
function writeToOutbox(message: EmailMessage) {
  const file = process.env.EMAIL_OUTBOX_FILE;
  if (!file || process.env.NODE_ENV === "production") return;
  appendFileSync(file, `${JSON.stringify({ to: message.to, subject: message.subject, text: message.text })}\n`);
}

/** Transport de développement : affiche l'email dans la console du serveur. */
export const consoleTransport: EmailTransport = {
  kind: "console",
  async send(message: EmailMessage) {
    console.info(
      [
        "──── Email (transport console) ────",
        `À : ${message.to}`,
        `Objet : ${message.subject}`,
        "",
        message.text,
        "───────────────────────────────────",
      ].join("\n"),
    );
    writeToOutbox(message);
  },
};
