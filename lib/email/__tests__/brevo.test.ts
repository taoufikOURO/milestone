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

  it.each([
    [401, { code: "unauthorized", message: "Key not found" }, "unauthorized"],
    [400, { code: "invalid_parameter", message: "Sender is not valid" }, "sender"],
    [402, { code: "not_enough_credits", message: "Not enough credits" }, "quota"],
    [429, { code: "too_many_requests", message: "Too many requests" }, "quota"],
    [503, {}, "unavailable"],
  ] as const)("classe un refus HTTP %i en cause « %s »", async (status, body, reason) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
    const t = createBrevoTransport({ apiKey: "cle-secrete", from: "no-reply@example.test", fetchImpl });
    const error = await t.send(message).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect((error as EmailDeliveryError).reason).toBe(reason);
    // Le message brut de Brevo et la clé ne sont jamais recopiés.
    expect((error as Error).message).not.toMatch(/cle-secrete|Key not found|Sender is not valid/);
  });

  it("indique le transport utilisé", () => {
    const t = createBrevoTransport({ apiKey: "k", from: "x@example.test", fetchImpl: vi.fn() });
    expect(t.kind).toBe("brevo");
  });

  it("lit l'expéditeur avec ou sans nom", () => {
    expect(parseSender("no-reply@example.test")).toEqual({ email: "no-reply@example.test" });
    expect(parseSender("pas une adresse")).toBeNull();
  });
});
