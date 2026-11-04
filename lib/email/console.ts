import type { EmailMessage, EmailTransport } from "./types";

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
  },
};
