import { NextResponse } from "next/server";
import { db, dbAdmin } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Beheerder zet per opdrachtgever de klant-levering aan/uit (mag de monteur de oplevering ook
 * rechtstreeks aan de klant sturen). De wijziging draait met service-rechten na de rol-check.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen de beheerder kan dit wijzigen" }, { status: 403 });
  }

  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (typeof body.klant_levering_toegestaan !== "boolean") {
    return NextResponse.json(
      { error: "klant_levering_toegestaan (boolean) is vereist" },
      { status: 400 },
    );
  }

  try {
    await dbAdmin().updateOpdrachtgever(id, {
      klant_levering_toegestaan: body.klant_levering_toegestaan,
    });
  } catch (err) {
    return NextResponse.json({ error: `Bijwerken mislukt: ${(err as Error).message}` }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
