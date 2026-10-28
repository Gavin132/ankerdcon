import { describe, expect, it } from "vitest";
import { formatAmount, formatBytes, formatDateShort } from "./format";

describe("formatAmount", () => {
  it("writes money the Dutch way, with a comma", () => {
    expect(formatAmount(37.5).replace(/\s/g, " ")).toBe("€ 37,50");
    expect(formatAmount(12, "USD").replace(/\s/g, " ")).toContain("12,00");
  });
});

describe("formatBytes", () => {
  it("picks the unit and uses a decimal comma", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(48 * 1024)).toBe("48 KB");
    expect(formatBytes(3.2 * 1024 * 1024)).toBe("3,2 MB");
    expect(formatBytes(1.25 * 1024 * 1024 * 1024)).toBe("1,25 GB");
  });
});

describe("formatDateShort", () => {
  it("is the short variant of formatDate", () => {
    expect(formatDateShort("2026-11-17")).toBe("17 nov. 2026");
  });

  it("gives back what it cannot read", () => {
    expect(formatDateShort("niet een datum")).toBe("niet een datum");
  });
});
