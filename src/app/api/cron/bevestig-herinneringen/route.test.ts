import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetKlussen, mockMarkeer, mockNotificeer } = vi.hoisted(() => ({
  mockGetKlussen: vi.fn(),
  mockMarkeer: vi.fn(),
  mockNotificeer: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  dbAdmin: () => ({
    getKlussenVoorHerinnering: mockGetKlussen,
    markeerHerinneringVerzonden: mockMarkeer,
  }),
}));
vi.mock("@/lib/notificaties", () => ({ notificeerHerinnering: mockNotificeer }));

import { GET } from "./route";

function req(auth?: string) {
  return new Request("http://localhost/api/cron/bevestig-herinneringen", {
    headers: auth ? { authorization: auth } : {},
  });
}

const klus = (id: string, monteur: string, klant: string) => ({
  id,
  toegewezen_aan: monteur,
  monteur_naam: "Rein RK",
  klant_naam: klant,
  keukenzaak: "Keukenstudio Voorschoten",
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "geheim");
  vi.stubEnv("HERINNERING_NA_UUR", "24");
  mockMarkeer.mockResolvedValue(undefined);
  mockNotificeer.mockResolvedValue(undefined);
});

describe("GET /api/cron/bevestig-herinneringen", () => {
  it("401 zonder geldige Bearer-secret, en doet niets", async () => {
    mockGetKlussen.mockResolvedValue([]);
    const res = await GET(req("Bearer fout"));
    expect(res.status).toBe(401);
    expect(mockGetKlussen).not.toHaveBeenCalled();
    expect(mockNotificeer).not.toHaveBeenCalled();
  });

  it("bundelt per monteur, notificeert elke monteur 1x en markeert alle klussen verzonden", async () => {
    mockGetKlussen.mockResolvedValue([
      klus("a1", "m1", "Klant A"),
      klus("a2", "m1", "Klant B"),
      klus("b1", "m2", "Klant C"),
    ]);

    const res = await GET(req("Bearer geheim"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, monteurs: 2, klussen: 3 });

    // Eén herinnering per monteur, gebundeld met de juiste klantnamen.
    expect(mockNotificeer).toHaveBeenCalledTimes(2);
    const m1 = mockNotificeer.mock.calls.find((c) => c[0].toegewezenAan === "m1")?.[0];
    expect(m1.klantNamen).toEqual(["Klant A", "Klant B"]);
    const m2 = mockNotificeer.mock.calls.find((c) => c[0].toegewezenAan === "m2")?.[0];
    expect(m2.klantNamen).toEqual(["Klant C"]);

    // Alle drie de klussen worden als herinnerd gemarkeerd (idempotentie-marker).
    expect(mockMarkeer).toHaveBeenCalledWith(["a1", "a2", "b1"]);
  });

  it("slaat klussen zonder toegewezen monteur over", async () => {
    mockGetKlussen.mockResolvedValue([
      klus("a1", "m1", "Klant A"),
      { ...klus("x", "", "Zwevend"), toegewezen_aan: null },
    ]);

    const res = await GET(req("Bearer geheim"));
    expect(res.status).toBe(200);
    expect(mockNotificeer).toHaveBeenCalledTimes(1);
    expect(mockMarkeer).toHaveBeenCalledWith(["a1"]);
  });

  it("zonder CRON_SECRET in de omgeving draait hij gewoon (geen auth-eis)", async () => {
    vi.stubEnv("CRON_SECRET", "");
    mockGetKlussen.mockResolvedValue([klus("a1", "m1", "Klant A")]);
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mockNotificeer).toHaveBeenCalledTimes(1);
  });
});
