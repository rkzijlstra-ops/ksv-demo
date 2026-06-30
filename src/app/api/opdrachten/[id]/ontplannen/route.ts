import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notificeerOntplanning } from "@/lib/notificaties";
import { getAuthenticatedUserId } from "@/lib/auth";
import { logActie } from "@/lib/gebeurtenis";

/**
 * Haalt een opdracht van het planbord terug naar de pool (status binnen, planning leeg). Alleen
 * kantoor. Was de klus al naar de monteur verstuurd (gepland/bevestigd), dan volgt automatisch een
 * ontplan-mail naar de monteur, zodat de klus niet stil uit zijn kluspool verdwijnt. De mail is
 * best-effort: het ontplannen blijft staan, ook als de mail faalt (dan met mailFout in het antwoord).
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
    return NextResponse.json({ error: "Alleen kantoor mag ontplannen" }, { status: 403 });
  }

  const opdracht = await dbi.getOpdrachtById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  }

  // Lees de monteur-gegevens vóór het ontplannen; ontplanOpdracht wist toewijzing en naam.
  const wasVerstuurd =
    opdracht.dashboard_status === "gepland" || opdracht.dashboard_status === "bevestigd";
  const toegewezenAan = opdracht.toegewezen_aan;
  const monteurNaam = opdracht.monteur_naam;

  try {
    await dbi.ontplanOpdracht(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Ontplannen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  await logActie(dbi, id, "ontplannen", { id: userId, naam: eigen.naam, rol: eigen.rol });

  // Automatisch gevolg: de monteur op de hoogte brengen (mail + SMS), maar alleen als hij de klus al had.
  let gemaild = false;
  let mailFout: string | null = null;
  if (wasVerstuurd && toegewezenAan && monteurNaam) {
    const r = await notificeerOntplanning({
      toegewezenAan,
      monteurNaam,
      klantNaam: opdracht.klant_naam ?? "klant",
      referentienummer: opdracht.referentienummer,
      zaaknaam: opdracht.keukenzaak,
    });
    gemaild = r.gemaild;
    mailFout = r.mailFout ?? r.smsFout;
  }

  return NextResponse.json({ ok: true, gemaild, ...(mailFout ? { mailFout } : {}) }, { status: 200 });
}
