import { NextResponse } from "next/server";
import { db, dbAdmin } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";
import { logActie } from "@/lib/gebeurtenis";

/** Heropent een (ook al opgeleverde) klus: terug naar "te plannen", historie blijft. Optioneel een
 *  instructie voor de monteur (-> werkomschrijving). Zaak of de toegewezen monteur. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  const eigen = await dbi.getProfiel(userId);
  const rol = eigen?.rol;
  const magZaak = rol === "opdrachtgever" || rol === "beheerder";
  const magMonteur = rol === "monteur" && opdracht.toegewezen_aan === userId;
  if (!magZaak && !magMonteur) {
    return NextResponse.json({ error: "Geen rechten om te heropenen" }, { status: 403 });
  }
  // Optionele instructie (vrije body); ontbrekend/ongeldig = geen instructie.
  let instructie: string | null = null;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (typeof body?.instructie === "string" && body.instructie.trim()) instructie = body.instructie.trim();
  } catch {
    // geen of ongeldige body: gewoon zonder instructie heropenen
  }
  try {
    // Reset naar te plannen is een kantoor-actie; met service-rechten na de autorisatie-check hierboven.
    await dbAdmin().heropenen(id, instructie);
  } catch (err) {
    return NextResponse.json({ error: `Heropenen mislukt: ${(err as Error).message}` }, { status: 503 });
  }
  await logActie(dbi, id, "heropend", { id: userId, naam: eigen?.naam, rol }, instructie ? { instructie } : {});
  return NextResponse.json({ ok: true }, { status: 200 });
}
