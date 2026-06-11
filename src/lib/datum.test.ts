import { describe, it, expect } from "vitest";
import { formatDatumKort, formatDatumLang } from "./datum";

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

describe("formatDatumLang", () => {
  it("formatteert een date-string voluit met jaartal als '30 mei 2026'", () => {
    expect(formatDatumLang("2026-05-30")).toBe("30 mei 2026");
  });

  it("formatteert een timestamp (neemt het date-deel) als '10 juni 2026'", () => {
    expect(formatDatumLang("2026-06-10T16:00:00Z")).toBe("10 juni 2026");
  });

  it("laat geen voorloopnul op de dag staan", () => {
    expect(formatDatumLang("2026-01-03")).toBe("3 januari 2026");
  });

  it("gebruikt voluitgeschreven NL-maandnamen", () => {
    expect(formatDatumLang("2026-03-15")).toBe("15 maart 2026");
    expect(formatDatumLang("2026-12-01")).toBe("1 december 2026");
  });

  it("geeft streepje bij null of ongeldige input", () => {
    expect(formatDatumLang(null)).toBe("—");
    expect(formatDatumLang("geen-datum")).toBe("—");
    expect(formatDatumLang("")).toBe("—");
  });
});
