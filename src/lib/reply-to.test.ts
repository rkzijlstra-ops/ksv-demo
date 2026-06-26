import { describe, it, expect } from "vitest";
import { bepaalReplyTo } from "./reply-to";

describe("bepaalReplyTo", () => {
  it("gebruikt het monteur-mailadres als dat geldig is", () => {
    expect(bepaalReplyTo("piet@bedrijf.nl", "antwoord@kluslus.nl")).toBe("piet@bedrijf.nl");
  });
  it("trimt het monteur-adres", () => {
    expect(bepaalReplyTo("  piet@bedrijf.nl ", "antwoord@kluslus.nl")).toBe("piet@bedrijf.nl");
  });
  it("valt terug op het vangnet bij leeg/null adres", () => {
    expect(bepaalReplyTo(null, "antwoord@kluslus.nl")).toBe("antwoord@kluslus.nl");
    expect(bepaalReplyTo("", "antwoord@kluslus.nl")).toBe("antwoord@kluslus.nl");
  });
  it("valt terug op het vangnet bij ongeldig adres", () => {
    expect(bepaalReplyTo("geen-adres", "antwoord@kluslus.nl")).toBe("antwoord@kluslus.nl");
  });
  it("geeft undefined als er geen geldig adres en geen vangnet is", () => {
    expect(bepaalReplyTo(null, undefined)).toBeUndefined();
  });
});
