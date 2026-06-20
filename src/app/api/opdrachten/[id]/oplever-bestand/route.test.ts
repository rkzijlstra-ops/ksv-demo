import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockAuthId,
  mockGetProfiel,
  mockGetMelding,
  mockGetOplevering,
  mockVerwijderFoto,
  mockVerwijderVideo,
} = vi.hoisted(() => ({
  mockAuthId: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockGetMelding: vi.fn(),
  mockGetOplevering: vi.fn(),
  mockVerwijderFoto: vi.fn(),
  mockVerwijderVideo: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({
    getProfiel: mockGetProfiel,
    getMeldingById: mockGetMelding,
    getOpleveringVoorOpdracht: mockGetOplevering,
  }),
}));
vi.mock("@/lib/storage", () => ({
  storage: () => ({ verwijderOpleverFoto: mockVerwijderFoto, verwijderOpleverVideo: mockVerwijderVideo }),
}));

import { DELETE } from "./route";

const FOTO_URL = "https://x.supabase.co/storage/v1/object/public/meldingen-fotos/abc.jpg";
const VIDEO_URL = "https://x.supabase.co/storage/v1/object/public/oplever-videos/clip.mp4";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (url: unknown) =>
  new Request("http://localhost/api/opdrachten/opd-1/oplever-bestand", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("monteur-uid");
  mockGetProfiel.mockResolvedValue({ rol: "monteur" });
  mockGetMelding.mockResolvedValue({ id: "opd-1", toegewezen_aan: "monteur-uid", user_id: "monteur-uid" });
  mockGetOplevering.mockResolvedValue({
    klant_rapport_verzonden_at: null,
    zaak_rapport_verzonden_at: null,
  });
  mockVerwijderFoto.mockResolvedValue(undefined);
  mockVerwijderVideo.mockResolvedValue(undefined);
});

describe("DELETE /api/opdrachten/[id]/oplever-bestand", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await DELETE(req(FOTO_URL), params("opd-1"));
    expect(res.status).toBe(401);
    expect(mockVerwijderFoto).not.toHaveBeenCalled();
  });

  it("403 voor een rol zonder oplever-rechten (opdrachtgever)", async () => {
    mockGetProfiel.mockResolvedValue({ rol: "opdrachtgever" });
    const res = await DELETE(req(FOTO_URL), params("opd-1"));
    expect(res.status).toBe(403);
    expect(mockVerwijderFoto).not.toHaveBeenCalled();
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetMelding.mockResolvedValue(null);
    const res = await DELETE(req(FOTO_URL), params("weg"));
    expect(res.status).toBe(404);
  });

  it("403 als de monteur niet aan de opdracht is toegewezen", async () => {
    mockGetMelding.mockResolvedValue({ id: "opd-1", toegewezen_aan: "andere", user_id: "andere" });
    const res = await DELETE(req(FOTO_URL), params("opd-1"));
    expect(res.status).toBe(403);
    expect(mockVerwijderFoto).not.toHaveBeenCalled();
  });

  it("409 als het rapport al verstuurd is (geen storage-wissen meer)", async () => {
    mockGetOplevering.mockResolvedValue({
      klant_rapport_verzonden_at: "2026-06-19T10:00:00Z",
      zaak_rapport_verzonden_at: null,
    });
    const res = await DELETE(req(FOTO_URL), params("opd-1"));
    expect(res.status).toBe(409);
    expect(mockVerwijderFoto).not.toHaveBeenCalled();
  });

  it("400 als de url niet bij een bekende oplever-bucket hoort", async () => {
    const res = await DELETE(req("https://x/storage/v1/object/public/iets-anders/a.jpg"), params("opd-1"));
    expect(res.status).toBe(400);
  });

  it("verwijdert een foto uit de juiste bucket, 200", async () => {
    const res = await DELETE(req(FOTO_URL), params("opd-1"));
    expect(res.status).toBe(200);
    expect(mockVerwijderFoto).toHaveBeenCalledWith("abc.jpg");
    expect(mockVerwijderVideo).not.toHaveBeenCalled();
  });

  it("verwijdert een video uit de juiste bucket, 200", async () => {
    const res = await DELETE(req(VIDEO_URL), params("opd-1"));
    expect(res.status).toBe(200);
    expect(mockVerwijderVideo).toHaveBeenCalledWith("clip.mp4");
    expect(mockVerwijderFoto).not.toHaveBeenCalled();
  });

  it("beheerder mag ook zonder toewijzing", async () => {
    mockGetProfiel.mockResolvedValue({ rol: "beheerder" });
    mockGetMelding.mockResolvedValue({ id: "opd-1", toegewezen_aan: "andere", user_id: "andere" });
    const res = await DELETE(req(FOTO_URL), params("opd-1"));
    expect(res.status).toBe(200);
    expect(mockVerwijderFoto).toHaveBeenCalledWith("abc.jpg");
  });

  it("blijft 200 als de storage-opruiming faalt (best-effort)", async () => {
    mockVerwijderFoto.mockRejectedValue(new Error("storage stuk"));
    const res = await DELETE(req(FOTO_URL), params("opd-1"));
    expect(res.status).toBe(200);
  });
});
