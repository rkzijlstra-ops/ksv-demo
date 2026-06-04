import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedPdf } from "./parser-schema";

// Flexibele chain-mock: alle builder-methods returnen de builder (thenable),
// single/maybeSingle returnen een Promise met het ingestelde resultaat.
const h = vi.hoisted(() => {
  const fns = {
    select: vi.fn(),
    insert: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    not: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    from: vi.fn(),
  };
  let result: { data: unknown; error: unknown } = { data: null, error: null };

  const builder: Record<string, unknown> = {};
  builder.select = (...a: unknown[]) => (fns.select(...a), builder);
  builder.insert = (...a: unknown[]) => (fns.insert(...a), builder);
  builder.upsert = (...a: unknown[]) => (fns.upsert(...a), builder);
  builder.update = (...a: unknown[]) => (fns.update(...a), builder);
  builder.delete = (...a: unknown[]) => (fns.delete(...a), builder);
  builder.eq = (...a: unknown[]) => (fns.eq(...a), builder);
  builder.is = (...a: unknown[]) => (fns.is(...a), builder);
  builder.not = (...a: unknown[]) => (fns.not(...a), builder);
  builder.in = (...a: unknown[]) => (fns.in(...a), builder);
  builder.order = (...a: unknown[]) => (fns.order(...a), builder);
  builder.single = () => (fns.single(), Promise.resolve(result));
  builder.maybeSingle = () => (fns.maybeSingle(), Promise.resolve(result));
  // thenable: await op de builder geeft `result` (voor queries die op .eq()/.order() eindigen)
  builder.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onF, onR);

  const from = (...a: unknown[]) => (fns.from(...a), builder);
  return { fns, from, setResult: (r: { data: unknown; error: unknown }) => (result = r) };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: h.from })),
}));

import { createDb } from "./db";

const cfg = { url: "https://x.supabase.co", secretKey: "sb_secret_xxx" };

const validParsedPdf: ParsedPdf = {
  klant_naam: "J. Jansen",
  klant_adres: "Hoofdstraat 12",
  referentienummer: "7444",
  adviseur: "M. de Vries",
  klant_telefoon: "071-1234567",
  documenttype: "werkbon_service",
  leverweek: null,
  keukenzaak: "Keukenstudio Voorschoten",
  meldingen: [
    {
      keller_code: "F-BK-LD-60",
      omschrijving: "Front bovenkast linksdraaiend 60cm",
      melding_tekst: "Beschadigd bij ontvangst",
    },
  ],
};

beforeEach(() => {
  Object.values(h.fns).forEach((f) => f.mockClear());
  h.setResult({ data: null, error: null });
});

describe("insertPdfMelding", () => {
  it("insert in 'meldingen' met bron='pdf' en alle parser-velden incl klant_telefoon", async () => {
    h.setResult({ data: { id: "abc-123" }, error: null });
    await createDb(cfg).insertPdfMelding(validParsedPdf);

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    expect(h.fns.insert).toHaveBeenCalledWith({ bron: "pdf", ...validParsedPdf });
  });

  it("returnt id van de aangemaakte rij", async () => {
    h.setResult({ data: { id: "abc-123" }, error: null });
    const result = await createDb(cfg).insertPdfMelding(validParsedPdf);
    expect(result.id).toBe("abc-123");
  });

  it("gooit Error met Supabase-message als insert faalt", async () => {
    h.setResult({ data: null, error: { message: "permission denied for table meldingen" } });
    await expect(createDb(cfg).insertPdfMelding(validParsedPdf)).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("getMeldingen", () => {
  it("selecteert alleen opdrachten (opdracht_id IS NULL) gesorteerd op created_at desc", async () => {
    h.setResult({ data: [{ id: "1" }, { id: "2" }], error: null });
    const rows = await createDb(cfg).getMeldingen();

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    expect(h.fns.select).toHaveBeenCalledWith("*");
    expect(h.fns.is).toHaveBeenCalledWith("opdracht_id", null);
    expect(h.fns.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(rows).toHaveLength(2);
  });

  it("returnt lege array als data null is", async () => {
    h.setResult({ data: null, error: null });
    const rows = await createDb(cfg).getMeldingen();
    expect(rows).toEqual([]);
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "connection refused" } });
    await expect(createDb(cfg).getMeldingen()).rejects.toThrow(/connection refused/);
  });
});

describe("getMeldingenVoorOpdracht", () => {
  it("filtert op opdracht_id en sorteert op created_at desc", async () => {
    h.setResult({ data: [{ id: "s1" }], error: null });
    const rows = await createDb(cfg).getMeldingenVoorOpdracht("opdr-1");

    expect(h.fns.eq).toHaveBeenCalledWith("opdracht_id", "opdr-1");
    expect(h.fns.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(rows).toHaveLength(1);
  });

  it("returnt lege array als geen meldingen", async () => {
    h.setResult({ data: null, error: null });
    expect(await createDb(cfg).getMeldingenVoorOpdracht("x")).toEqual([]);
  });
});

describe("getMeldingById", () => {
  it("selecteert op id en geeft rij terug", async () => {
    h.setResult({ data: { id: "row-1", klant_naam: "J. Jansen" }, error: null });
    const row = await createDb(cfg).getMeldingById("row-1");

    expect(h.fns.eq).toHaveBeenCalledWith("id", "row-1");
    expect(row?.klant_naam).toBe("J. Jansen");
  });

  it("returnt null als rij niet bestaat", async () => {
    h.setResult({ data: null, error: null });
    const row = await createDb(cfg).getMeldingById("onbekend");
    expect(row).toBeNull();
  });
});

describe("createMonteurMelding", () => {
  it("insert met bron='monteur', opdracht_id en status='concept' default", async () => {
    h.setResult({ data: { id: "m-1" }, error: null });
    await createDb(cfg).createMonteurMelding({
      opdracht_id: "opdr-9",
      spoed: false,
      ruwe_tekst: "Front beschadigd",
      spraak_tekst: null,
      foto_urls: ["https://x/foto1.jpg"],
      user_id: "u-test",
    });

    const payload = h.fns.insert.mock.calls[0][0];
    expect(payload.bron).toBe("monteur");
    expect(payload.opdracht_id).toBe("opdr-9");
    expect(payload.spoed).toBe(false);
    expect(payload.foto_urls).toEqual(["https://x/foto1.jpg"]);
  });

  it("returnt id en bewaart spoed=true", async () => {
    h.setResult({ data: { id: "m-1" }, error: null });
    const r = await createDb(cfg).createMonteurMelding({
      opdracht_id: "opdr-9",
      spoed: true,
      ruwe_tekst: null,
      spraak_tekst: "ingesproken tekst",
      foto_urls: [],
      user_id: "u-test",
    });
    expect(r.id).toBe("m-1");
    expect(h.fns.insert.mock.calls[0][0].spoed).toBe(true);
  });
});

describe("updateMeldingStatus", () => {
  it("zet verzonden_at als status 'verzonden' wordt", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).updateMeldingStatus("row-1", { status: "verzonden" });

    expect(h.fns.eq).toHaveBeenCalledWith("id", "row-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.status).toBe("verzonden");
    expect(patch.verzonden_at).toBeTypeOf("string");
  });

  it("zet aangepast=true wanneer meegegeven", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).updateMeldingStatus("row-1", { status: "verzonden", aangepast: true });
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.aangepast).toBe(true);
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "update failed" } });
    await expect(
      createDb(cfg).updateMeldingStatus("row-1", { status: "concept" }),
    ).rejects.toThrow(/update failed/);
  });
});

describe("createOpdracht", () => {
  const basisInput = {
    documenttype: "orderbevestiging" as const,
    klant_naam: "De heer en mevrouw van Dijk",
    klant_adres: "Hoge Morsweg 37, 2332 HG Leiden",
    referentienummer: "7407",
    adviseur: "Marco van Leeuwen",
    klant_telefoon: "06-40200603",
    leverweek: "22/2026",
  };

  it("insert top-level opdracht in 'meldingen' met bron='pdf' en kop-velden", async () => {
    h.setResult({ data: { id: "opdr-1" }, error: null });
    await createDb(cfg).createOpdracht(basisInput);

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    const payload = h.fns.insert.mock.calls[0][0];
    expect(payload.bron).toBe("pdf");
    expect(payload.documenttype).toBe("orderbevestiging");
    expect(payload.referentienummer).toBe("7407");
    expect(payload.leverweek).toBe("22/2026");
    expect(payload.meldingen).toEqual([]);
  });

  it("zet user_id/toegewezen_aan op null als niet meegegeven (toekomstvast)", async () => {
    h.setResult({ data: { id: "opdr-1" }, error: null });
    await createDb(cfg).createOpdracht(basisInput);
    const payload = h.fns.insert.mock.calls[0][0];
    expect(payload.user_id).toBeNull();
    expect(payload.toegewezen_aan).toBeNull();
  });

  it("neemt meegegeven user_id/toegewezen_aan over (toekomstvast)", async () => {
    h.setResult({ data: { id: "opdr-1" }, error: null });
    await createDb(cfg).createOpdracht({
      ...basisInput,
      user_id: "u-9",
      toegewezen_aan: "monteur-3",
    });
    const payload = h.fns.insert.mock.calls[0][0];
    expect(payload.user_id).toBe("u-9");
    expect(payload.toegewezen_aan).toBe("monteur-3");
  });

  it("bewaart meegegeven service-meldingen op de opdracht-rij", async () => {
    h.setResult({ data: { id: "opdr-1" }, error: null });
    await createDb(cfg).createOpdracht({
      ...basisInput,
      documenttype: "werkbon_service",
      meldingen: [{ keller_code: "KELL", omschrijving: "Merk algemeen", melding_tekst: "afdekplaatjes manco" }],
    });
    const payload = h.fns.insert.mock.calls[0][0];
    expect(payload.meldingen).toHaveLength(1);
  });

  it("returnt id van de opdracht", async () => {
    h.setResult({ data: { id: "opdr-77" }, error: null });
    const r = await createDb(cfg).createOpdracht(basisInput);
    expect(r.id).toBe("opdr-77");
  });

  it("neemt keukenzaak mee als die is meegegeven", async () => {
    h.setResult({ data: { id: "opdr-1" }, error: null });
    await createDb(cfg).createOpdracht({ ...basisInput, keukenzaak: "Keukensale.com Katwijk" });
    const payload = h.fns.insert.mock.calls[0][0];
    expect(payload.keukenzaak).toBe("Keukensale.com Katwijk");
  });

  it("zet keukenzaak op null als niet meegegeven", async () => {
    h.setResult({ data: { id: "opdr-1" }, error: null });
    await createDb(cfg).createOpdracht(basisInput);
    const payload = h.fns.insert.mock.calls[0][0];
    expect(payload.keukenzaak).toBeNull();
  });

  it("gooit Error bij insert-fout", async () => {
    h.setResult({ data: null, error: { message: "permission denied" } });
    await expect(createDb(cfg).createOpdracht(basisInput)).rejects.toThrow(/permission denied/);
  });
});

describe("addDocument", () => {
  const docInput = {
    opdracht_id: "opdr-1",
    type: "pdf" as const,
    bestandsnaam: "7407-orderafdruk.pdf",
    storage_pad: "uuid.pdf",
    publieke_url: "https://x/opdracht-documenten/uuid.pdf",
    referentienummer: "7407",
    is_primair: true,
    user_id: "u-test",
  };

  it("insert in tabel 'documenten' met alle velden", async () => {
    h.setResult({ data: { id: "doc-1" }, error: null });
    await createDb(cfg).addDocument(docInput);

    expect(h.fns.from).toHaveBeenCalledWith("documenten");
    const payload = h.fns.insert.mock.calls[0][0];
    expect(payload.opdracht_id).toBe("opdr-1");
    expect(payload.type).toBe("pdf");
    expect(payload.is_primair).toBe(true);
    expect(payload.publieke_url).toContain("opdracht-documenten");
  });

  it("returnt id van het document", async () => {
    h.setResult({ data: { id: "doc-9" }, error: null });
    const r = await createDb(cfg).addDocument(docInput);
    expect(r.id).toBe("doc-9");
  });

  it("gooit Error bij insert-fout", async () => {
    h.setResult({ data: null, error: { message: "fk violation" } });
    await expect(createDb(cfg).addDocument(docInput)).rejects.toThrow(/fk violation/);
  });
});

describe("getDocumentenVoorOpdracht", () => {
  it("filtert op opdracht_id en sorteert op created_at oplopend", async () => {
    h.setResult({ data: [{ id: "d1" }, { id: "d2" }], error: null });
    const rows = await createDb(cfg).getDocumentenVoorOpdracht("opdr-1");

    expect(h.fns.from).toHaveBeenCalledWith("documenten");
    expect(h.fns.eq).toHaveBeenCalledWith("opdracht_id", "opdr-1");
    expect(h.fns.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(rows).toHaveLength(2);
  });

  it("returnt lege array als geen documenten", async () => {
    h.setResult({ data: null, error: null });
    expect(await createDb(cfg).getDocumentenVoorOpdracht("x")).toEqual([]);
  });
});

describe("markeerOpgeleverd", () => {
  it("zet opdracht_status='opgeleverd', opgeleverd_at en rapport_url", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).markeerOpgeleverd("opdr-1", "https://x/rapport.pdf");

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.opdracht_status).toBe("opgeleverd");
    expect(patch.opgeleverd_at).toBeTypeOf("string");
    expect(patch.rapport_url).toBe("https://x/rapport.pdf");
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "update kapot" } });
    await expect(
      createDb(cfg).markeerOpgeleverd("opdr-1", "https://x/r.pdf"),
    ).rejects.toThrow(/update kapot/);
  });
});

describe("verwijderOpdracht (soft-delete)", () => {
  it("markeert de rij als verwijderd (update verwijderd_at), wist niet echt", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).verwijderOpdracht("opdr-1");

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    expect(h.fns.delete).not.toHaveBeenCalled();
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.verwijderd_at).toBeTypeOf("string");
    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "soft kapot" } });
    await expect(createDb(cfg).verwijderOpdracht("opdr-1")).rejects.toThrow(/soft kapot/);
  });
});

describe("herstelOpdracht", () => {
  it("zet verwijderd_at terug op null", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).herstelOpdracht("opdr-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.verwijderd_at).toBeNull();
    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
  });
});

describe("definitiefVerwijderen", () => {
  it("verwijdert de rij echt (delete) op id", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).definitiefVerwijderen("opdr-1");
    expect(h.fns.delete).toHaveBeenCalled();
    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
  });
});

describe("getVerwijderdeOpdrachten", () => {
  it("selecteert opdrachten met verwijderd_at gezet", async () => {
    h.setResult({ data: [{ id: "v1" }], error: null });
    const rows = await createDb(cfg).getVerwijderdeOpdrachten();
    expect(h.fns.is).toHaveBeenCalledWith("opdracht_id", null);
    expect(h.fns.not).toHaveBeenCalledWith("verwijderd_at", "is", null);
    expect(rows).toHaveLength(1);
  });
});

describe("markeerSpoedVerzonden", () => {
  it("zet spoed_verzonden_at op de melding", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).markeerSpoedVerzonden("m-1");
    expect(h.fns.eq).toHaveBeenCalledWith("id", "m-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.spoed_verzonden_at).toBeTypeOf("string");
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "spoed kapot" } });
    await expect(createDb(cfg).markeerSpoedVerzonden("m-1")).rejects.toThrow(/spoed kapot/);
  });
});

describe("getMeldingTellingen", () => {
  it("aggregeert per opdracht_id het aantal en of er spoed is", async () => {
    h.setResult({
      data: [
        { opdracht_id: "a", spoed: false },
        { opdracht_id: "a", spoed: true },
        { opdracht_id: "b", spoed: false },
      ],
      error: null,
    });
    const t = await createDb(cfg).getMeldingTellingen();

    expect(h.fns.not).toHaveBeenCalledWith("opdracht_id", "is", null);
    expect(t["a"]).toEqual({ aantal: 2, heeftSpoed: true });
    expect(t["b"]).toEqual({ aantal: 1, heeftSpoed: false });
  });

  it("lege map als er geen meldingen zijn", async () => {
    h.setResult({ data: null, error: null });
    expect(await createDb(cfg).getMeldingTellingen()).toEqual({});
  });
});

describe("verwijderDocument", () => {
  it("verwijdert de rij uit 'documenten' op id", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).verwijderDocument("doc-1");

    expect(h.fns.from).toHaveBeenCalledWith("documenten");
    expect(h.fns.delete).toHaveBeenCalled();
    expect(h.fns.eq).toHaveBeenCalledWith("id", "doc-1");
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "doc weg kapot" } });
    await expect(createDb(cfg).verwijderDocument("doc-1")).rejects.toThrow(/doc weg kapot/);
  });
});

describe("updateMelding", () => {
  it("werkt velden + versie bij en zet aangepast=true bij versie > 1", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).updateMelding("row-1", {
      spoed: true,
      ruwe_tekst: "Toch erger dan gedacht",
      foto_urls: ["https://x/f2.jpg"],
      status: "verzonden",
      versie: 2,
    });

    expect(h.fns.eq).toHaveBeenCalledWith("id", "row-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.spoed).toBe(true);
    expect(patch.versie).toBe(2);
    expect(patch.aangepast).toBe(true);
    expect(patch.verzonden_at).toBeTypeOf("string");
  });

  it("versie 1 betekent niet aangepast", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).updateMelding("row-1", {
      spoed: false,
      ruwe_tekst: null,
      foto_urls: [],
      status: "concept",
      versie: 1,
    });
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.aangepast).toBe(false);
    expect(patch.verzonden_at).toBeUndefined();
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "update kapot" } });
    await expect(
      createDb(cfg).updateMelding("row-1", {
        spoed: false,
        ruwe_tekst: null,
        foto_urls: [],
        status: "verzonden",
        versie: 3,
      }),
    ).rejects.toThrow(/update kapot/);
  });
});

describe("upsertOpleveringConcept", () => {
  const input = {
    opdracht_id: "opdr-1",
    uitkomst: "afgerond" as const,
    eindstaat_foto_urls: ["https://x/eind1.jpg"],
    video_url: "https://x/oplever-videos/v1.mp4",
    handtekening_url: null,
  };

  it("upsert in 'opleveringen' op opdracht_id met de bewijs-velden", async () => {
    h.setResult({ data: { id: "opl-1" }, error: null });
    await createDb(cfg).upsertOpleveringConcept(input);

    expect(h.fns.from).toHaveBeenCalledWith("opleveringen");
    expect(h.fns.upsert).toHaveBeenCalled();
    const payload = h.fns.upsert.mock.calls[0][0];
    expect(payload.opdracht_id).toBe("opdr-1");
    expect(payload.uitkomst).toBe("afgerond");
    expect(payload.eindstaat_foto_urls).toEqual(["https://x/eind1.jpg"]);
    expect(payload.video_url).toBe("https://x/oplever-videos/v1.mp4");
    const opts = h.fns.upsert.mock.calls[0][1];
    expect(opts).toMatchObject({ onConflict: "opdracht_id" });
  });

  it("returnt id van de oplevering", async () => {
    h.setResult({ data: { id: "opl-9" }, error: null });
    const r = await createDb(cfg).upsertOpleveringConcept(input);
    expect(r.id).toBe("opl-9");
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "upsert kapot" } });
    await expect(createDb(cfg).upsertOpleveringConcept(input)).rejects.toThrow(/upsert kapot/);
  });

  it("laat handtekening_url uit de payload als die niet is meegegeven (overschrijft niet)", async () => {
    h.setResult({ data: { id: "opl-1" }, error: null });
    await createDb(cfg).upsertOpleveringConcept({
      opdracht_id: "opdr-1",
      eindstaat_foto_urls: [],
      video_url: null,
    });
    const payload = h.fns.upsert.mock.calls[0][0];
    expect("handtekening_url" in payload).toBe(false);
  });

  it("neemt handtekening_url op als die als string is meegegeven", async () => {
    h.setResult({ data: { id: "opl-1" }, error: null });
    await createDb(cfg).upsertOpleveringConcept({
      opdracht_id: "opdr-1",
      eindstaat_foto_urls: [],
      video_url: null,
      handtekening_url: "https://x/h.png",
    });
    expect(h.fns.upsert.mock.calls[0][0].handtekening_url).toBe("https://x/h.png");
  });

  it("wist handtekening_url bij expliciete null", async () => {
    h.setResult({ data: { id: "opl-1" }, error: null });
    await createDb(cfg).upsertOpleveringConcept({
      opdracht_id: "opdr-1",
      eindstaat_foto_urls: [],
      video_url: null,
      handtekening_url: null,
    });
    const payload = h.fns.upsert.mock.calls[0][0];
    expect("handtekening_url" in payload).toBe(true);
    expect(payload.handtekening_url).toBeNull();
  });
});

describe("getOpleveringVoorOpdracht", () => {
  it("selecteert op opdracht_id en geeft de oplevering terug", async () => {
    h.setResult({ data: { id: "opl-1", opdracht_id: "opdr-1", uitkomst: "afgerond" }, error: null });
    const opl = await createDb(cfg).getOpleveringVoorOpdracht("opdr-1");

    expect(h.fns.from).toHaveBeenCalledWith("opleveringen");
    expect(h.fns.eq).toHaveBeenCalledWith("opdracht_id", "opdr-1");
    expect(opl?.id).toBe("opl-1");
  });

  it("returnt null als er nog geen oplevering is", async () => {
    h.setResult({ data: null, error: null });
    expect(await createDb(cfg).getOpleveringVoorOpdracht("opdr-x")).toBeNull();
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "lees kapot" } });
    await expect(createDb(cfg).getOpleveringVoorOpdracht("opdr-1")).rejects.toThrow(/lees kapot/);
  });
});

describe("finaliseerOplevering", () => {
  it("zet rapport_url op de oplevering van die opdracht", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).finaliseerOplevering("opdr-1", "https://x/rapport.pdf");

    expect(h.fns.from).toHaveBeenCalledWith("opleveringen");
    expect(h.fns.eq).toHaveBeenCalledWith("opdracht_id", "opdr-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.rapport_url).toBe("https://x/rapport.pdf");
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "finaliseer kapot" } });
    await expect(
      createDb(cfg).finaliseerOplevering("opdr-1", "https://x/r.pdf"),
    ).rejects.toThrow(/finaliseer kapot/);
  });
});

// ---- compleet-systeem blok 0: dashboard/planning ----

const PEIL = new Date("2026-06-03T12:00:00.000Z");
function dagenGeleden(n: number): string {
  return new Date(PEIL.getTime() - n * 86_400_000).toISOString();
}

describe("getOpdrachtenVoorDashboard", () => {
  it("selecteert opdracht-rijen (opdracht_id null, niet verwijderd) op created_at desc", async () => {
    h.setResult({ data: [], error: null });
    await createDb(cfg).getOpdrachtenVoorDashboard(PEIL);

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    expect(h.fns.is).toHaveBeenCalledWith("opdracht_id", null);
    expect(h.fns.is).toHaveBeenCalledWith("verwijderd_at", null);
    expect(h.fns.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("past de 14-dagen-scoping toe: actief blijft, oud opgeleverd valt af", async () => {
    h.setResult({
      data: [
        { id: "actief", dashboard_status: "gepland", opgeleverd_at: null, created_at: dagenGeleden(400) },
        { id: "recent", dashboard_status: "opgeleverd", opgeleverd_at: dagenGeleden(3), created_at: dagenGeleden(3) },
        { id: "oud", dashboard_status: "opgeleverd", opgeleverd_at: dagenGeleden(20), created_at: dagenGeleden(20) },
      ],
      error: null,
    });
    const rows = await createDb(cfg).getOpdrachtenVoorDashboard(PEIL);
    expect(rows.map((r) => r.id)).toEqual(["actief", "recent"]);
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "dashboard kapot" } });
    await expect(createDb(cfg).getOpdrachtenVoorDashboard(PEIL)).rejects.toThrow(/dashboard kapot/);
  });
});

describe("getOpdrachtById", () => {
  it("haalt één opdracht-rij op id", async () => {
    h.setResult({ data: { id: "opdr-1" }, error: null });
    const row = await createDb(cfg).getOpdrachtById("opdr-1");

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
    expect(row?.id).toBe("opdr-1");
  });

  it("returnt null als de opdracht niet bestaat", async () => {
    h.setResult({ data: null, error: null });
    expect(await createDb(cfg).getOpdrachtById("weg")).toBeNull();
  });
});

describe("zoekOpReferentie", () => {
  it("zoekt op referentienummer, opdracht-rijen, nieuwste eerst", async () => {
    h.setResult({ data: [{ id: "a" }, { id: "b" }], error: null });
    const rows = await createDb(cfg).zoekOpReferentie("7444");

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    expect(h.fns.eq).toHaveBeenCalledWith("referentienummer", "7444");
    expect(h.fns.is).toHaveBeenCalledWith("opdracht_id", null);
    expect(h.fns.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(rows).toHaveLength(2);
  });

  it("returnt lege array bij onbekend referentienummer", async () => {
    h.setResult({ data: null, error: null });
    expect(await createDb(cfg).zoekOpReferentie("0000")).toEqual([]);
  });
});

describe("planOpdracht", () => {
  it("zet monteur, datum, tijd en duur; status naar concept_gepland; synct uitvoerdatum", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).planOpdracht("opdr-1", {
      toegewezen_aan: "piet-uid",
      monteur_naam: "piet",
      startdatum: "2026-06-10",
      starttijd: "10:00",
      duur_dagen: 1,
    });

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.monteur_naam).toBe("piet");
    expect(patch.toegewezen_aan).toBe("piet-uid");
    expect(patch.startdatum).toBe("2026-06-10");
    expect(patch.starttijd).toBe("10:00");
    expect(patch.duur_dagen).toBe(1);
    expect(patch.dashboard_status).toBe("concept_gepland");
    expect(patch.uitvoerdatum).toBe("2026-06-10");
  });

  it("staat een lege starttijd toe (dagblok, montage)", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).planOpdracht("opdr-2", {
      toegewezen_aan: "henk-uid",
      monteur_naam: "henk",
      startdatum: "2026-06-11",
      starttijd: null,
      duur_dagen: 2,
    });
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.starttijd).toBeNull();
    expect(patch.duur_dagen).toBe(2);
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "plan kapot" } });
    await expect(
      createDb(cfg).planOpdracht("x", {
        toegewezen_aan: null,
        monteur_naam: null,
        startdatum: "2026-06-10",
        starttijd: null,
        duur_dagen: 1,
      }),
    ).rejects.toThrow(/plan kapot/);
  });
});

describe("markeerVerzonden", () => {
  it("zet gepland, reset gewijzigd en onthoudt de verzonden plek", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).markeerVerzonden("opdr-1", {
      monteur_naam: "Rein",
      startdatum: "2026-06-10",
      starttijd: "10:00",
    });

    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.dashboard_status).toBe("gepland");
    expect(patch.gewijzigd_te_versturen).toBe(false);
    expect(patch.verzonden_monteur).toBe("Rein");
    expect(patch.verzonden_startdatum).toBe("2026-06-10");
    expect(patch.verzonden_starttijd).toBe("10:00");
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "verstuur kapot" } });
    await expect(
      createDb(cfg).markeerVerzonden("a", { monteur_naam: "x", startdatum: "2026-06-10", starttijd: null }),
    ).rejects.toThrow(/verstuur kapot/);
  });
});

describe("bevestigOntvangst", () => {
  it("zet de opdracht op bevestigd met een bevestigd_at-tijdstempel", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).bevestigOntvangst("opdr-1");

    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.dashboard_status).toBe("bevestigd");
    expect(typeof patch.bevestigd_at).toBe("string");
  });
});

describe("wijzigOpdracht", () => {
  it("zet de gewijzigd-marker als een verstuurde opdracht naar een andere plek gaat", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).wijzigOpdracht(
      "opdr-1",
      { toegewezen_aan: "rein-uid", monteur_naam: "Rein", startdatum: "2026-06-20", starttijd: null, duur_dagen: 1 },
      "gepland",
      { toegewezen_aan: "rein-uid", monteur_naam: "Rein", startdatum: "2026-06-10", starttijd: null },
    );
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.startdatum).toBe("2026-06-20");
    expect(patch.gewijzigd_te_versturen).toBe(true);
  });

  it("heft de gewijzigd-marker op als hij exact terug op de verzonden plek staat", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).wijzigOpdracht(
      "opdr-1",
      { toegewezen_aan: "rein-uid", monteur_naam: "Rein", startdatum: "2026-06-10", starttijd: null, duur_dagen: 1 },
      "gepland",
      { toegewezen_aan: "rein-uid", monteur_naam: "Rein", startdatum: "2026-06-10", starttijd: null },
    );
    expect(h.fns.update.mock.calls[0][0].gewijzigd_te_versturen).toBe(false);
  });

  it("een nog niet verstuurde opdracht (concept) krijgt geen marker", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).wijzigOpdracht(
      "opdr-1",
      { toegewezen_aan: "rein-uid", monteur_naam: "Rein", startdatum: "2026-06-20", starttijd: null, duur_dagen: 1 },
      "concept_gepland",
      null,
    );
    expect(h.fns.update.mock.calls[0][0].gewijzigd_te_versturen).toBe(false);
  });
});

describe("annuleerOpdracht", () => {
  it("zet de opdracht op geannuleerd", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).annuleerOpdracht("opdr-1");
    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
    expect(h.fns.update.mock.calls[0][0].dashboard_status).toBe("geannuleerd");
  });
});

describe("ontplanOpdracht", () => {
  it("zet de opdracht terug op binnen en wist de planning", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).ontplanOpdracht("opdr-1");
    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.dashboard_status).toBe("binnen");
    expect(patch.monteur_naam).toBeNull();
    expect(patch.startdatum).toBeNull();
    expect(patch.starttijd).toBeNull();
  });
});

describe("profielen", () => {
  it("getProfiel haalt het profiel op id op", async () => {
    h.setResult({ data: { id: "u1", rol: "monteur", naam: "Piet" }, error: null });
    const p = await createDb(cfg).getProfiel("u1");
    expect(h.fns.from).toHaveBeenCalledWith("profielen");
    expect(h.fns.eq).toHaveBeenCalledWith("id", "u1");
    expect(p?.rol).toBe("monteur");
  });

  it("getProfiel returnt null als er geen profiel is", async () => {
    h.setResult({ data: null, error: null });
    expect(await createDb(cfg).getProfiel("weg")).toBeNull();
  });

  it("getStandaardOpdrachtgever pakt de eerste zaak", async () => {
    h.setResult({ data: [{ id: "z1", naam: "KSV" }, { id: "z2", naam: "Ander" }], error: null });
    const z = await createDb(cfg).getStandaardOpdrachtgever();
    expect(h.fns.from).toHaveBeenCalledWith("opdrachtgevers");
    expect(z?.id).toBe("z1");
  });

  it("getMonteurs haalt monteurs én beheerders op (beheerder werkt mee)", async () => {
    h.setResult({ data: [{ id: "m1", rol: "monteur", naam: "Piet" }], error: null });
    const m = await createDb(cfg).getMonteurs();
    expect(h.fns.from).toHaveBeenCalledWith("profielen");
    expect(h.fns.in).toHaveBeenCalledWith("rol", ["monteur", "beheerder"]);
    expect(m).toHaveLength(1);
  });

  it("upsertProfiel schrijft id/rol/naam/zaak met onConflict id", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).upsertProfiel({ id: "u1", rol: "monteur", naam: "Piet", opdrachtgever_id: "z1" });
    expect(h.fns.from).toHaveBeenCalledWith("profielen");
    const [payload, opts] = h.fns.upsert.mock.calls[0];
    expect(payload).toMatchObject({ id: "u1", rol: "monteur", naam: "Piet", opdrachtgever_id: "z1" });
    expect(opts).toEqual({ onConflict: "id" });
  });
});
