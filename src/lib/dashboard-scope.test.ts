import { describe, it, expect } from "vitest";
import { scopeVoorDashboard, ARCHIEF_DAGEN, type ScopebareOpdracht } from "./dashboard-scope";
import type { DashboardStatus } from "./db";

const PEIL = new Date("2026-06-03T12:00:00.000Z");

function dagenGeleden(n: number): string {
  return new Date(PEIL.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

function opdr(
  id: string,
  status: DashboardStatus,
  opts: { opgeleverd_at?: string | null; created_at?: string; afgerond_akkoord_at?: string | null } = {},
): ScopebareOpdracht & { id: string } {
  return {
    id,
    dashboard_status: status,
    opgeleverd_at: opts.opgeleverd_at ?? null,
    afgerond_akkoord_at: opts.afgerond_akkoord_at ?? null,
    created_at: opts.created_at ?? dagenGeleden(0),
  };
}

describe("scopeVoorDashboard", () => {
  it("houdt actief werk altijd, ongeacht datum", () => {
    const oud = { created_at: dagenGeleden(400) };
    const lijst = [
      opdr("a", "binnen", oud),
      opdr("b", "concept_gepland", oud),
      opdr("c", "gepland", oud),
      opdr("d", "bevestigd", oud),
    ];
    const res = scopeVoorDashboard(lijst, PEIL).map((o) => o.id);
    expect(res).toEqual(["a", "b", "c", "d"]);
  });

  it("houdt opgeleverd binnen het archief-venster, dropt erbuiten (op opgeleverd_at)", () => {
    const lijst = [
      opdr("recent", "opgeleverd", { opgeleverd_at: dagenGeleden(3) }),
      opdr("oud", "opgeleverd", { opgeleverd_at: dagenGeleden(20) }),
    ];
    const res = scopeVoorDashboard(lijst, PEIL).map((o) => o.id);
    expect(res).toEqual(["recent"]);
  });

  it("dropt opgeleverd precies op de grens niet (randwaarde 14 dagen telt mee)", () => {
    const lijst = [opdr("grens", "opgeleverd", { opgeleverd_at: dagenGeleden(ARCHIEF_DAGEN) })];
    expect(scopeVoorDashboard(lijst, PEIL)).toHaveLength(1);
  });

  it("gebruikt created_at voor geannuleerd (geen opgeleverd_at)", () => {
    const lijst = [
      opdr("recent", "geannuleerd", { created_at: dagenGeleden(5) }),
      opdr("oud", "geannuleerd", { created_at: dagenGeleden(30) }),
    ];
    const res = scopeVoorDashboard(lijst, PEIL).map((o) => o.id);
    expect(res).toEqual(["recent"]);
  });

  it("laat de volgorde van de invoer ongemoeid", () => {
    const lijst = [
      opdr("x", "gepland"),
      opdr("y", "opgeleverd", { opgeleverd_at: dagenGeleden(1) }),
      opdr("z", "binnen"),
    ];
    expect(scopeVoorDashboard(lijst, PEIL).map((o) => o.id)).toEqual(["x", "y", "z"]);
  });
});
