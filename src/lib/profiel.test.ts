import { describe, it, expect } from "vitest";
import { profielVolledig } from "./profiel";

const volledig = {
  naam: "Jan Bakker",
  bedrijfsnaam: "BKM Keukenmontage",
  telefoon: "06-12345678",
  contact_email: "jan@bkm.nl",
};

describe("profielVolledig", () => {
  it("true als alle vier de velden geldig zijn", () => {
    expect(profielVolledig(volledig)).toBe(true);
  });
  it("false zonder naam", () => {
    expect(profielVolledig({ ...volledig, naam: "" })).toBe(false);
  });
  it("false zonder bedrijfsnaam", () => {
    expect(profielVolledig({ ...volledig, bedrijfsnaam: null })).toBe(false);
  });
  it("false bij een ongeldig (niet-mobiel) telefoonnummer", () => {
    expect(profielVolledig({ ...volledig, telefoon: "0701234567" })).toBe(false);
    expect(profielVolledig({ ...volledig, telefoon: null })).toBe(false);
  });
  it("false bij een ongeldig mailadres", () => {
    expect(profielVolledig({ ...volledig, contact_email: "geen-adres" })).toBe(false);
  });
});
