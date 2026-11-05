import { describe, expect, it } from "vitest";
import { resolveTimeZone } from "@/lib/config";

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
