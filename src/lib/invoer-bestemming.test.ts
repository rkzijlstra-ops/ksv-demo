import { describe, it, expect } from "vitest";
import { bestemmingVoor } from "./invoer-bestemming";

describe("bestemmingVoor", () => {
  it("monteur: klus aan zichzelf, geen opdrachtgever (eigen werkpool, ad-hoc)", () => {
    const b = bestemmingVoor("monteur", { id: "monteur-1" });
    expect(b.toegewezen_aan).toBe("monteur-1");
    expect(b.opdrachtgever_id).toBeNull();
  });

  it("opdrachtgever (Ed): gekoppeld aan eigen zaak, nog niet toegewezen (te plannen)", () => {
    const b = bestemmingVoor("opdrachtgever", { id: "ed-1", opdrachtgever_id: "zaak-ksv" });
    expect(b.toegewezen_aan).toBeNull();
    expect(b.opdrachtgever_id).toBe("zaak-ksv");
  });

  it("beheerder met expliciet gekozen zaak: die zaak, niet toegewezen", () => {
    const b = bestemmingVoor("beheerder", { id: "rein-1" }, "zaak-gekozen");
    expect(b.toegewezen_aan).toBeNull();
    expect(b.opdrachtgever_id).toBe("zaak-gekozen");
  });

  it("kantoor zonder zaak: opdrachtgever_id null (geen toewijzing)", () => {
    const b = bestemmingVoor("beheerder", { id: "rein-1" });
    expect(b.toegewezen_aan).toBeNull();
    expect(b.opdrachtgever_id).toBeNull();
  });
});
