import { NextResponse } from "next/server";
import { parsePdfWithClaude } from "@/lib/claude-client";
import { storage } from "@/lib/storage";
import { db, type OpdrachtInput } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function strVeld(fd: FormData, naam: string): string | null {
  const v = fd.get(naam);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: `Kon multipart niet lezen: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  // --- Tekst-only opdracht (geen documenten) ---
  if (files.length === 0) {
    const klant_naam = strVeld(formData, "klant_naam");
    const klant_adres = strVeld(formData, "klant_adres");
    const referentienummer = strVeld(formData, "referentienummer");
    const klant_telefoon = strVeld(formData, "klant_telefoon");
    const keukenzaak = strVeld(formData, "keukenzaak");
    if (!klant_naam && !klant_adres && !referentienummer && !klant_telefoon) {
      return NextResponse.json(
        { error: "Geen documenten en geen klantgegevens opgegeven" },
        { status: 400 },
      );
    }
    try {
      const { id } = await (await db()).createOpdracht({
        documenttype: "tekst",
        klant_naam,
        klant_adres,
        referentienummer,
        adviseur: null,
        klant_telefoon,
        leverweek: null,
        keukenzaak,
        user_id: userId,
      });
      return NextResponse.json({ id, documenttype: "tekst", documenten: [] }, { status: 200 });
    } catch (err) {
      return NextResponse.json(
        { error: `DB-insert mislukt: ${(err as Error).message}` },
        { status: 503 },
      );
    }
  }

  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Bestand te groot: ${f.name} (${f.size} bytes, max ${MAX_FILE_BYTES})` },
        { status: 413 },
      );
    }
  }

  // Primair document = eerste PDF (waaruit de kop wordt uitgelezen).
  const primair = files.find((f) => f.type === "application/pdf") ?? null;

  let kop: OpdrachtInput = {
    documenttype: "onbekend",
    klant_naam: null,
    klant_adres: null,
    referentienummer: null,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    meldingen: [],
    user_id: userId,
  };

  if (primair) {
    try {
      const parsed = await parsePdfWithClaude(Buffer.from(await primair.arrayBuffer()));
      kop = {
        documenttype: parsed.documenttype,
        klant_naam: parsed.klant_naam,
        klant_adres: parsed.klant_adres,
        referentienummer: parsed.referentienummer,
        adviseur: parsed.adviseur,
        klant_telefoon: parsed.klant_telefoon,
        leverweek: parsed.leverweek,
        keukenzaak: parsed.keukenzaak,
        meldingen: parsed.meldingen,
        user_id: userId,
      };
    } catch {
      // Parser faalt: opdracht tóch aanmaken met lege kop, origineel blijft bewaard.
      kop.documenttype = "onbekend";
    }
  }

  let opdrachtId: string;
  const dbi = await db();
  try {
    const r = await dbi.createOpdracht(kop);
    opdrachtId = r.id;
  } catch (err) {
    return NextResponse.json(
      { error: `DB-insert mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  const documenten: Array<{
    id: string;
    bestandsnaam: string;
    type: "pdf" | "afbeelding";
    publieke_url: string;
    is_primair: boolean;
  }> = [];
  try {
    for (const f of files) {
      const type = f.type === "application/pdf" ? "pdf" : "afbeelding";
      const buf = Buffer.from(await f.arrayBuffer());
      const { pad, publieke_url } = await storage().uploadOpdrachtDocument(buf, f.name, f.type);
      const { id: docId } = await dbi.addDocument({
        opdracht_id: opdrachtId,
        type,
        bestandsnaam: f.name,
        storage_pad: pad,
        publieke_url,
        referentienummer: kop.referentienummer,
        is_primair: f === primair,
        user_id: userId,
      });
      documenten.push({ id: docId, bestandsnaam: f.name, type, publieke_url, is_primair: f === primair });
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Document opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json({ id: opdrachtId, ...kop, documenten }, { status: 200 });
}
