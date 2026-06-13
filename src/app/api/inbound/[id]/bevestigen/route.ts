import { NextResponse } from "next/server";
import { db, dbAdmin } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Bevestigt een "te verwerken"-voorstel uit het inbound-bakje: zet `te_verwerken` af, waarna het een
 * gewone klus in de werkpool wordt. Alleen de toegewezen monteur (of de beheerder). De mutatie loopt
 * via service-rechten na de autorisatie-check, zodat RLS de monteur niet blokkeert.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  const eigen = await dbi.getProfiel(userId);
  const magMonteur = eigen?.rol === "monteur" && opdracht.toegewezen_aan === userId;
  const magBeheerder = eigen?.rol === "beheerder";
  if (!magMonteur && !magBeheerder) {
    return NextResponse.json({ error: "Geen rechten om te bevestigen" }, { status: 403 });
  }
  try {
    await dbAdmin().markeerVerwerkt(id);
  } catch (err) {
    return NextResponse.json({ error: `Bevestigen mislukt: ${(err as Error).message}` }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
