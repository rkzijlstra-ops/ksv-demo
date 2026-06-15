import { NextResponse } from "next/server";
import { parseOrderWithClaude } from "@/lib/claude-client";
import { storage } from "@/lib/storage";
import { db, type OpdrachtInput } from "@/lib/db";
import type { MeldingItem } from "@/lib/parser-schema";
import { getAuthenticatedUserId } from "@/lib/auth";
import { bestemmingVoor, type Rol } from "@/lib/invoer-bestemming";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DOCUMENTTYPES = ["orderbevestiging", "werkbon_service", "onbekend", "tekst"] as const;

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
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Bestand te groot: ${f.name} (${f.size} bytes, max ${MAX_FILE_BYTES})` },
        { status: 413 },
      );
    }
  }

  // --- Alleen lezen: parse de eerste PDF en geef de velden terug, maak NIETS aan en sla niks op. ---
  // Voor de zelf-invoer: het formulier laat zo de gevonden gegevens zien om te bevestigen of aan te vullen.
  if (strVeld(formData, "actie") === "parse") {
    const orderFile =
      files.find((f) => f.type === "application/pdf") ??
      files.find((f) => f.type.startsWith("image/"));
    if (!orderFile) {
      return NextResponse.json({ error: "Geen PDF of foto om te lezen" }, { status: 400 });
    }
    try {
      const parsed = await parseOrderWithClaude(
        Buffer.from(await orderFile.arrayBuffer()),
        orderFile.type,
      );
      return NextResponse.json({ parsed }, { status: 200 });
    } catch (err) {
      // Parser faalt: geen blokkade. De gebruiker vult zelf in; het document blijft hij straks toevoegen.
      return NextResponse.json({ parsed: null, fout: (err as Error).message }, { status: 200 });
    }
  }

  // --- Aanmaken ---
  const velden = {
    klant_naam: strVeld(formData, "klant_naam"),
    klant_adres: strVeld(formData, "klant_adres"),
    referentienummer: strVeld(formData, "referentienummer"),
    adviseur: strVeld(formData, "adviseur"),
    klant_telefoon: strVeld(formData, "klant_telefoon"),
    klant_email: strVeld(formData, "klant_email"),
    leverweek: strVeld(formData, "leverweek"),
    startdatum: strVeld(formData, "startdatum"),
    starttijd: strVeld(formData, "starttijd"),
    keukenzaak: strVeld(formData, "keukenzaak"),
    werkomschrijving: strVeld(formData, "werkomschrijving"),
  };
  const heeftVeld = Object.values(velden).some(Boolean);

  if (!heeftVeld && files.length === 0) {
    return NextResponse.json(
      { error: "Geen document en geen gegevens opgegeven" },
      { status: 400 },
    );
  }

  let kop: OpdrachtInput;

  if (heeftVeld) {
    // De gebruiker heeft gegevens ingevuld (al dan niet voorgevuld door de parser): die zijn leidend,
    // we parsen niet opnieuw zodat zijn correcties blijven staan. Document(en) worden gewoon bewaard.
    const dtRaw = strVeld(formData, "documenttype");
    const documenttype = (DOCUMENTTYPES as readonly string[]).includes(dtRaw ?? "")
      ? (dtRaw as OpdrachtInput["documenttype"])
      : files.length > 0
        ? "onbekend"
        : "tekst";
    let meldingen: MeldingItem[] = [];
    const meldingenRaw = strVeld(formData, "meldingen");
    if (meldingenRaw) {
      try {
        const p = JSON.parse(meldingenRaw);
        if (Array.isArray(p)) meldingen = p as MeldingItem[];
      } catch {
        // ongeldige JSON: dan zonder artikelen, geen blokkade.
      }
    }
    kop = {
      documenttype,
      klant_naam: velden.klant_naam,
      klant_adres: velden.klant_adres,
      referentienummer: velden.referentienummer,
      adviseur: velden.adviseur,
      klant_telefoon: velden.klant_telefoon,
      klant_email: velden.klant_email,
      leverweek: velden.leverweek,
      startdatum: velden.startdatum,
      starttijd: velden.starttijd,
      keukenzaak: velden.keukenzaak,
      werkomschrijving: velden.werkomschrijving,
      meldingen,
      user_id: userId,
      // Zelf inschieten = de klus is meteen van jou (verschijnt in je werkpool).
      toegewezen_aan: userId,
    };
  } else {
    // Geen velden, wel document(en): de eerste PDF of foto wordt uitgelezen (snelle inschiet zonder review).
    const orderFile =
      files.find((f) => f.type === "application/pdf") ??
      files.find((f) => f.type.startsWith("image/")) ??
      null;
    kop = {
      documenttype: "onbekend",
      klant_naam: null,
      klant_adres: null,
      referentienummer: null,
      adviseur: null,
      klant_telefoon: null,
      leverweek: null,
      meldingen: [],
      user_id: userId,
      toegewezen_aan: userId,
    };
    if (orderFile) {
      try {
        const parsed = await parseOrderWithClaude(
          Buffer.from(await orderFile.arrayBuffer()),
          orderFile.type,
        );
        kop = {
          documenttype: parsed.documenttype,
          klant_naam: parsed.klant_naam,
          klant_adres: parsed.klant_adres,
          referentienummer: parsed.referentienummer,
          adviseur: parsed.adviseur,
          klant_telefoon: parsed.klant_telefoon,
          klant_email: parsed.klant_email,
          leverweek: parsed.leverweek,
          keukenzaak: parsed.keukenzaak,
          meldingen: parsed.meldingen,
          user_id: userId,
          toegewezen_aan: userId,
        };
      } catch {
        // Parser faalt: klus tóch aanmaken met lege kop, origineel blijft bewaard.
        kop.documenttype = "onbekend";
      }
    }
  }

  const primair = files.find((f) => f.type === "application/pdf") ?? null;

  let opdrachtId: string;
  const dbi = await db();

  // Rol-bewuste bestemming (één motor, twee gezichten): een monteur schiet voor zichzelf in (eigen
  // werkpool, ad-hoc); kantoor (beheerder/opdrachtgever) maakt een klus voor een zaak die nog gepland
  // moet worden ("te plannen"). De inline toegewezen_aan hierboven wordt hiermee overschreven.
  const eigenProfiel = await dbi.getProfiel(userId);
  const rol = (eigenProfiel?.rol ?? "monteur") as Rol;
  let gekozenZaak: string | null = null;
  if (rol !== "monteur") {
    gekozenZaak =
      strVeld(formData, "opdrachtgever_id") ??
      (rol === "beheerder" ? ((await dbi.getStandaardOpdrachtgever())?.id ?? null) : null);
  }
  const bestemming = bestemmingVoor(
    rol,
    { id: userId, opdrachtgever_id: eigenProfiel?.opdrachtgever_id },
    gekozenZaak,
  );
  kop.toegewezen_aan = bestemming.toegewezen_aan;
  kop.opdrachtgever_id = bestemming.opdrachtgever_id;

  try {
    const r = await dbi.createOpdracht(kop);
    opdrachtId = r.id;
    console.log("[diag-post]", JSON.stringify({ userId, rol, toegewezen: kop.toegewezen_aan, opdrachtgever: kop.opdrachtgever_id, id: opdrachtId }));
  } catch (err) {
    console.log("[diag-post-fout]", (err as Error).message);
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
