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
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }

  const duur = Number(body.duur_dagen);
  const planning: PlanningInput = {
    toegewezen_aan: typeof body.toegewezen_aan === "string" && body.toegewezen_aan ? body.toegewezen_aan : null,
    monteur_naam:
      typeof body.monteur_naam === "string" && body.monteur_naam.trim()
        ? body.monteur_naam.trim()
        : null,
    startdatum,
    starttijd:
      typeof body.starttijd === "string" && body.starttijd.trim() ? body.starttijd.trim() : null,
    duur_dagen: Number.isFinite(duur) && duur >= 1 ? Math.floor(duur) : 1,
  };

  try {
    await dbi.wijzigOpdracht(id, planning, opdracht.dashboard_status, {
      monteur_naam: opdracht.verzonden_monteur,
      startdatum: opdracht.verzonden_startdatum,
      starttijd: opdracht.verzonden_starttijd,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Verplaatsen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
