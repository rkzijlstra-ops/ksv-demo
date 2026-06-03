import { NextResponse } from "next/server";
import { db, type PlanningInput } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Plant een opdracht in op het planbord: zet monteur, startdatum, optionele tijd en aantal dagen,
 * status -> concept_gepland. Verstuurt nog niets (de verstuur-poort is een aparte actie).
 * Eén invoermodel: tijd leeg = dagblok (montage), tijd ingevuld = kaartje op dat uur (service).
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

  const duur = Number(body.duur_dagen);
  const planning: PlanningInput = {
    toegewezen_aan:
      typeof body.toegewezen_aan === "string" && body.toegewezen_aan.trim()
        ? body.toegewezen_aan.trim()
        : null,
    startdatum,
    starttijd:
      typeof body.starttijd === "string" && body.starttijd.trim() ? body.starttijd.trim() : null,
    duur_dagen: Number.isFinite(duur) && duur >= 1 ? Math.floor(duur) : 1,
  };

  try {
    await (await db()).planOpdracht(id, planning);
  } catch (err) {
    return NextResponse.json(
      { error: `Inplannen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
