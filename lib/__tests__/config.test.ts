import { describe, expect, it } from "vitest";
import { getEnvironment, readSmtpConfig, resolveTimeZone } from "@/lib/config";

describe("resolveTimeZone (PLANNING_TIMEZONE)", () => {
  it("garde Africa/Lome quand la variable est absente ou vide", () => {
    expect(resolveTimeZone(undefined, "Africa/Lome")).toBe("Africa/Lome");
    expect(resolveTimeZone("  ", "Africa/Lome")).toBe("Africa/Lome");
  });

  it("accepte un fuseau IANA valide", () => {
    expect(resolveTimeZone("Europe/Paris", "Africa/Lome")).toBe("Europe/Paris");
  });

  it("refuse un fuseau invalide, sans le recopier dans le message", () => {
    expect(() => resolveTimeZone("Mars/Olympus", "Africa/Lome")).toThrow(/fuseau IANA valide/);
  });
});

describe("getEnvironment (ENVIRONMENT)", () => {
  it("production seulement pour la valeur exacte « production »", () => {
    expect(getEnvironment("production")).toBe("production");
    for (const value of [undefined, "", "development", "Production", "prod", "test"]) {
      expect(getEnvironment(value)).toBe("development");
    }
  });
});

describe("readSmtpConfig (SMTP_*, MAIL_FROM)", () => {
  const PASSWORD = "mdp-factice-Zx9!secret";
  const env = {
    SMTP_HOST: "smtp.example.test",
    SMTP_USER: "expediteur@example.test",
    SMTP_PASSWORD: PASSWORD,
    MAIL_FROM: "Milestone <expediteur@example.test>",
  };

  function configError(overrides: Record<string, string | undefined>): string {
    try {
      readSmtpConfig({ ...env, ...overrides });
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error("readSmtpConfig aurait dû échouer");
  }

  it("lit la configuration, port 587 par défaut", () => {
    expect(readSmtpConfig(env)).toEqual({
      host: "smtp.example.test",
      port: 587,
      user: "expediteur@example.test",
      password: PASSWORD,
      from: "Milestone <expediteur@example.test>",
    });
    expect(readSmtpConfig({ ...env, SMTP_PORT: "465" }).port).toBe(465);
  });

  it("accepte MAIL_FROM sans nom affiché, casse indifférente", () => {
    expect(readSmtpConfig({ ...env, MAIL_FROM: "Expediteur@Example.test" }).from).toBe(
      "Expediteur@Example.test",
    );
  });

  it.each(["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"])("nomme la variable manquante : %s", (name) => {
    expect(configError({ [name]: undefined })).toContain(name);
    expect(configError({ [name]: "" })).toContain(name);
  });

  it("liste toutes les variables manquantes", () => {
    expect(() => readSmtpConfig({})).toThrow("SMTP_HOST, SMTP_USER, SMTP_PASSWORD, MAIL_FROM");
  });

  it("refuse un port invalide", () => {
    expect(configError({ SMTP_PORT: "abc" })).toMatch(/SMTP_PORT/);
    expect(configError({ SMTP_PORT: "70000" })).toMatch(/SMTP_PORT/);
  });

  it("refuse un MAIL_FROM différent de SMTP_USER", () => {
    expect(configError({ MAIL_FROM: "Milestone <autre@example.test>" })).toBe(
      "MAIL_FROM doit utiliser la même adresse que SMTP_USER.",
    );
  });

  it("ne recopie jamais une valeur dans les messages d'erreur", () => {
    const messages = [
      configError({ SMTP_HOST: undefined }),
      configError({ SMTP_PORT: "abc" }),
      configError({ SMTP_USER: "pas-une-adresse", MAIL_FROM: "pas-une-adresse" }),
      configError({ MAIL_FROM: "autre@example.test" }),
      configError({ MAIL_FROM: "<>" }),
    ];
    for (const message of messages) {
      expect(message).not.toContain(PASSWORD);
      expect(message).not.toContain("example.test");
    }
  });
});
