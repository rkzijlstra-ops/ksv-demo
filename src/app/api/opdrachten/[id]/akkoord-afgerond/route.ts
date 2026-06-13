import { NextResponse } from "next/server";
import { db, dbAdmin } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";
import { logActie } from "@/lib/gebeurtenis";

/** De zaak keurt een voltooid gemelde klus goed ("Akkoord, klaar" -> Voltooid/afgehandeld). Alleen zaak. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "opdrachtgever" && eigen?.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen de opdrachtgever kan goedkeuren" }, { status: 403 });
  }
  try {
    await dbAdmin().akkoordAfgerond(id);
  } catch (err) {
    return NextResponse.json({ error: `Goedkeuren mislukt: ${(err as Error).message}` }, { status: 503 });
  }
  await logActie(dbi, id, "voltooid_akkoord", { id: userId, naam: eigen?.naam, rol: eigen?.rol }, {});
  return NextResponse.json({ ok: true }, { status: 200 });
}
