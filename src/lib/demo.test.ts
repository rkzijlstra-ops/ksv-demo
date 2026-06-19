import { describe, it, expect, afterEach } from "vitest";
import { isDemoMode, leesAllowlist, ontvangerToegestaan } from "./demo";

const origDemo = process.env.DEMO_MODE;
afterEach(() => {
  if (origDemo === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = origDemo;
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
  it("demo + lege allowlist => NIETS (fail-safe)", () => {
    expect(ontvangerToegestaan("+31611", [], true).toegestaan).toBe(false);
  });

  it("geen demo + lege allowlist => wel (normale productie)", () => {
    expect(ontvangerToegestaan("+31611", [], false).toegestaan).toBe(true);
  });

  it("gevulde allowlist => alleen wie erop staat", () => {
    expect(ontvangerToegestaan("+31611", ["+31611"], true).toegestaan).toBe(true);
    expect(ontvangerToegestaan("+31699", ["+31611"], true).toegestaan).toBe(false);
    // ook buiten demo beperkt een gevulde allowlist (bestaand gedrag).
    expect(ontvangerToegestaan("+31699", ["+31611"], false).toegestaan).toBe(false);
  });
});
