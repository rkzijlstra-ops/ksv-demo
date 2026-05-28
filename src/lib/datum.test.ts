import { describe, it, expect } from "vitest";
import { formatDatumKort } from "./datum";

describe("formatDatumKort", () => {
  it("formatteert een date-string als '30 mei'", () => {
    expect(formatDatumKort("2026-05-30")).toBe("30 mei");
  });

  it("formatteert een timestamp (neemt het date-deel) als '28 mei'", () => {
    expect(formatDatumKort("2026-05-28T10:00:00Z")).toBe("28 mei");
  });

  it("laat geen voorloopnul op de dag staan", () => {
    expect(formatDatumKort("2026-01-03")).toBe("3 jan");
  });

  it("gebruikt korte NL-maandnamen", () => {
    expect(formatDatumKort("2026-11-15")).toBe("15 nov");
    expect(formatDatumKort("2026-12-01")).toBe("1 dec");
  });

  it("geeft streepje bij null", () => {
    expect(formatDatumKort(null)).toBe("—");
  });

  it("geeft streepje bij ongeldige input", () => {
    expect(formatDatumKort("geen-datum")).toBe("—");
    expect(formatDatumKort("")).toBe("—");
  });
});
