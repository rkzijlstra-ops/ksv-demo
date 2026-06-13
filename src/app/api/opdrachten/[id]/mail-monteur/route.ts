import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meldVerstuurd } from "@/lib/verstuur-notificatie";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Verstuurt één opdracht naar de toegewezen monteur en zet hem op 'gepland'. Gebruikt dezelfde
 * gedeelde melder als de bulk-poort "Verstuur naar monteurs" (mail + SMS, verzet-toon bij een
 * verzetting, en bericht aan de vorige monteur bij een wissel). Status eerst, melding best-effort.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  const dbi = await db();
  // Ophalen VÓÓR markeerVerzonden: verzonden_* moet nog de vorige plek bevatten (zie meldVerstuurd).
  const opdracht = await dbi.getOpdrachtById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  }
  if (!opdracht.monteur_naam) {
    return NextResponse.json(
      { error: "Geen monteur toegewezen; plan de opdracht eerst in." },
      { status: 400 },
    );
  }

  // Status eerst (primaire actie); de melding is best-effort, net als bij de bulk-poort.
  try {
    await dbi.markeerVerzonden(id, {
      toegewezen_aan: opdracht.toegewezen_aan,
      monteur_naam: opdracht.monteur_naam,
      startdatum: opdracht.startdatum,
      starttijd: opdracht.starttijd,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Status zetten mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  const { mailFout, smsFout } = await meldVerstuurd(dbi, [opdracht]);

  return NextResponse.json({ ok: true, mailFout, smsFout }, { status: 200 });
}
