import { NextResponse } from "next/server";
import { db, type OpdrachtInput } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";
import { bestemmingVoor, type Rol } from "@/lib/invoer-bestemming";
import { adresKeuzeNodig } from "@/lib/adres-keuze";
import type { AdresKandidaat, MeldingItem } from "@/lib/parser-schema";

export const runtime = "nodejs";

interface DocRef {
  naam: string;
  type: string;
  pad: string;
  publieke_url: string;
}

interface KlusVelden {
  documenttype?: OpdrachtInput["documenttype"];
  klant_naam?: string | null;
  klant_adres?: string | null;
  referentienummer?: string | null;
  adviseur?: string | null;
  klant_telefoon?: string | null;
  klant_email?: string | null;
  leverweek?: string | null;
  keukenzaak?: string | null;
  werkomschrijving?: string | null;
  startdatum?: string | null;
  starttijd?: string | null;
  meldingen?: MeldingItem[];
  adressen?: AdresKandidaat[];
}

interface KlusInvoerItem {
  velden: KlusVelden;
  documenten: DocRef[];
}

/**
 * Maakt één of meer klussen aan uit reeds-geüploade documenten (op opslagpad). De bytes zijn al in
 * storage (via /upload-urls), dus deze route ontvangt alleen JSON. Per klus: een opdracht-rij + de
 * documenten-rijen die naar de opslagpaden verwijzen. Rol-bewuste bestemming zoals de gewone invoer.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  let body: { klussen?: KlusInvoerItem[]; opdrachtgever_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const klussen = Array.isArray(body.klussen) ? body.klussen.filter((k) => k && k.velden) : [];
  if (klussen.length === 0) {
    return NextResponse.json({ error: "Geen klussen om aan te maken" }, { status: 400 });
  }

  const dbi = await db();
  const eigenProfiel = await dbi.getProfiel(userId);
  const rol = (eigenProfiel?.rol ?? "monteur") as Rol;
  let gekozenZaak: string | null = null;
  if (rol !== "monteur") {
    gekozenZaak =
      (typeof body.opdrachtgever_id === "string" ? body.opdrachtgever_id : null) ??
      (rol === "beheerder" ? ((await dbi.getStandaardOpdrachtgever())?.id ?? null) : null);
  }
  const bestemming = bestemmingVoor(
    rol,
    { id: userId, opdrachtgever_id: eigenProfiel?.opdrachtgever_id },
    gekozenZaak,
  );

  const aangemaakt: Array<{ id: string; klant_naam: string | null }> = [];
  try {
    for (const klus of klussen) {
      const v = klus.velden;
      const adressen = Array.isArray(v.adressen) ? v.adressen : [];
      // De invoerder kan in KlusInvoer al bewust de montagelocatie hebben gekozen (komt mee als
      // klant_adres, ook al blijft de volledige kandidatenlijst meegestuurd). Respecteer die keuze;
      // alleen vlaggen als er meerdere adressen zijn EN er nog niets gekozen is.
      const gekozenAdres = typeof v.klant_adres === "string" ? v.klant_adres.trim() : "";
      const keuzeNodig = adresKeuzeNodig(adressen) && !gekozenAdres;
      const kop: OpdrachtInput = {
        documenttype: v.documenttype ?? "onbekend",
        klant_naam: v.klant_naam ?? null,
        klant_adres: keuzeNodig ? null : (gekozenAdres || null),
        referentienummer: v.referentienummer ?? null,
        adviseur: v.adviseur ?? null,
        klant_telefoon: v.klant_telefoon ?? null,
        klant_email: v.klant_email ?? null,
        leverweek: v.leverweek ?? null,
        keukenzaak: v.keukenzaak ?? null,
        startdatum: v.startdatum ?? null,
        starttijd: v.starttijd ?? null,
        werkomschrijving: v.werkomschrijving ?? null,
        meldingen: Array.isArray(v.meldingen) ? v.meldingen : [],
        adres_kandidaten: adressen.length ? adressen : null,
        adres_keuze_nodig: keuzeNodig,
        user_id: userId,
        toegewezen_aan: bestemming.toegewezen_aan,
        opdrachtgever_id: bestemming.opdrachtgever_id,
      };
      const { id } = await dbi.createOpdracht(kop);

      const documenten = Array.isArray(klus.documenten) ? klus.documenten : [];
      const primair = documenten.find((d) => d.type === "application/pdf") ?? documenten[0] ?? null;
      for (const d of documenten) {
        await dbi.addDocument({
          opdracht_id: id,
          type: d.type === "application/pdf" ? "pdf" : "afbeelding",
          bestandsnaam: d.naam,
          storage_pad: d.pad,
          publieke_url: d.publieke_url,
          referentienummer: kop.referentienummer,
          is_primair: d === primair,
          user_id: userId,
        });
      }
      aangemaakt.push({ id, klant_naam: kop.klant_naam });
    }
  } catch (err) {
    return NextResponse.json({ error: `Aanmaken mislukt: ${(err as Error).message}` }, { status: 503 });
  }

  return NextResponse.json({ aangemaakt }, { status: 200 });
}
