import { describe, it, expect } from "vitest";
import { detectPlatform, navUrl } from "./nav";

describe("detectPlatform", () => {
  it("herkent Android", () => {
    expect(
      detectPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36"),
    ).toBe("android");
  });

  it("herkent iPhone", () => {
    expect(
      detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"),
    ).toBe("ios");
  });

  it("herkent iPad", () => {
    expect(detectPlatform("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("ios");
  });

  it("valt terug op 'other' voor desktop", () => {
    expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("other");
  });

  it("geeft 'other' bij lege user-agent", () => {
    expect(detectPlatform("")).toBe("other");
  });
});

describe("navUrl", () => {
  const adres = "Hoofdstraat 12, 2342 AB Voorschoten";
  const encoded = encodeURIComponent(adres);

  it("Android gebruikt geo: URI", () => {
    expect(navUrl(adres, "android")).toBe(`geo:0,0?q=${encoded}`);
  });

  it("iOS gebruikt Google Maps https", () => {
    expect(navUrl(adres, "ios")).toBe(`https://maps.google.com/?q=${encoded}`);
  });

  it("other gebruikt Google Maps https (browser-fallback)", () => {
    expect(navUrl(adres, "other")).toBe(`https://maps.google.com/?q=${encoded}`);
  });

  it("encodeert speciale tekens in het adres", () => {
    expect(navUrl("Plein & Co 1", "android")).toBe("geo:0,0?q=Plein%20%26%20Co%201");
  });
});
