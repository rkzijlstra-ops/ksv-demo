import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { getAuthenticatedUserId } from "@/lib/auth";
import { padUitPublicUrl } from "@/lib/storage-pad";

const FOTO_BUCKET = "meldingen-fotos";
const VIDEO_BUCKET = "oplever-videos";

/**
 * Verwijdert één oplever-bestand (foto of video) uit storage tijdens het samenstellen van de
 * oplevering, zodat een verwijderde/vervangen foto geen weesbestand achterlaat. Best-effort: lukt het
 * storage-wissen niet, dan blijft de actie toch slagen (de UI heeft de foto al uit het concept gehaald).
 *
 * Veiligheid: alleen monteur/beheerder, en een monteur alleen op een eigen/toegewezen opdracht. De url
 * moet in een bekende oplever-bucket zitten. Is er al een rapport verstuurd, dan wissen we NIET meer
 * (de foto's zitten dan ook in de web-voorvertoning en een eventuele herverzending): antwoord 409.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  const dbi = await db();
  const profiel = await dbi.getProfiel(userId);
  if (!profiel || (profiel.rol !== "monteur" && profiel.rol !== "beheerder")) {
    return NextResponse.json({ error: "Geen rechten" }, { status: 403 });
  }

  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  const url = typeof body.url === "string" ? body.url : "";
  if (!url) {
    return NextResponse.json({ error: "Geen url" }, { status: 400 });
  }

  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }
  // Monteur mag alleen een eigen/toegewezen opdracht opruimen; beheerder altijd.
  if (
    profiel.rol === "monteur" &&
    opdracht.toegewezen_aan !== userId &&
    opdracht.user_id !== userId
  ) {
    return NextResponse.json({ error: "Geen toegang tot deze opdracht" }, { status: 403 });
  }

  // Na versturen niet meer automatisch wissen (zou de voorvertoning/herverzending breken).
  const oplevering = await dbi.getOpleveringVoorOpdracht(id);
  if (oplevering?.klant_rapport_verzonden_at || oplevering?.zaak_rapport_verzonden_at) {
    return NextResponse.json(
      { error: "Rapport is al verstuurd; bestand blijft bewaard" },
      { status: 409 },
    );
  }

  // Bucket + pad bepalen uit de url.
  const bucket = url.includes(`/${FOTO_BUCKET}/`)
    ? FOTO_BUCKET
    : url.includes(`/${VIDEO_BUCKET}/`)
      ? VIDEO_BUCKET
      : null;
  const pad = bucket ? padUitPublicUrl(url, bucket) : null;
  if (!bucket || !pad) {
    return NextResponse.json({ error: "Onbekend oplever-bestand" }, { status: 400 });
  }

  // Storage-wissen is best-effort: een weesbestand mag de actie niet laten falen.
  if (bucket === FOTO_BUCKET) {
    await storage().verwijderOpleverFoto(pad).catch(() => {});
  } else {
    await storage().verwijderOpleverVideo(pad).catch(() => {});
  }

  return NextResponse.json({ verwijderd: true }, { status: 200 });
}
