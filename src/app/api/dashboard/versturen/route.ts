import { NextResponse } from "next/server";
import { db, type Melding } from "@/lib/db";
import { notificeerNieuweOpdrachten } from "@/lib/notificaties";
import { historieVoorMonteur } from "@/lib/monteur-mail";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Verstuur-poort: zet de opgegeven opdrachten op 'gepland' en mailt de monteurs.
 * Statusupdate gaat altijd door; een mailfout is een waarschuwing, geen blokkade.
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

  const dbi = await db();

  // Opdrachten ophalen en per monteur (account) bundelen.
  const opdrachten: Melding[] = [];
  for (const id of ids) {
    const o = await dbi.getOpdrachtById(id);
    if (o) opdrachten.push(o);
  }
  const perMonteur = new Map<string, Melding[]>();
  for (const o of opdrachten) {
    const sleutel = o.toegewezen_aan ?? o.monteur_naam;
    if (!sleutel) continue;
    (perMonteur.get(sleutel) ?? perMonteur.set(sleutel, []).get(sleutel)!).push(o);
  }

  // Statusupdate EERST: dit is de primaire actie. Mail is secundair.
  try {
    for (const o of opdrachten) {
      // status -> gepland, gewijzigd uit, huidige plek onthouden als verzonden plek
      await dbi.markeerVerzonden(o.id, {
        toegewezen_aan: o.toegewezen_aan,
        monteur_naam: o.monteur_naam,
        startdatum: o.startdatum,
        starttijd: o.starttijd,
      });
    }
  } catch (err) {
    return NextResponse.json({ error: `Versturen mislukt: ${(err as Error).message}` }, { status: 503 });
  }

  // Melden naar de monteur (mail + SMS) via de dispatcher, gebundeld per monteur. Best-effort: een
  // fout wordt een waarschuwing, de status is al bijgewerkt.
  let mailWaarschuwing: string | null = null;
  for (const eigen of perMonteur.values()) {
    const eerste = eigen[0];
    // Per opdracht de eerdere bezoeken op dezelfde referentie meesturen (rapport-links in de mail).
    const metHistorie = await Promise.all(
      eigen.map(async (o) => ({
        ...o,
        historie: o.referentienummer
          ? historieVoorMonteur(await dbi.zoekOpReferentie(o.referentienummer), o.id)
          : undefined,
      })),
    );
    const r = await notificeerNieuweOpdrachten({
      toegewezenAan: eerste.toegewezen_aan,
      monteurNaam: eerste.monteur_naam ?? "monteur",
      opdrachten: metHistorie,
      zaaknaam: eerste.keukenzaak,
    });
    if (!mailWaarschuwing && (r.mailFout || r.smsFout)) {
      mailWaarschuwing = r.mailFout ?? r.smsFout;
    }
  }

  return NextResponse.json(
    { ok: true, aantal: opdrachten.length, monteurs: perMonteur.size, mailWaarschuwing },
    { status: 200 },
  );
}
