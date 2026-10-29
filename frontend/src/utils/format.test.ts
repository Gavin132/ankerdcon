import { describe, expect, it } from "vitest";
import { countOf, formatAmount, formatBytes, formatDateRangeShort, formatDateShort } from "./format";

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

describe("formatDateRangeShort", () => {
  it("writes the year once", () => {
    expect(formatDateRangeShort(new Date(2026, 10, 17), new Date(2026, 10, 19))).toBe("17 – 19 nov. 2026");
    expect(formatDateRangeShort(new Date(2026, 9, 28), new Date(2026, 10, 2))).toBe("28 okt. – 2 nov. 2026");
    expect(formatDateRangeShort(new Date(2026, 11, 30), new Date(2027, 0, 2))).toBe("30 dec. 2026 – 2 jan. 2027");
  });

  it("is a single date for one day", () => {
    expect(formatDateRangeShort(new Date(2026, 10, 17), new Date(2026, 10, 17))).toBe("17 nov. 2026");
  });
});

describe("countOf", () => {
  it("uses the singular for exactly one and the plural otherwise, zero included", () => {
    expect(countOf(1, "foto", "foto's")).toBe("1 foto");
    expect(countOf(2, "foto", "foto's")).toBe("2 foto's");
    expect(countOf(0, "rit", "ritten")).toBe("0 ritten");
  });
});
