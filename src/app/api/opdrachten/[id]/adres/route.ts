import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Adres-keuze (blok 20): legt het door een mens gekozen montageadres vast op een klus die meerdere
 * adressen had. Daarna staat het juiste adres in klant_adres en is de keuze-vlag weg, zodat het
 * dashboard de klus weer laat plannen. Net als de werk-omschrijving mag de monteur dit op zijn EIGEN
 * klus doen (inbox-voorstel); kantoor (beheerder/opdrachtgever) mag altijd. RLS scheelt de
 * zichtbaarheid al; de eigendom-check hieronder weigert daarbovenop een vreemde klus.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  }

  const eigen = await dbi.getProfiel(userId);
  const isVanMij = opdracht.toegewezen_aan === userId || opdracht.user_id === userId;
  if (eigen?.rol === "monteur" && !isVanMij) {
    return NextResponse.json(
      { error: "Je kunt alleen het adres van je eigen klus kiezen" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  const adres = typeof body.adres === "string" ? body.adres.trim() : "";
  if (!adres) {
    return NextResponse.json({ error: "Geen adres opgegeven" }, { status: 400 });
  }

  try {
    await dbi.kiesAdres(id, adres);
  } catch (err) {
    return NextResponse.json(
      { error: `Adres opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, klant_adres: adres }, { status: 200 });
}
