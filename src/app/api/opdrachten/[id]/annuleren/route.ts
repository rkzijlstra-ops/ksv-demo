import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificeerAnnulering } from "@/lib/notificaties";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Annuleert een opdracht (status -> geannuleerd). Alleen kantoor. Was de klus al naar de monteur
 * verstuurd (gepland/bevestigd), dan volgt automatisch een annuleer-mail naar de monteur. De mail is
 * best-effort: de annulering blijft staan, ook als de mail faalt (dan met mailFout in het antwoord).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (!eigen || eigen.rol === "monteur") {
    return NextResponse.json({ error: "Alleen kantoor mag annuleren" }, { status: 403 });
  }

  const opdracht = await dbi.getOpdrachtById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }

  const wasVerstuurd =
    opdracht.dashboard_status === "gepland" || opdracht.dashboard_status === "bevestigd";

  try {
    await dbi.annuleerOpdracht(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Annuleren mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  // Automatisch gevolg: de monteur op de hoogte brengen (mail + SMS), maar alleen als hij de klus al had.
  let gemaild = false;
  let mailFout: string | null = null;
  if (wasVerstuurd && opdracht.toegewezen_aan && opdracht.monteur_naam) {
    const r = await notificeerAnnulering({
      toegewezenAan: opdracht.toegewezen_aan,
      monteurNaam: opdracht.monteur_naam,
      klantNaam: opdracht.klant_naam ?? "de opdracht",
      referentienummer: opdracht.referentienummer,
      zaaknaam: opdracht.keukenzaak,
    });
    gemaild = r.gemaild;
    mailFout = r.mailFout ?? r.smsFout;
  }

  return NextResponse.json({ ok: true, gemaild, ...(mailFout ? { mailFout } : {}) }, { status: 200 });
}
