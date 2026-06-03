import { NextResponse } from "next/server";
import { db, type PlanningInput, type DashboardStatus } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

const STATUSSEN: DashboardStatus[] = [
  "binnen",
  "concept_gepland",
  "gepland",
  "bevestigd",
  "opgeleverd",
  "geannuleerd",
];

/**
 * Verplaatst een al geplande opdracht naar een andere monteur/dag (slepen op het planbord).
 * Behoudt tijd en duur; via wijzigOpdracht krijgt een al verstuurde opdracht de markering
 * "gewijzigd, nog te versturen". Anders dan /plannen verandert dit de status niet.
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
  const huidigeStatus = STATUSSEN.includes(body.huidigeStatus as DashboardStatus)
    ? (body.huidigeStatus as DashboardStatus)
    : "concept_gepland";

  const duur = Number(body.duur_dagen);
  const planning: PlanningInput = {
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
    await (await db()).wijzigOpdracht(id, planning, huidigeStatus);
  } catch (err) {
    return NextResponse.json(
      { error: `Verplaatsen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
