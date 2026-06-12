import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpsert, mockGetOpl, mockUserId, mockGetVerz } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockGetOpl: vi.fn(),
  mockUserId: vi.fn(),
  mockGetVerz: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({
    upsertOpleveringConcept: mockUpsert,
    getOpleveringVoorOpdracht: mockGetOpl,
    getRapportVerzendingen: mockGetVerz,
  }),
}));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockUserId }));

import { GET, POST } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
function postReq(body: unknown) {
  return new Request("http://localhost/api/opdrachten/opdr-1/oplevering", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockUpsert.mockReset();
  mockGetOpl.mockReset();
  mockUserId.mockReset();
  mockGetVerz.mockReset();
  mockGetVerz.mockResolvedValue([]);
  mockUserId.mockResolvedValue("user-1");
  mockUpsert.mockResolvedValue({ id: "opl-1" });
});

describe("POST /api/opdrachten/[id]/oplevering", () => {
  it("slaat concept op met de bewijs-velden en uitkomst, 200", async () => {
    const res = await POST(
      postReq({
        uitkomst: "afgerond",
        eindstaat_foto_urls: ["https://x/eind1.jpg"],
        video_url: "https://x/oplever-videos/v1.mp4",
        handtekening_url: null,
      }),
      params("opdr-1"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("opl-1");
    const arg = mockUpsert.mock.calls[0][0];
    expect(arg.opdracht_id).toBe("opdr-1");
    expect(arg.uitkomst).toBe("afgerond");
    expect(arg.eindstaat_foto_urls).toEqual(["https://x/eind1.jpg"]);
    expect(arg.video_url).toBe("https://x/oplever-videos/v1.mp4");
    expect(arg.user_id).toBe("user-1");
  });

  it("401 als niet ingelogd", async () => {
    mockUserId.mockResolvedValue(null);
    const res = await POST(postReq({ uitkomst: "afgerond" }), params("opdr-1"));
    expect(res.status).toBe(401);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("slaat op zonder uitkomst (eindstaat-keuze geschrapt) en met opmerking", async () => {
    const res = await POST(
      postReq({
        eindstaat_foto_urls: ["https://x/e1.jpg"],
        opmerking: "Klant belt nog voor smetplinten",
      }),
      params("opdr-1"),
    );
    expect(res.status).toBe(200);
    const arg = mockUpsert.mock.calls[0][0];
    expect(arg.uitkomst).toBeUndefined();
    expect(arg.opmerking).toBe("Klant belt nog voor smetplinten");
  });

  it("503 als opslaan mislukt", async () => {
    mockUpsert.mockRejectedValue(new Error("db kapot"));
    const res = await POST(postReq({ uitkomst: "afgerond" }), params("opdr-1"));
    expect(res.status).toBe(503);
  });

  it("laat handtekening_url ongemoeid als die niet in de body zit (tussentijdse opslag)", async () => {
    await POST(
      postReq({ eindstaat_foto_urls: ["https://x/e1.jpg"], video_url: null }),
      params("opdr-1"),
    );
    const arg = mockUpsert.mock.calls[0][0];
    expect("handtekening_url" in arg).toBe(false);
  });

  it("geeft handtekening_url door als die als string is meegegeven", async () => {
    await POST(postReq({ handtekening_url: "https://x/h.png" }), params("opdr-1"));
    expect(mockUpsert.mock.calls[0][0].handtekening_url).toBe("https://x/h.png");
  });

  it("wist handtekening_url bij expliciete null in de body", async () => {
    await POST(postReq({ handtekening_url: null }), params("opdr-1"));
    const arg = mockUpsert.mock.calls[0][0];
    expect("handtekening_url" in arg).toBe(true);
    expect(arg.handtekening_url).toBeNull();
  });

  it("geeft de controle-checklist door en filtert ongeldige punten eruit", async () => {
    await POST(
      postReq({
        controle: [
          { punt: "Geen beschadigingen", akkoord: true },
          { punt: "x", akkoord: "ja" }, // akkoord geen boolean -> weg
          { rommel: 1 }, // geen punt/akkoord -> weg
        ],
      }),
      params("opdr-1"),
    );
    expect(mockUpsert.mock.calls[0][0].controle).toEqual([
      { punt: "Geen beschadigingen", akkoord: true },
    ]);
  });

  it("laat controle ongemoeid als die niet in de body zit (tussentijdse opslag)", async () => {
    await POST(postReq({ eindstaat_foto_urls: [] }), params("opdr-1"));
    expect("controle" in mockUpsert.mock.calls[0][0]).toBe(false);
  });
});

describe("GET /api/opdrachten/[id]/oplevering", () => {
  it("geeft de bestaande oplevering terug", async () => {
    mockGetOpl.mockResolvedValue({ id: "opl-1", opdracht_id: "opdr-1", uitkomst: "afgerond" });
    const res = await GET(new Request("http://localhost/x"), params("opdr-1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.oplevering.id).toBe("opl-1");
  });

  it("geeft null als er nog geen oplevering is", async () => {
    mockGetOpl.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/x"), params("opdr-1"));
    const body = await res.json();
    expect(body.oplevering).toBeNull();
  });
});
