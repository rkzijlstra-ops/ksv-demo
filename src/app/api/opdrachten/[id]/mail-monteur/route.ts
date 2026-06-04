import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verstuurMonteurMail } from "@/lib/mail";
import { getGebruikerEmail } from "@/lib/supabase-admin";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Mailt één opdracht naar de toegewezen monteur en zet hem op 'gepland' (verstuurd).
 * Ontvanger is in de demo RAPPORT_EMAIL; later het adres van de monteur (blok 6).
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

  // Naar het adres van de monteur; valt terug op RAPPORT_EMAIL (demo) als dat er niet is.
  const monteurEmail = opdracht.toegewezen_aan ? await getGebruikerEmail(opdracht.toegewezen_aan) : null;
  const naar = monteurEmail ?? process.env.RAPPORT_EMAIL?.trim();
  if (!naar) {
    return NextResponse.json(
      { error: "Geen e-mailadres voor de monteur en geen RAPPORT_EMAIL ingesteld" },
      { status: 500 },
    );
  }

  try {
    await verstuurMonteurMail({
      naar,
      monteurNaam: opdracht.monteur_naam,
      opdrachten: [opdracht],
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Mailen mislukt: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  try {
    // status -> gepland, gewijzigd-marker uit, en de huidige plek onthouden als verzonden plek
    await dbi.markeerVerzonden(id, {
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

  return NextResponse.json({ ok: true }, { status: 200 });
}
