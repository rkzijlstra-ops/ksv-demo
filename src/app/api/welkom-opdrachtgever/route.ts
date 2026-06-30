import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normaliseerNlMobiel } from "@/lib/telefoon";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * De opdrachtgever bevestigt eenmalig zijn welkomscherm: hij corrigeert/bevestigt zijn naam (door
 * beheer ingevuld) en optioneel zijn telefoon. Zet welkom_bevestigd, zodat het scherm daarna weg is.
 * Kan via de SECURITY DEFINER-functie alleen de eigen naam/telefoon raken, niet rol of zaak.
 */
export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "opdrachtgever") {
    return NextResponse.json(
      { error: "Alleen een opdrachtgever bevestigt dit welkomscherm" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  const naam = typeof body.naam === "string" ? body.naam.trim() : "";
  if (!naam) {
    return NextResponse.json({ error: "Vul je naam in" }, { status: 400 });
  }
  // Telefoon is optioneel voor een opdrachtgever: ongeldig/leeg wordt null (geen blokkade).
  const telefoon = normaliseerNlMobiel(typeof body.telefoon === "string" ? body.telefoon : "");

  try {
    await dbi.bevestigWelkom(naam, telefoon);
  } catch (err) {
    return NextResponse.json(
      { error: `Bevestigen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
