import { afterEach, describe, expect, it, vi } from "vitest";
import { emailTransportKind, getEmailTransport } from "@/lib/email";

describe("choix du transport d'email", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ENVIRONMENT=production → smtp", () => {
    expect(emailTransportKind("production")).toBe("smtp");
  });

  it.each([
    ["development", "development"],
    ["absente", undefined],
    ["vide", ""],
    ["Production (casse différente)", "Production"],
    ["production avec espace", "production "],
    ["prod", "prod"],
    ["test", "test"],
  ])("ENVIRONMENT %s → console", (_label, value) => {
    expect(emailTransportKind(value)).toBe("console");
  });

  it("la configuration Vitest impose ENVIRONMENT=test", () => {
    expect(process.env.ENVIRONMENT).toBe("test");
    expect(getEmailTransport().kind).toBe("console");
  });

  it("sous Vitest, reste en console même si ENVIRONMENT=production", () => {
    vi.stubEnv("ENVIRONMENT", "production");
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_USER", "expediteur@example.test");
    vi.stubEnv("SMTP_PASSWORD", "mot-de-passe-factice");
    vi.stubEnv("MAIL_FROM", "expediteur@example.test");
    expect(getEmailTransport().kind).toBe("console");
  });
});
