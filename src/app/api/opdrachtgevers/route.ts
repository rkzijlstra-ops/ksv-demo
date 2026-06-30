import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Maakt een nieuwe opdrachtgever (zaak) aan. Alleen de beheerder mag dit; de RLS bevestigt dat ook
 * (opdrachtgevers_insert = beheerder). De gekozen zaak stuurt later de uitnodig-branding en de
 * klus-koppeling aan.
 */
export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen de beheerder mag opdrachtgevers aanmaken" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }
  const naam = typeof body.naam === "string" ? body.naam.trim() : "";
  if (!naam) {
    return NextResponse.json({ error: "Vul een naam voor de opdrachtgever in" }, { status: 400 });
  }

  try {
    const opdrachtgever = await dbi.insertOpdrachtgever(naam);
    return NextResponse.json({ ok: true, opdrachtgever }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Opdrachtgever aanmaken mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}
