import { describe, it, expect, afterEach } from "vitest";
import { isDemoMode, isTestLoginActief, leesAllowlist, ontvangerToegestaan } from "./demo";

const origDemo = process.env.DEMO_MODE;
const origVercelEnv = process.env.VERCEL_ENV;
const origTestLogin = process.env.TEST_LOGIN;
afterEach(() => {
  if (origDemo === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = origDemo;
  if (origVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = origVercelEnv;
  if (origTestLogin === undefined) delete process.env.TEST_LOGIN;
  else process.env.TEST_LOGIN = origTestLogin;
});

describe("isTestLoginActief", () => {
  it("uit in productie, aan in preview en lokaal (geen VERCEL_ENV)", () => {
    delete process.env.TEST_LOGIN;
    process.env.VERCEL_ENV = "production";
    expect(isTestLoginActief()).toBe(false);
    process.env.VERCEL_ENV = "preview";
    expect(isTestLoginActief()).toBe(true);
    delete process.env.VERCEL_ENV;
    expect(isTestLoginActief()).toBe(true);
  });

  it("TEST_LOGIN=1 zet hem aan, ook als de deploy als productie draait (apart test-project)", () => {
    process.env.VERCEL_ENV = "production";
    process.env.TEST_LOGIN = "1";
    expect(isTestLoginActief()).toBe(true);
  });
});

describe("isDemoMode", () => {
  it("true alleen bij DEMO_MODE=1", () => {
    process.env.DEMO_MODE = "1";
    expect(isDemoMode()).toBe(true);
    process.env.DEMO_MODE = "0";
    expect(isDemoMode()).toBe(false);
    delete process.env.DEMO_MODE;
    expect(isDemoMode()).toBe(false);
  });
});

describe("leesAllowlist", () => {
  it("splitst een komma-lijst en trimt lege waarden", () => {
    expect(leesAllowlist(" +31611, +31622 ,, ")).toEqual(["+31611", "+31622"]);
    expect(leesAllowlist(undefined)).toEqual([]);
    expect(leesAllowlist("")).toEqual([]);
  });
});

describe("ontvangerToegestaan", () => {
  it("lege allowlist => geen beperking (verstuur echt, zoals productie)", () => {
    expect(ontvangerToegestaan("+31611", []).toegestaan).toBe(true);
  });

  it("gevulde allowlist => alleen wie erop staat", () => {
    expect(ontvangerToegestaan("+31611", ["+31611"]).toegestaan).toBe(true);
    expect(ontvangerToegestaan("+31699", ["+31611"]).toegestaan).toBe(false);
  });
});
