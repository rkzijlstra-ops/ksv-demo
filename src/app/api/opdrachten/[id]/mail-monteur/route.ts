import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificeerNieuweOpdrachten } from "@/lib/notificaties";
import { historieVoorMonteur } from "@/lib/monteur-mail";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Verstuurt één opdracht naar de toegewezen monteur en zet hem op 'gepland'. Gebruikt dezelfde
 * notificatie-dispatcher als de bulk-poort "Verstuur naar monteurs" (mail + SMS), zodat het envelopje
 * op de kaart precies hetzelfde doet. Eerder mailde deze route alleen, waardoor de SMS-notificatie via
 * dit pad nooit verstuurd werd (alleen via de bulk-knop). Status eerst, notificatie best-effort.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  const dbi = await db();
  const opdracht = await dbi.getOpdrachtById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }
  if (!opdracht.monteur_naam) {
    return NextResponse.json(
      { error: "Geen monteur toegewezen; plan de opdracht eerst in." },
      { status: 400 },
    );
  }

  // Status eerst (primaire actie); de notificatie is best-effort, net als bij de bulk-poort.
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

  // Eerdere bezoeken op dezelfde referentie meesturen (rapport-links in de mail), net als de bulk-poort.
  const historie = opdracht.referentienummer
    ? historieVoorMonteur(await dbi.zoekOpReferentie(opdracht.referentienummer), opdracht.id)
    : undefined;
  const r = await notificeerNieuweOpdrachten({
    toegewezenAan: opdracht.toegewezen_aan,
    monteurNaam: opdracht.monteur_naam,
    opdrachten: [{ ...opdracht, historie }],
    zaaknaam: opdracht.keukenzaak,
  });

  return NextResponse.json(
    { ok: true, gemaild: r.gemaild, gesmst: r.gesmst, mailFout: r.mailFout, smsFout: r.smsFout },
    { status: 200 },
  );
}
