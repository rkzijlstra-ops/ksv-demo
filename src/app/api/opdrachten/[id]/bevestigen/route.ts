import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * De monteur bevestigt dat hij de opdracht heeft ontvangen (uit de mail: "bevestig de ontvangst in
 * de app"). Zet de status op 'bevestigd'. RLS zorgt dat een monteur alleen zijn eigen klus ziet, dus
 * getMeldingById geeft null als de klus niet van hem is -> 404.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }

  try {
    await dbi.bevestigOntvangst(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Bevestigen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
