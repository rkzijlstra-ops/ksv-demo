import { NextResponse } from "next/server";
import { parsePdfWithClaude } from "@/lib/claude-client";
import { adresKeuzeNodig } from "@/lib/adres-keuze";
import { storage } from "@/lib/storage";
import { db, type OpdrachtInput } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";
import { groepeerOpRef } from "@/lib/inschiet-groep";
import { logActie } from "@/lib/gebeurtenis";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const LEGE_KOP: Omit<OpdrachtInput, "user_id"> = {
  documenttype: "onbekend",
  klant_naam: null,
  klant_adres: null,
  referentienummer: null,
  adviseur: null,
  klant_telefoon: null,
  klant_email: null,
  leverweek: null,
  keukenzaak: null,
  meldingen: [],
};

/**
 * Dashboard-inschieten: één of meer PDF's tegelijk. Elke PDF wordt gelezen, daarna worden ze
 * gegroepeerd op referentienummer (zelfde ref = één opdracht met meerdere documenten,
 * verschillende refs = aparte opdrachten, geen ref = eigen opdracht met aandacht-markering).
 * Geeft een samenvatting terug zodat de opdrachtgever ziet wat er is aangemaakt.
 */
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
  if (files.length === 0) {
    return NextResponse.json({ error: "Geen documenten meegestuurd" }, { status: 400 });
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Bestand te groot: ${f.name} (max ${MAX_FILE_BYTES} bytes)` },
        { status: 413 },
      );
    }
  }

  // Buffers één keer lezen (nodig voor parsen én opslaan), kop per bestand bepalen.
  const buffers: Buffer[] = [];
  const koppen: OpdrachtInput[] = [];
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer());
    buffers.push(buf);
    if (f.type === "application/pdf") {
      try {
        const parsed = await parsePdfWithClaude(buf);
        // Adres-keuze: meerdere adressen op de PDF? Niets gokken; klant_adres leeg en de klus
        // vlaggen zodat de planner op het dashboard bewust de montagelocatie kiest.
        const keuzeNodig = adresKeuzeNodig(parsed.adressen);
        koppen.push({
          documenttype: parsed.documenttype,
          klant_naam: parsed.klant_naam,
          klant_adres: keuzeNodig ? null : parsed.klant_adres,
          referentienummer: parsed.referentienummer,
          adviseur: parsed.adviseur,
          klant_telefoon: parsed.klant_telefoon,
          klant_email: parsed.klant_email,
          leverweek: parsed.leverweek,
          keukenzaak: parsed.keukenzaak,
          meldingen: parsed.meldingen,
          adres_kandidaten: parsed.adressen.length ? parsed.adressen : null,
          adres_keuze_nodig: keuzeNodig,
          user_id: userId,
        });
      } catch {
        koppen.push({ ...LEGE_KOP, user_id: userId });
      }
    } else {
      koppen.push({ ...LEGE_KOP, user_id: userId });
    }
  }

  const groepen = groepeerOpRef(koppen.map((k) => ({ referentienummer: k.referentienummer })));

  const dbi = await db();

  // Welke kantoor-zaak hoort bij deze inschiet? Opdrachtgever = zijn eigen zaak; beheerder = de
  // meegestuurde zaak, of de enige zaak als terugval (keuze-veld komt pas bij 2+ zaken).
  const eigenProfiel = await dbi.getProfiel(userId);
  let opdrachtgeverId: string | null = null;
  if (eigenProfiel?.rol === "opdrachtgever") {
    opdrachtgeverId = eigenProfiel.opdrachtgever_id;
  } else {
    const gekozen = formData.get("opdrachtgever_id");
    opdrachtgeverId =
      typeof gekozen === "string" && gekozen.trim()
        ? gekozen.trim()
        : (await dbi.getStandaardOpdrachtgever())?.id ?? null;
  }

  const aangemaakt: Array<{
    id: string;
    klant_naam: string | null;
    referentienummer: string | null;
    aantalDocumenten: number;
    aandacht: boolean;
  }> = [];

  try {
    for (const groep of groepen) {
      const kop = koppen[groep.indexen[0]];
      const { id: opdrachtId } = await dbi.createOpdracht({ ...kop, opdrachtgever_id: opdrachtgeverId });

      for (const idx of groep.indexen) {
        const f = files[idx];
        const type = f.type === "application/pdf" ? "pdf" : "afbeelding";
        const { pad, publieke_url } = await storage().uploadOpdrachtDocument(
          buffers[idx],
          f.name,
          f.type,
        );
        await dbi.addDocument({
          opdracht_id: opdrachtId,
          type,
          bestandsnaam: f.name,
          storage_pad: pad,
          publieke_url,
          referentienummer: kop.referentienummer,
          is_primair: idx === groep.indexen[0],
          user_id: userId,
        });
      }

      await logActie(
        dbi,
        opdrachtId,
        "ingeschoten",
        { id: userId, naam: eigenProfiel?.naam, rol: eigenProfiel?.rol },
        { klant: kop.klant_naam },
      );

      aangemaakt.push({
        id: opdrachtId,
        klant_naam: kop.klant_naam,
        referentienummer: groep.referentienummer,
        aantalDocumenten: groep.indexen.length,
        aandacht: groep.aandacht,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      aangemaakt,
      aantalOpdrachten: aangemaakt.length,
      aantalDocumenten: files.length,
    },
    { status: 200 },
  );
}
