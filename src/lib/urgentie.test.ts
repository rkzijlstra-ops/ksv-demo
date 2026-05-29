import { describe, it, expect } from "vitest";
import {
  bronConfig,
  documenttypeConfig,
  meldingStaatConfig,
  opgeleverdBadgeConfig,
} from "./urgentie";

describe("bronConfig", () => {
  it("pdf: label Opdracht, document-icoon", () => {
    const c = bronConfig("pdf");
    expect(c.label).toBe("Opdracht");
    expect(c.icon).toBe("document");
  });

  it("monteur: label Melding, sleutel-icoon", () => {
    const c = bronConfig("monteur");
    expect(c.label).toBe("Melding");
    expect(c.icon).toBe("wrench");
  });
});

describe("documenttypeConfig", () => {
  it("orderbevestiging: label Montage, package-icoon", () => {
    const c = documenttypeConfig("orderbevestiging");
    expect(c).not.toBeNull();
    expect(c!.label).toBe("Montage");
    expect(c!.icon).toBe("package");
  });

  it("werkbon_service: label Service, sleutel-icoon", () => {
    const c = documenttypeConfig("werkbon_service");
    expect(c!.label).toBe("Service");
    expect(c!.icon).toBe("wrench");
  });

  it("tekst: label Handmatig, edit-icoon", () => {
    const c = documenttypeConfig("tekst");
    expect(c!.label).toBe("Handmatig");
    expect(c!.icon).toBe("edit");
  });

  it("onbekend en null: geen badge", () => {
    expect(documenttypeConfig("onbekend")).toBeNull();
    expect(documenttypeConfig(null)).toBeNull();
  });
});

describe("meldingStaatConfig (kleur-staat)", () => {
  it("spoed + verstuurd: rood, label 'Spoed verstuurd'", () => {
    const c = meldingStaatConfig(true, "2026-05-29T18:00:00Z");
    expect(c.label).toBe("Spoed verstuurd");
    expect(c.bg).toContain("urgent-rood");
    expect(c.ink).toContain("white");
  });

  it("spoed, nog niet verstuurd: rood, label 'Spoed'", () => {
    const c = meldingStaatConfig(true, null);
    expect(c.label).toBe("Spoed");
    expect(c.bg).toContain("urgent-rood");
  });

  it("normaal: outline oranje accent (industrieel D), label 'Open'", () => {
    const c = meldingStaatConfig(false, null);
    expect(c.label).toBe("Open");
    expect(c.bg).toContain("white");
    expect(c.ink).toContain("accent");
    expect(c.border).toContain("accent");
  });
});

describe("opgeleverdBadgeConfig", () => {
  it("groen, label 'Opgeleverd', check-icoon", () => {
    const c = opgeleverdBadgeConfig();
    expect(c.label).toBe("Opgeleverd");
    expect(c.bg).toContain("success");
    expect(c.icon).toBe("check");
  });
});
