import { describe, it, expect, vi, afterEach } from "vitest";
import { inboundAdres, tokenUitAdressen, genereerInboundToken, inboundDomein } from "./inbound";

describe("inbound-domein volgt de omgeving (INBOUND_DOMAIN)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("valt zonder env-var terug op kluslus.nl", () => {
    vi.stubEnv("INBOUND_DOMAIN", "");
    expect(inboundDomein()).toBe("kluslus.nl");
    expect(inboundAdres("abc123")).toBe("klus-abc123@kluslus.nl");
  });

  it("bouwt het ontvangstadres op het ingestelde test-domein", () => {
    vi.stubEnv("INBOUND_DOMAIN", "klus-test.kluslus.nl");
    expect(inboundDomein()).toBe("klus-test.kluslus.nl");
    expect(inboundAdres("abc123")).toBe("klus-abc123@klus-test.kluslus.nl");
  });

  it("herkent het token op het ingestelde test-domein (zonder expliciet domein-argument)", () => {
    vi.stubEnv("INBOUND_DOMAIN", "klus-test.kluslus.nl");
    expect(tokenUitAdressen(["klus-abc123@klus-test.kluslus.nl"])).toBe("abc123");
    // Een adres op het oude productie-domein wordt op het test-domein juist NIET herkend.
    expect(tokenUitAdressen(["klus-abc123@kluslus.nl"])).toBeNull();
  });
});

describe("inbound adressering", () => {
  it("bouwt het adres uit een token", () => {
    expect(inboundAdres("abc123", "kluslus.nl")).toBe("klus-abc123@kluslus.nl");
  });

  it("haalt het token uit een ontvangeradres", () => {
    expect(tokenUitAdressen(["klus-abc123@kluslus.nl"], "kluslus.nl")).toBe("abc123");
  });

  it("herkent ook de 'Naam <adres>'-vorm en hoofdletters", () => {
    expect(tokenUitAdressen(["Kluslus <Klus-AbC@Kluslus.NL>"], "kluslus.nl")).toBe("abc");
  });

  it("kiest het juiste adres uit een lijst met meerdere ontvangers", () => {
    expect(
      tokenUitAdressen(["cc@ergens.nl", "klus-deadbeef@kluslus.nl"], "kluslus.nl"),
    ).toBe("deadbeef");
  });

  it("negeert adressen op een ander domein of zonder klus-prefix", () => {
    expect(tokenUitAdressen(["info@kluslus.nl", "klus-x@ander.nl"], "kluslus.nl")).toBeNull();
  });

  it("genereert lowercase hex-tokens van 16 tekens", () => {
    expect(genereerInboundToken()).toMatch(/^[0-9a-f]{16}$/);
  });
});
