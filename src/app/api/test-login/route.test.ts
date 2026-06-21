import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSignIn, mockCreate, mockListUsers, mockUpdateUser, mockCreateUser, mockUpsert } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockCreate: vi.fn(),
  mockListUsers: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockCreateUser: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: mockCreate }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { admin: { listUsers: mockListUsers, updateUserById: mockUpdateUser, createUser: mockCreateUser } },
    from: () => ({
      select: () => ({ order: () => ({ limit: async () => ({ data: [{ id: "zaak1" }] }) }) }),
      upsert: mockUpsert,
    }),
  }),
}));

import { GET } from "./route";

const orig = { env: process.env.VERCEL_ENV, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY };

beforeEach(() => {
  vi.clearAllMocks();
  mockSignIn.mockResolvedValue({ error: null });
  mockUpdateUser.mockResolvedValue({ error: null });
  mockUpsert.mockResolvedValue({ error: null });
  mockListUsers.mockResolvedValue({
    data: {
      users: [
        { id: "uid-kantoor", email: "test-beheerder@kluslus.test" },
        { id: "uid-monteur", email: "test-monteur@kluslus.test" },
      ],
    },
  });
  mockCreate.mockResolvedValue({ auth: { signInWithPassword: mockSignIn } });
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
});
afterEach(() => {
  for (const [k, v] of Object.entries({ VERCEL_ENV: orig.env, SUPABASE_URL: orig.url, SUPABASE_SECRET_KEY: orig.key })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const req = (rol?: string) => new Request(`http://localhost/api/test-login${rol ? `?rol=${rol}` : ""}`);

describe("GET /api/test-login", () => {
  it("redirect naar home en logt NIET in op productie", async () => {
    process.env.VERCEL_ENV = "production";
    const res = await GET(req("kantoor"));
    expect(res.headers.get("location")).toBe("http://localhost/");
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("zet het account klaar (wachtwoord + profiel) en logt in als kantoor -> /dashboard", async () => {
    process.env.VERCEL_ENV = "preview";
    const res = await GET(req("kantoor"));
    expect(mockUpdateUser).toHaveBeenCalledWith("uid-kantoor", { password: "Testbeheerder1!", email_confirm: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "uid-kantoor", rol: "beheerder" }),
      { onConflict: "id" },
    );
    expect(mockSignIn).toHaveBeenCalledWith({ email: "test-beheerder@kluslus.test", password: "Testbeheerder1!" });
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("maakt het account aan als het nog niet bestaat (verse database)", async () => {
    process.env.VERCEL_ENV = "preview";
    mockListUsers.mockResolvedValue({ data: { users: [] } });
    mockCreateUser.mockResolvedValue({ data: { user: { id: "nieuw-uid" } } });
    await GET(req("kantoor"));
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test-beheerder@kluslus.test", email_confirm: true }),
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "nieuw-uid", rol: "beheerder" }),
      { onConflict: "id" },
    );
  });

  it("logt in als monteur (default) en stuurt naar / (lokaal, geen VERCEL_ENV)", async () => {
    delete process.env.VERCEL_ENV;
    const res = await GET(req());
    expect(mockSignIn).toHaveBeenCalledWith({ email: "test-monteur@kluslus.test", password: "Testmonteur1!" });
    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("stuurt naar /login?test=nogniet als inloggen faalt", async () => {
    process.env.VERCEL_ENV = "preview";
    mockSignIn.mockResolvedValue({ error: { message: "nope" } });
    const res = await GET(req("kantoor"));
    expect(res.headers.get("location")).toBe("http://localhost/login?test=nogniet");
  });
});
