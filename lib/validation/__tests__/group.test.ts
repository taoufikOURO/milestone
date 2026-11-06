import { describe, expect, it } from "vitest";
import { marginPercentSchema, updateGroupSchema } from "@/lib/validation/group";

// Marge de sécurité du groupe (§4.6, décision 19) : entier de 0 à 100.

describe("marginPercentSchema", () => {
  it.each([
    ["0", 0],
    ["20", 20],
    ["100", 100],
    [" 35 ", 35],
  ])("accepte %j", (input, expected) => {
    expect(marginPercentSchema.parse(input)).toBe(expected);
  });

  it.each(["-1", "101", "20.5", "20,5", "", " ", "1e1", "0x10", "abc"])("refuse %j", (input) => {
    expect(marginPercentSchema.safeParse(input).success).toBe(false);
  });

  it("explique la borne dépassée", () => {
    const r = marginPercentSchema.safeParse("101");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("La marge doit être comprise entre 0 et 100 %.");
  });
});

describe("updateGroupSchema", () => {
  const base = {
    groupId: "11111111-1111-4111-8111-111111111111",
    name: "Projet",
    startDate: "2026-11-02",
    endDate: "2026-11-30",
  };

  it("accepte une marge de 0 % (pas de marge)", () => {
    expect(updateGroupSchema.parse({ ...base, marginPercent: "0" }).marginPercent).toBe(0);
  });

  it("refuse une marge absente", () => {
    expect(updateGroupSchema.safeParse(base).success).toBe(false);
  });
});
