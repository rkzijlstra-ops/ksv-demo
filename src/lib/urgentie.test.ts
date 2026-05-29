import { describe, it, expect } from "vitest";
import { urgentieConfig, bronConfig, documenttypeConfig } from "./urgentie";

describe("urgentieConfig", () => {
  it("rood: label DIRECT, rode achtergrond, witte tekst, alert-icoon", () => {
    const c = urgentieConfig("rood");
    expect(c).not.toBeNull();
    expect(c!.label).toBe("DIRECT");
    expect(c!.icon).toBe("alert");
    expect(c!.bg).toContain("urgent-rood");
    expect(c!.ink).toContain("white");
  });

  it("geel: label ACHTERAF, gele achtergrond, donkere tekst (contrast), klok-icoon", () => {
    const c = urgentieConfig("geel");
    expect(c).not.toBeNull();
    expect(c!.label).toBe("ACHTERAF");
    expect(c!.icon).toBe("clock");
    expect(c!.bg).toContain("urgent-geel");
    // geel vereist donkere tekst voor contrast, niet wit
    expect(c!.ink).not.toContain("white");
  });

  it("null: geen badge (PDF-klus zonder urgentie)", () => {
    expect(urgentieConfig(null)).toBeNull();
  });
});

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
