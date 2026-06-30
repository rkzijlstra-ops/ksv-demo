import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockGetProfiel, mockIsDemo } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockIsDemo: vi.fn(),
}));

// redirect() gooit in Next; we bootsen dat na zodat we de doel-URL kunnen aflezen en de flow stopt.
vi.mock("next/navigation", () => ({
  redirect: (pad: string) => {
    throw new Error(`REDIRECT:${pad}`);
  },
}));
vi.mock("./supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
}));
vi.mock("./db", () => ({ db: async () => ({ getProfiel: mockGetProfiel }) }));
vi.mock("./demo", () => ({ isDemoMode: mockIsDemo }));

import { vereisRol } from "./toegang";

const monteur = (over: Record<string, unknown> = {}) => ({
  id: "u1",
  rol: "monteur",
  naam: "Jan",
  bedrijfsnaam: "BKM",
  telefoon: "0612345678",
  contact_email: "jan@bkm.nl",
  ...over,
});

beforeEach(() => {
  mockGetUser.mockReset();
  mockGetProfiel.mockReset();
  mockIsDemo.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "jan@bkm.nl" } } });
  mockIsDemo.mockReturnValue(false);
});

describe("vereisRol onboarding-gate", () => {
  it("stuurt een monteur met onvolledig profiel naar /welkom", async () => {
    mockGetProfiel.mockResolvedValue(monteur({ contact_email: null }));
    await expect(vereisRol(["monteur"])).rejects.toThrow("REDIRECT:/welkom");
  });

  it("laat een monteur met volledig profiel gewoon door", async () => {
    mockGetProfiel.mockResolvedValue(monteur());
    const res = await vereisRol(["monteur"]);
    expect(res.profiel.rol).toBe("monteur");
  });

  it("skipOnboarding voorkomt de /welkom-redirect (de welkom-pagina zelf)", async () => {
    mockGetProfiel.mockResolvedValue(monteur({ telefoon: null }));
    const res = await vereisRol(["monteur"], { skipOnboarding: true });
    expect(res.profiel.id).toBe("u1");
  });

  it("in demo-modus geen onboarding-redirect, ook bij onvolledig profiel", async () => {
    mockIsDemo.mockReturnValue(true);
    mockGetProfiel.mockResolvedValue(monteur({ bedrijfsnaam: null, telefoon: null, contact_email: null }));
    const res = await vereisRol(["monteur"]);
    expect(res.profiel.rol).toBe("monteur");
  });

  it("een onvolledig beheerder-profiel wordt niet naar /welkom gestuurd", async () => {
    mockGetProfiel.mockResolvedValue({ id: "u1", rol: "beheerder", naam: "Beheer", bedrijfsnaam: null, telefoon: null, contact_email: null });
    const res = await vereisRol(["beheerder"]);
    expect(res.profiel.rol).toBe("beheerder");
  });

  it("niet ingelogd -> /login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(vereisRol(["monteur"])).rejects.toThrow("REDIRECT:/login");
  });

  it("stuurt een opdrachtgever die nog niet bevestigde naar /welkom-opdrachtgever", async () => {
    mockGetProfiel.mockResolvedValue({ id: "u1", rol: "opdrachtgever", naam: "Sandra", welkom_bevestigd: false });
    await expect(vereisRol(["opdrachtgever"])).rejects.toThrow("REDIRECT:/welkom-opdrachtgever");
  });

  it("laat een opdrachtgever die al bevestigde gewoon door", async () => {
    mockGetProfiel.mockResolvedValue({ id: "u1", rol: "opdrachtgever", naam: "Sandra", welkom_bevestigd: true });
    const res = await vereisRol(["opdrachtgever"]);
    expect(res.profiel.rol).toBe("opdrachtgever");
  });

  it("skipOnboarding voorkomt de welkom-opdrachtgever-redirect (de pagina zelf)", async () => {
    mockGetProfiel.mockResolvedValue({ id: "u1", rol: "opdrachtgever", naam: "Sandra", welkom_bevestigd: false });
    const res = await vereisRol(["opdrachtgever"], { skipOnboarding: true });
    expect(res.profiel.id).toBe("u1");
  });

  it("in demo-modus geen welkom-redirect voor een opdrachtgever", async () => {
    mockIsDemo.mockReturnValue(true);
    mockGetProfiel.mockResolvedValue({ id: "u1", rol: "opdrachtgever", naam: "Sandra", welkom_bevestigd: false });
    const res = await vereisRol(["opdrachtgever"]);
    expect(res.profiel.rol).toBe("opdrachtgever");
  });
});
