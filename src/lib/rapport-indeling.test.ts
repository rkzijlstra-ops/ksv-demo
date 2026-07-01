import { describe, it, expect } from "vitest";
import {
  meldingenBalk,
  fotoGroepen,
  platteFotoLijst,
  extVanUrl,
  fotoDownloadEntries,
  type MeldingVoorFotos,
} from "./rapport-indeling";

function m(over: Partial<MeldingVoorFotos>): MeldingVoorFotos {
  return { id: "m", spoed: false, ruwe_tekst: null, created_at: "2026-06-28T10:00:00Z", foto_urls: [], ...over };
}

describe("meldingenBalk", () => {
  it("groen bij geen meldingen", () => {
    const b = meldingenBalk([]);
    expect(b.status).toBe("geen");
    expect(b.aantal).toBe(0);
    expect(b.spoed).toBe(0);
    expect(b.tekst).toBe("Geen meldingen op deze klus");
  });

  it("oranje bij gewone meldingen zonder spoed", () => {
    const b = meldingenBalk([{ spoed: false }, { spoed: false }]);
    expect(b.status).toBe("gewoon");
    expect(b.aantal).toBe(2);
    expect(b.spoed).toBe(0);
    expect(b.tekst).toBe("2 meldingen op deze klus");
  });

  it("rood zodra er minstens één spoed is, met spoed-telling in de tekst", () => {
    const b = meldingenBalk([{ spoed: true }, { spoed: false }, { spoed: false }]);
    expect(b.status).toBe("spoed");
    expect(b.aantal).toBe(3);
    expect(b.spoed).toBe(1);
    expect(b.tekst).toBe("3 meldingen op deze klus · waarvan 1 spoed");
  });

  it("gebruikt enkelvoud bij precies 1 melding", () => {
    expect(meldingenBalk([{ spoed: false }]).tekst).toBe("1 melding op deze klus");
  });
});

describe("fotoGroepen", () => {
  it("zet meldingen (met tekst) eerst, dan eindstaat, en nummert door", () => {
    const meldingen = [
      m({ id: "m1", spoed: true, ruwe_tekst: "Blad kapot", foto_urls: ["a", "b"] }),
      m({ id: "m2", ruwe_tekst: "Greep los", foto_urls: ["c"] }),
    ];
    const groepen = fotoGroepen(meldingen, ["e1", "e2"]);

    expect(groepen.map((g) => g.soort)).toEqual(["melding", "melding", "eindstaat"]);
    const g0 = groepen[0];
    expect(g0.soort === "melding" && g0.spoed).toBe(true);
    expect(g0.soort === "melding" && g0.tekst).toBe("Blad kapot");
    // nummering loopt door: melding-foto's 1..3, dan eindstaat 4..5
    expect(groepen[0].fotos.map((f) => f.nr)).toEqual([1, 2]);
    expect(groepen[1].fotos.map((f) => f.nr)).toEqual([3]);
    expect(groepen[2].fotos.map((f) => f.nr)).toEqual([4, 5]);
  });

  it("slaat meldingen zonder foto's over", () => {
    const groepen = fotoGroepen([m({ id: "m1", foto_urls: [] })], ["e1"]);
    expect(groepen).toHaveLength(1);
    expect(groepen[0].soort).toBe("eindstaat");
    expect(groepen[0].fotos[0].nr).toBe(1);
  });

  it("geeft lege lijst als er nergens foto's zijn", () => {
    expect(fotoGroepen([m({ foto_urls: [] })], [])).toEqual([]);
  });
});

describe("platteFotoLijst", () => {
  it("index is gelijk aan de positie in de platte lijst (sleutel voor de zip-route)", () => {
    const meldingen = [
      m({ id: "m1", foto_urls: ["a", "b"] }),
      m({ id: "m2", foto_urls: ["c"] }),
    ];
    const alle = platteFotoLijst(meldingen, ["e1"]);
    expect(alle.map((f) => f.url)).toEqual(["a", "b", "c", "e1"]);
    alle.forEach((f, i) => expect(f.index).toBe(i));
    expect(alle.map((f) => f.nr)).toEqual([1, 2, 3, 4]);
  });
});

describe("extVanUrl", () => {
  it("haalt de extensie uit een gewone URL", () => {
    expect(extVanUrl("https://x/y/abc.JPG")).toBe("jpg");
    expect(extVanUrl("https://x/y/abc.png")).toBe("png");
  });
  it("negeert querystring en anker", () => {
    expect(extVanUrl("https://x/abc.jpeg?token=1#frag")).toBe("jpeg");
  });
  it("valt terug op jpg zonder extensie", () => {
    expect(extVanUrl("https://x/geen-extensie")).toBe("jpg");
  });
});

describe("fotoDownloadEntries", () => {
  it("geeft sprekende namen per bron met de rapport-nummering", () => {
    const meldingen = [
      m({ id: "m1", foto_urls: ["https://x/a.jpg", "https://x/b.png"] }),
      m({ id: "m2", foto_urls: ["https://x/c.jpg"] }),
    ];
    const entries = fotoDownloadEntries(meldingen, ["https://x/e.jpg"]);
    expect(entries.map((e) => e.naam)).toEqual([
      "melding-1-foto-1.jpg",
      "melding-1-foto-2.png",
      "melding-2-foto-3.jpg",
      "eindstaat-foto-4.jpg",
    ]);
    expect(entries.map((e) => e.index)).toEqual([0, 1, 2, 3]);
  });
});
