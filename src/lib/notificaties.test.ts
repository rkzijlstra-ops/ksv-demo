import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./mail", () => ({
  verstuurAnnulering: vi.fn(async () => {}),
  verstuurOntplanning: vi.fn(async () => {}),
  verstuurMonteurMail: vi.fn(async () => {}),
  verstuurNieuwDocument: vi.fn(async () => {}),
  verstuurHerinnering: vi.fn(async () => {}),
}));
vi.mock("./sms", () => ({ verstuurSms: vi.fn(async () => {}) }));
vi.mock("./supabase-admin", () => ({ getGebruikerEmail: vi.fn(async () => "monteur@x.nl") }));
vi.mock("./db", () => ({
  dbAdmin: () => ({
    getProfiel: vi.fn(async () => ({
      telefoon: "06-12345678",
      sms_werk_kritiek: true,
      sms_overig: true,
    })),
  }),
}));

import {
  smsBestemming,
  notificeerAnnulering,
  notificeerNieuwDocument,
  notificeerHerinnering,
} from "./notificaties";
import { verstuurSms } from "./sms";
import { verstuurAnnulering, verstuurNieuwDocument, verstuurHerinnering } from "./mail";

describe("smsBestemming", () => {
  it("geeft +31-nummer als de categorie aanstaat en het nummer geldig is", () => {
    expect(
      smsBestemming(
        { telefoon: "06-12345678", sms_werk_kritiek: true, sms_overig: false },
        "werk_kritiek",
      ),
    ).toBe("+31612345678");
  });
  it("geeft null als de categorie uitstaat", () => {
    expect(
      smsBestemming(
        { telefoon: "06-12345678", sms_werk_kritiek: false, sms_overig: true },
        "werk_kritiek",
      ),
    ).toBeNull();
  });
  it("geeft null zonder geldig nummer", () => {
    expect(
      smsBestemming({ telefoon: null, sms_werk_kritiek: true, sms_overig: true }, "werk_kritiek"),
    ).toBeNull();
    expect(smsBestemming(null, "overig")).toBeNull();
  });
});

describe("notificeerAnnulering", () => {
  beforeEach(() => vi.clearAllMocks());
  it("mailt altijd en sms't als werk-kritiek aanstaat", async () => {
    const r = await notificeerAnnulering({
      toegewezenAan: "user-1",
      monteurNaam: "Piet",
      klantNaam: "Fam. Bakker",
      referentienummer: "7588",
      zaaknaam: "KSV",
    });
    expect(verstuurAnnulering).toHaveBeenCalledOnce();
    expect(verstuurSms).toHaveBeenCalledOnce();
    expect(r.gemaild).toBe(true);
    expect(r.gesmst).toBe(true);
  });
});

describe("notificeerNieuwDocument", () => {
  beforeEach(() => vi.clearAllMocks());
  it("mailt EN sms't (categorie overig) bij een nieuw document; geen lege mailFn meer", async () => {
    const r = await notificeerNieuwDocument({
      toegewezenAan: "user-1",
      monteurNaam: "Piet",
      klantNaam: "Fam. Bakker",
      referentienummer: "7588",
      zaaknaam: "KSV",
    });
    expect(verstuurNieuwDocument).toHaveBeenCalledOnce();
    expect(verstuurSms).toHaveBeenCalledOnce();
    expect(r.gemaild).toBe(true);
    expect(r.gesmst).toBe(true);
  });
});

describe("notificeerHerinnering", () => {
  beforeEach(() => vi.clearAllMocks());
  it("mailt EN sms't (categorie overig) een bevestig-herinnering; geen lege mailFn meer", async () => {
    const r = await notificeerHerinnering({
      toegewezenAan: "user-1",
      monteurNaam: "Piet",
      klantNamen: ["Bakker", "Jansen"],
      zaaknaam: "KSV",
    });
    expect(verstuurHerinnering).toHaveBeenCalledOnce();
    expect(verstuurSms).toHaveBeenCalledOnce();
    expect(r.gemaild).toBe(true);
    expect(r.gesmst).toBe(true);
  });
});
