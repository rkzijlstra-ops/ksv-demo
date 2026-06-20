import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserId, mockDownload, mockParse } = vi.hoisted(() => ({
  mockUserId: vi.fn(),
  mockDownload: vi.fn(),
  mockParse: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockUserId }));
vi.mock("@/lib/storage", () => ({ storage: () => ({ downloadDocument: mockDownload }) }));
vi.mock("@/lib/claude-client", () => ({ parseOrderWithClaude: mockParse }));

import { POST } from "./route";

function pp(over: Record<string, unknown>) {
  return {
    klant_naam: null, klant_adres: null, referentienummer: null, adviseur: null,
    klant_telefoon: null, klant_email: null, documenttype: "onbekend", leverweek: null,
    keukenzaak: null, meldingen: [], adressen: [], ...over,
  };
}

const req = (body: unknown) =>
  new Request("http://localhost/api/opdrachten/inlezen", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockUserId.mockResolvedValue("u1");
  mockDownload.mockResolvedValue(Buffer.from("x"));
});

describe("POST /api/opdrachten/inlezen", () => {
  it("401 zonder login", async () => {
    mockUserId.mockResolvedValue(null);
    expect((await POST(req({ paden: [] }))).status).toBe(401);
  });

  it("groepeert de ingelezen documenten en geeft de paden per klus terug", async () => {
    mockParse
      .mockResolvedValueOnce(pp({ referentienummer: "166", klant_naam: "van der Velde", documenttype: "orderbevestiging" }))
      .mockResolvedValueOnce(pp({ referentienummer: "172", klant_naam: "Bavel", documenttype: "orderbevestiging" }));
    const res = await POST(
      req({
        paden: [
          { naam: "velde.pdf", type: "application/pdf", pad: "p1" },
          { naam: "bavel.pdf", type: "application/pdf", pad: "p2" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.groepen).toHaveLength(2);
    expect(body.groepen[0].velden.referentienummer).toBe("166");
    expect(body.groepen[0].bestanden[0].pad).toBe("p1");
    expect(body.ongegroepeerd).toEqual([]);
  });
});
