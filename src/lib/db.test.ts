import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedPdf } from "./parser-schema";

// Flexibele chain-mock: alle builder-methods returnen de builder (thenable),
// single/maybeSingle returnen een Promise met het ingestelde resultaat.
const h = vi.hoisted(() => {
  const fns = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    from: vi.fn(),
  };
  let result: { data: unknown; error: unknown } = { data: null, error: null };

  const builder: Record<string, unknown> = {};
  builder.select = (...a: unknown[]) => (fns.select(...a), builder);
  builder.insert = (...a: unknown[]) => (fns.insert(...a), builder);
  builder.update = (...a: unknown[]) => (fns.update(...a), builder);
  builder.delete = (...a: unknown[]) => (fns.delete(...a), builder);
  builder.eq = (...a: unknown[]) => (fns.eq(...a), builder);
  builder.is = (...a: unknown[]) => (fns.is(...a), builder);
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
      urgentie: "geel",
      ruwe_tekst: "Front beschadigd",
      spraak_tekst: null,
      foto_urls: ["https://x/foto1.jpg"],
    });

    const payload = h.fns.insert.mock.calls[0][0];
    expect(payload.bron).toBe("monteur");
    expect(payload.opdracht_id).toBe("opdr-9");
    expect(payload.status).toBe("concept");
    expect(payload.urgentie).toBe("geel");
    expect(payload.foto_urls).toEqual(["https://x/foto1.jpg"]);
  });

  it("returnt id", async () => {
    h.setResult({ data: { id: "m-1" }, error: null });
    const r = await createDb(cfg).createMonteurMelding({
      opdracht_id: "opdr-9",
      urgentie: "rood",
      ruwe_tekst: null,
      spraak_tekst: "ingesproken tekst",
      foto_urls: [],
    });
    expect(r.id).toBe("m-1");
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

describe("verwijderOpdracht", () => {
  it("verwijdert de rij uit 'meldingen' op id (cascade ruimt documenten + meldingen)", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).verwijderOpdracht("opdr-1");

    expect(h.fns.from).toHaveBeenCalledWith("meldingen");
    expect(h.fns.delete).toHaveBeenCalled();
    expect(h.fns.eq).toHaveBeenCalledWith("id", "opdr-1");
  });

  it("gooit Error bij DB-fout", async () => {
    h.setResult({ data: null, error: { message: "delete kapot" } });
    await expect(createDb(cfg).verwijderOpdracht("opdr-1")).rejects.toThrow(/delete kapot/);
  });
});

describe("updateMelding", () => {
  it("werkt velden + versie bij en zet aangepast=true bij versie > 1", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).updateMelding("row-1", {
      urgentie: "rood",
      ruwe_tekst: "Toch erger dan gedacht",
      foto_urls: ["https://x/f2.jpg"],
      status: "verzonden",
      versie: 2,
    });

    expect(h.fns.eq).toHaveBeenCalledWith("id", "row-1");
    const patch = h.fns.update.mock.calls[0][0];
    expect(patch.urgentie).toBe("rood");
    expect(patch.versie).toBe(2);
    expect(patch.aangepast).toBe(true);
    expect(patch.verzonden_at).toBeTypeOf("string");
  });

  it("versie 1 betekent niet aangepast", async () => {
    h.setResult({ data: null, error: null });
    await createDb(cfg).updateMelding("row-1", {
      urgentie: "geel",
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
        urgentie: "rood",
        ruwe_tekst: null,
        foto_urls: [],
        status: "verzonden",
        versie: 3,
      }),
    ).rejects.toThrow(/update kapot/);
  });
});
