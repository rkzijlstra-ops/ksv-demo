import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserId, mockGetProfiel, mockStandaard, mockCreate, mockAddDoc } = vi.hoisted(() => ({
  mockUserId: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockStandaard: vi.fn(),
  mockCreate: vi.fn(),
  mockAddDoc: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockUserId }));
vi.mock("@/lib/db", () => ({
  db: async () => ({
    getProfiel: mockGetProfiel,
    getStandaardOpdrachtgever: mockStandaard,
    createOpdracht: mockCreate,
    addDocument: mockAddDoc,
  }),
}));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://localhost/api/opdrachten/aanmaken", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockUserId.mockResolvedValue("u1");
  mockGetProfiel.mockResolvedValue({ id: "u1", rol: "beheerder", opdrachtgever_id: null });
  mockStandaard.mockResolvedValue({ id: "zaak1" });
  let n = 0;
  mockCreate.mockImplementation(async () => ({ id: `opdr-${++n}` }));
  mockAddDoc.mockResolvedValue({ id: "doc1" });
});

describe("POST /api/opdrachten/aanmaken", () => {
  it("401 zonder login", async () => {
    mockUserId.mockResolvedValue(null);
    const res = await POST(req({ klussen: [] }));
    expect(res.status).toBe(401);
  });

  it("400 bij geen klussen", async () => {
    const res = await POST(req({ klussen: [] }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("maakt per groep één klus met de juiste documenten", async () => {
    const res = await POST(
      req({
        klussen: [
          {
            velden: { referentienummer: "166", klant_naam: "van der Velde", documenttype: "orderbevestiging" },
            documenten: [{ naam: "orderbon.pdf", type: "application/pdf", pad: "p1", publieke_url: "https://x/p1" }],
          },
          {
            velden: { referentienummer: "172", klant_naam: "Bavel" },
            documenten: [
              { naam: "bon.pdf", type: "application/pdf", pad: "p2", publieke_url: "https://x/p2" },
              { naam: "tekening.jpg", type: "image/jpeg", pad: "p3", publieke_url: "https://x/p3" },
            ],
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.aangemaakt).toHaveLength(2);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate.mock.calls[0][0].referentienummer).toBe("166");
    expect(mockCreate.mock.calls[1][0].referentienummer).toBe("172");
    // 1 + 2 documenten
    expect(mockAddDoc).toHaveBeenCalledTimes(3);
    // de PDF is primair bij klus 2 (niet de afbeelding)
    const tweedeKlusDocs = mockAddDoc.mock.calls.filter((c) => c[0].opdracht_id === "opdr-2");
    const primair = tweedeKlusDocs.find((c) => c[0].is_primair);
    expect(primair?.[0].bestandsnaam).toBe("bon.pdf");
  });

  it("respecteert het door de invoerder gekozen adres bij meerdere kandidaten", async () => {
    // De invoerder koos in KlusInvoer al bewust de montagelocatie (komt mee als klant_adres),
    // maar de volledige kandidatenlijst wordt nog meegestuurd. Het gekozen adres moet winnen.
    const res = await POST(
      req({
        klussen: [
          {
            velden: {
              klant_naam: "D. Lek",
              klant_adres: "7085 W. Jonker",
              adressen: [
                { adres: "7085 W. Jonker", soort: "montage" },
                { adres: "Bouwbedrijf Janssen, Ede", soort: "opdrachtgever" },
              ],
            },
            documenten: [{ naam: "order.pdf", type: "application/pdf", pad: "p1", publieke_url: "https://x/p1" }],
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const kop = mockCreate.mock.calls[0][0];
    expect(kop.klant_adres).toBe("7085 W. Jonker");
    expect(kop.adres_keuze_nodig).toBe(false);
  });

  it("vlagt adres-keuze als er meerdere adressen zijn en niets gekozen is", async () => {
    // Geen keuze gemaakt (klant_adres leeg): dan niets gokken, klus vlaggen zodat een mens kiest.
    const res = await POST(
      req({
        klussen: [
          {
            velden: {
              klant_naam: "D. Lek",
              klant_adres: null,
              adressen: [
                { adres: "7085 W. Jonker", soort: "montage" },
                { adres: "Bouwbedrijf Janssen, Ede", soort: "opdrachtgever" },
              ],
            },
            documenten: [],
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const kop = mockCreate.mock.calls[0][0];
    expect(kop.klant_adres).toBeNull();
    expect(kop.adres_keuze_nodig).toBe(true);
  });
});
