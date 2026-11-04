import { describe, expect, it } from "vitest";
import { effectiveDuration } from "@/lib/planning/duration";

describe("effectiveDuration", () => {
  it.each([
    [2, 20, 3],
    [10, 10, 11],
    [5, 0, 5],
    [1, 100, 2],
    [3, 50, 5],
  ])("%i j à %i %% donne %i j", (days, margin, expected) => {
    expect(effectiveDuration(days, margin)).toBe(expected);
  });

  it("évite le piège des flottants (50 × 1.1 = 55.00000000000001)", () => {
    expect(Math.ceil(50 * (1 + 10 / 100))).toBe(56);
    expect(effectiveDuration(50, 10)).toBe(55);
    expect(Math.ceil(25 * (1 + 12 / 100))).toBe(29);
    expect(effectiveDuration(25, 12)).toBe(28);
  });

  it("refuse une durée ou une marge hors bornes", () => {
    expect(() => effectiveDuration(0, 20)).toThrow(RangeError);
    expect(() => effectiveDuration(1.5, 20)).toThrow(RangeError);
    expect(() => effectiveDuration(2, -1)).toThrow(RangeError);
    expect(() => effectiveDuration(2, 101)).toThrow(RangeError);
  });
});
