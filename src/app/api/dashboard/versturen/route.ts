import { NextResponse } from "next/server";
import { db, type Melding } from "@/lib/db";
import { meldVerstuurd } from "@/lib/verstuur-notificatie";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Verstuur-poort: zet de opgegeven opdrachten op 'gepland' en meldt de monteurs (mail + SMS).
 * Statusupdate gaat altijd door; een notificatiefout is een waarschuwing, geen blokkade.
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

  // Opdrachten ophalen VÓÓR markeerVerzonden: hun verzonden_* moet nog de vorige plek bevatten, zodat
  // meldVerstuurd verzettingen (zelfde monteur, andere datum) en monteur-wissels kan herkennen.
  const opdrachten: Melding[] = [];
  for (const id of ids) {
    const o = await dbi.getOpdrachtById(id);
    if (o) opdrachten.push(o);
  }

  // Statusupdate EERST: dit is de primaire actie. De melding is secundair.
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

  // Melden (mail + SMS) via de gedeelde helper: huidige monteur(s) krijgen nieuw/verzet, en de vorige
  // monteur krijgt bij een wissel bericht dat de klus niet meer van hem is. Best-effort.
  const { mailFout, smsFout, monteurs } = await meldVerstuurd(dbi, opdrachten);

  return NextResponse.json(
    { ok: true, aantal: opdrachten.length, monteurs, mailWaarschuwing: mailFout ?? smsFout },
    { status: 200 },
  );
}
