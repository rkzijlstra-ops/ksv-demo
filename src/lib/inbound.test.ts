import { describe, it, expect } from "vitest";
import { inboundAdres, tokenUitAdressen, genereerInboundToken } from "./inbound";

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
