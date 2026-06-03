import { NextResponse } from "next/server";
import { db, type Melding } from "@/lib/db";
import { verstuurMonteurMail } from "@/lib/mail";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Verstuur-poort: mailt de opgegeven opdrachten naar de monteurs (gebundeld per monteur, één mail
 * per monteur) en zet ze op 'gepland' (gewijzigd-marker reset). Ontvanger is in de demo
 * RAPPORT_EMAIL; later het adres van elke monteur (blok 6).
 */
export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Geen opdrachten om te versturen" }, { status: 400 });
  }

  const naar = process.env.RAPPORT_EMAIL?.trim();
  if (!naar) {
    return NextResponse.json(
      { error: "RAPPORT_EMAIL ontbreekt in de serverconfig (.env.local)" },
      { status: 500 },
    );
  }

  const dbi = await db();

  // Opdrachten ophalen en per monteur bundelen.
  const opdrachten: Melding[] = [];
  for (const id of ids) {
    const o = await dbi.getOpdrachtById(id);
    if (o) opdrachten.push(o);
  }
  const perMonteur = new Map<string, Melding[]>();
  for (const o of opdrachten) {
    if (!o.monteur_naam) continue;
    (perMonteur.get(o.monteur_naam) ?? perMonteur.set(o.monteur_naam, []).get(o.monteur_naam)!).push(o);
  }

  try {
    for (const [monteurNaam, eigen] of perMonteur) {
      await verstuurMonteurMail({ naar, monteurNaam, opdrachten: eigen });
    }
  } catch (err) {
    return NextResponse.json({ error: `Mailen mislukt: ${(err as Error).message}` }, { status: 502 });
  }

  try {
    for (const o of opdrachten) {
      // status -> gepland, gewijzigd uit, huidige plek onthouden als verzonden plek
      await dbi.markeerVerzonden(o.id, {
        monteur_naam: o.monteur_naam,
        startdatum: o.startdatum,
        starttijd: o.starttijd,
      });
    }
  } catch (err) {
    return NextResponse.json({ error: `Versturen mislukt: ${(err as Error).message}` }, { status: 503 });
  }
  return NextResponse.json({ ok: true, aantal: opdrachten.length, monteurs: perMonteur.size }, { status: 200 });
}
