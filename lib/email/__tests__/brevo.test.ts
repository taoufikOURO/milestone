import { describe, expect, it, vi } from "vitest";
import { createBrevoTransport, parseSender } from "@/lib/email/brevo";
import { EmailDeliveryError } from "@/lib/email/types";

const message = { to: "a@example.test", subject: "Objet", text: "Texte", html: "<p>Texte</p>" };

describe("transport Brevo", () => {
  it("échoue proprement si BREVO_API_KEY manque, sans appeler l'API", async () => {
    const fetchImpl = vi.fn();
    const t = createBrevoTransport({ apiKey: undefined, from: "x@example.test", fetchImpl });
    await expect(t.send(message)).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("échoue proprement si MAIL_FROM manque", async () => {
    const t = createBrevoTransport({ apiKey: "k", from: undefined, fetchImpl: vi.fn() });
    await expect(t.send(message)).rejects.toThrow(/MAIL_FROM/);
  });

  it("appelle l'API transactionnelle avec la clé en en-tête", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    const t = createBrevoTransport({ apiKey: "cle", from: "Milestone <no-reply@example.test>", fetchImpl });
    await t.send(message);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("cle");
    expect(JSON.parse(init.body)).toMatchObject({
      sender: { name: "Milestone", email: "no-reply@example.test" },
      to: [{ email: "a@example.test" }],
      subject: "Objet",
    });
  });

  it("transforme un refus HTTP en EmailDeliveryError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 401 }));
    const t = createBrevoTransport({ apiKey: "cle", from: "no-reply@example.test", fetchImpl });
    await expect(t.send(message)).rejects.toThrow("HTTP 401");
  });

  it("lit l'expéditeur avec ou sans nom", () => {
    expect(parseSender("no-reply@example.test")).toEqual({ email: "no-reply@example.test" });
    expect(parseSender("pas une adresse")).toBeNull();
  });
});
