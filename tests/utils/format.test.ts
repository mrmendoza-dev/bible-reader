import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/utils/format-utility";

describe("format utils", () => {
  it("formats currency with default options", () => {
    expect(formatCurrency(2)).toBe("$2");
  });

  it("formats currency with minimum fraction digits", () => {
    expect(formatCurrency(2, { minimumFractionDigits: 2 })).toBe("$2.00");
  });

  it("formats currency with decimals", () => {
    expect(formatCurrency(2.5)).toBe("$2.5");
  });

  it("formats currency with small decimals", () => {
    expect(formatCurrency(0.123)).toBe("$0.123");
  });

  it("handles null/undefined values", () => {
    expect(formatCurrency(null)).toBe("--");
    expect(formatCurrency(undefined)).toBe("--");
  });

  it("handles string values", () => {
    expect(formatCurrency("2.5")).toBe("$2.5");
    expect(formatCurrency("invalid")).toBe("--");
  });
});
