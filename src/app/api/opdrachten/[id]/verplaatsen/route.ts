import { NextResponse } from "next/server";
import { db, type PlanningInput } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Verplaatst een al geplande opdracht naar een andere monteur/dag/tijd (slepen op het planbord).
 * Behoudt tijd/duur tenzij meegegeven. De huidige status en de verzonden plek worden server-side
 * uit de opdracht gelezen, zodat terugzetten op de verzonden plek de gewijzigd-markering opheft.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  const startdatum = typeof body.startdatum === "string" ? body.startdatum.trim() : "";
  if (!startdatum) {
    return NextResponse.json({ error: "Startdatum is verplicht" }, { status: 400 });
  }

  const dbi = await db();
  const opdracht = await dbi.getOpdrachtById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  }

  // Behoudt de bestaande waarde van een veld als het niet in de body zit ("meegegeven" = aanwezig).
  // Zo wist een sleep-actie die alleen dag/monteur stuurt nooit per ongeluk een meerdaagse montage
  // of een service-tijd. Expliciet null in de body wist wel (bv. service -> dagblok).
  const heeft = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  const duur = Number(body.duur_dagen);
  const planning: PlanningInput = {
    toegewezen_aan: heeft("toegewezen_aan")
      ? (typeof body.toegewezen_aan === "string" && body.toegewezen_aan ? body.toegewezen_aan : null)
      : opdracht.toegewezen_aan,
    monteur_naam: heeft("monteur_naam")
      ? (typeof body.monteur_naam === "string" && body.monteur_naam.trim()
          ? body.monteur_naam.trim()
          : null)
      : opdracht.monteur_naam,
    startdatum,
    starttijd: heeft("starttijd")
      ? (typeof body.starttijd === "string" && body.starttijd.trim() ? body.starttijd.trim() : null)
      : opdracht.starttijd,
    duur_dagen: Number.isFinite(duur) && duur >= 1 ? Math.floor(duur) : opdracht.duur_dagen,
    // Verplaatsen behoudt de weekend-keuze van de klus; alleen een duur-wijziging (meegestuurd) zet hem
    // opnieuw naar de huidige knop-stand. Zo verschuift slepen naar een andere dag/monteur niets aan het weekend.
    weekend_telt_mee: heeft("weekend_telt_mee")
      ? body.weekend_telt_mee === true
      : opdracht.weekend_telt_mee,
  };

  try {
    await dbi.wijzigOpdracht(
      id,
      planning,
      opdracht.dashboard_status,
      {
        toegewezen_aan: opdracht.verzonden_toegewezen_aan,
        monteur_naam: opdracht.verzonden_monteur,
        startdatum: opdracht.verzonden_startdatum,
        starttijd: opdracht.verzonden_starttijd,
      },
      opdracht.duur_dagen,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Verplaatsen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
