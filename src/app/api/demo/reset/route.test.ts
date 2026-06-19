import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSeed, mockCreateClient } = vi.hoisted(() => ({
  mockSeed: vi.fn(),
  mockCreateClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mockCreateClient }));
vi.mock("@/lib/demo-seed", () => ({ seedDemo: mockSeed }));

import { POST } from "./route";

const orig = { demo: process.env.DEMO_MODE, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY };
beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_URL = "https://demo.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_demo";
  mockSeed.mockResolvedValue({ accounts: {}, aantalKlussen: 7 });
});
afterEach(() => {
  for (const [k, v] of Object.entries({ DEMO_MODE: orig.demo, SUPABASE_URL: orig.url, SUPABASE_SECRET_KEY: orig.key })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("POST /api/demo/reset", () => {
  const req = (body?: unknown) =>
    new Request("http://localhost/api/demo/reset", {
      method: "POST",
      ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
    });

  it("403 buiten demo-modus (geen seed)", async () => {
    delete process.env.DEMO_MODE;
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(mockSeed).not.toHaveBeenCalled();
  });

  it("seedt en geeft 200 in demo-modus (gewone reset = beheerder behouden)", async () => {
    process.env.DEMO_MODE = "1";
    const res = await POST(req({ volledig: false }));
    expect(res.status).toBe(200);
    expect(mockSeed).toHaveBeenCalledWith(expect.anything(), { behoudKantoorContact: true });
  });

  it("volledige reset geeft behoudKantoorContact=false", async () => {
    process.env.DEMO_MODE = "1";
    const res = await POST(req({ volledig: true }));
    expect(res.status).toBe(200);
    expect(mockSeed).toHaveBeenCalledWith(expect.anything(), { behoudKantoorContact: false });
  });
});
