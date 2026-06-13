import { describe, it, expect } from "vitest";
import { afrondStatus, afrondStatusLabel } from "./afrond-status";

const basis = {
  afgerond_door_monteur_at: null as string | null,
  afgerond_vervolg_nodig: false,
  afgerond_akkoord_at: null as string | null,
  dashboard_status: "bevestigd" as const,
};

describe("afrondStatus", () => {
  it("null als er niets voltooid is", () => {
    expect(afrondStatus(basis)).toBeNull();
  });
  it("'voltooid' als de monteur het meldde, zonder akkoord of vervolg", () => {
    expect(afrondStatus({ ...basis, afgerond_door_monteur_at: "2026-06-13T10:00:00Z" })).toBe("voltooid");
  });
  it("'vervolg-plannen' als vervolg nodig is (kantoor of ad-hoc, ongeacht de status)", () => {
    expect(
      afrondStatus({ ...basis, afgerond_door_monteur_at: "x", afgerond_vervolg_nodig: true }),
    ).toBe("vervolg-plannen");
  });
  it("'voltooid-akkoord' als de zaak akkoord gaf (heeft voorrang)", () => {
    expect(
      afrondStatus({ ...basis, afgerond_door_monteur_at: "x", afgerond_akkoord_at: "2026-06-13T11:00:00Z" }),
    ).toBe("voltooid-akkoord");
  });
  it("labels kloppen", () => {
    expect(afrondStatusLabel("voltooid")).toBe("Voltooid");
    expect(afrondStatusLabel("vervolg-plannen")).toBe("Vervolg plannen");
    expect(afrondStatusLabel("voltooid-akkoord")).toBe("Voltooid");
  });
});
