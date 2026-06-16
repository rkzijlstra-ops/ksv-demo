import { describe, it, expect } from "vitest";
import { uniekeAdressen, adresKeuzeNodig, type AdresKandidaat } from "./adres-keuze";

const montage: AdresKandidaat = { adres: "Marshalllaan 2, 2215 NZ Voorhout", soort: "montage" };
const bedrijf: AdresKandidaat = { adres: "Ambachtsweg 7, 2222 AH Katwijk", soort: "opdrachtgever" };

describe("uniekeAdressen", () => {
  it("geeft lege lijst terug voor geen kandidaten", () => {
    expect(uniekeAdressen([])).toEqual([]);
  });

  it("laat één adres ongemoeid", () => {
    expect(uniekeAdressen([montage])).toEqual([montage]);
  });

  it("houdt twee verschillende adressen apart", () => {
    expect(uniekeAdressen([montage, bedrijf])).toHaveLength(2);
  });

  it("dedupliceert hetzelfde adres ondanks andere opmaak (hoofdletters, komma's, spaties)", () => {
    const zelfde: AdresKandidaat = { adres: "marshalllaan 2  2215 nz   voorhout", soort: "onbekend" };
    const uniek = uniekeAdressen([montage, zelfde]);
    expect(uniek).toHaveLength(1);
    expect(uniek[0]).toEqual(montage); // eerste voorkomen wint
  });

  it("negeert lege adres-strings", () => {
    const leeg: AdresKandidaat = { adres: "   ", soort: "onbekend" };
    expect(uniekeAdressen([leeg, montage])).toEqual([montage]);
  });
});

describe("adresKeuzeNodig", () => {
  it("is false bij geen adressen", () => {
    expect(adresKeuzeNodig([])).toBe(false);
  });

  it("is false bij precies één uniek adres", () => {
    expect(adresKeuzeNodig([montage])).toBe(false);
  });

  it("is false als twee kandidaten hetzelfde adres zijn", () => {
    const zelfde: AdresKandidaat = { adres: "Marshalllaan 2, 2215 NZ Voorhout", soort: "factuur" };
    expect(adresKeuzeNodig([montage, zelfde])).toBe(false);
  });

  it("is true bij twee verschillende adressen", () => {
    expect(adresKeuzeNodig([montage, bedrijf])).toBe(true);
  });
});
