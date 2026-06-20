import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSignIn, mockCreate } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: mockCreate }));

import { GET } from "./route";

const origEnv = process.env.VERCEL_ENV;

beforeEach(() => {
  vi.clearAllMocks();
  mockSignIn.mockResolvedValue({ error: null });
  mockCreate.mockResolvedValue({ auth: { signInWithPassword: mockSignIn } });
});
afterEach(() => {
  if (origEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = origEnv;
});

const req = (rol?: string) =>
  new Request(`http://localhost/api/test-login${rol ? `?rol=${rol}` : ""}`);

describe("GET /api/test-login", () => {
  it("redirect naar home en logt NIET in op productie", async () => {
    process.env.VERCEL_ENV = "production";
    const res = await GET(req("kantoor"));
    expect(res.headers.get("location")).toBe("http://localhost/");
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("logt in als kantoor en stuurt naar /dashboard (preview)", async () => {
    process.env.VERCEL_ENV = "preview";
    const res = await GET(req("kantoor"));
    expect(mockSignIn).toHaveBeenCalledWith({
      email: "test-beheerder@kluslus.test",
      password: "Testbeheerder1!",
    });
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("logt in als monteur (default) en stuurt naar / (lokaal, geen VERCEL_ENV)", async () => {
    delete process.env.VERCEL_ENV;
    const res = await GET(req());
    expect(mockSignIn).toHaveBeenCalledWith({
      email: "test-monteur@kluslus.test",
      password: "Testmonteur1!",
    });
    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("stuurt naar /login?test=nogniet als inloggen faalt", async () => {
    process.env.VERCEL_ENV = "preview";
    mockSignIn.mockResolvedValue({ error: { message: "nope" } });
    const res = await GET(req("kantoor"));
    expect(res.headers.get("location")).toBe("http://localhost/login?test=nogniet");
  });
});
