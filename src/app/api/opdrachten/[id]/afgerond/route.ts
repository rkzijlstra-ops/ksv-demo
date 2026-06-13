import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verstuurAfgerondMelding } from "@/lib/mail";
import { getAuthenticatedUserId } from "@/lib/auth";
import { logActie } from "@/lib/gebeurtenis";

/**
 * De monteur meldt een aan hem toegewezen klus snel als afgerond (geen volledig rapport). Optioneel een
 * notitie en het vervolg-vinkje. De zaak krijgt automatisch bericht (best-effort). Alleen de toegewezen
 * monteur. De melding blijft staan ook als de mail faalt.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }
  const toelichting =
    typeof body.toelichting === "string" && body.toelichting.trim() ? body.toelichting.trim() : null;
  const vervolgNodig = body.vervolgNodig === true;
  const fotoUrls = Array.isArray(body.fotoUrls)
    ? (body.fotoUrls as unknown[]).filter((u): u is string => typeof u === "string")
    : [];
  const videoUrl = typeof body.videoUrl === "string" && body.videoUrl.trim() ? body.videoUrl : null;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "monteur" || opdracht.toegewezen_aan !== userId) {
    return NextResponse.json({ error: "Alleen de toegewezen monteur kan afronden" }, { status: 403 });
  }

  try {
    await dbi.markeerAfgerond(id, { toelichting, vervolgNodig, fotoUrls, videoUrl });
  } catch (err) {
    return NextResponse.json({ error: `Afronden mislukt: ${(err as Error).message}` }, { status: 503 });
  }
  // Vervolg nodig: de klus gaat meteen terug naar "te plannen" (historie blijft, niet meer toegewezen).
  if (vervolgNodig) {
    try {
      await dbi.ontplanOpdracht(id);
    } catch (err) {
      return NextResponse.json({ error: `Vervolg inplannen mislukt: ${(err as Error).message}` }, { status: 503 });
    }
  }
  await logActie(dbi, id, "afgerond", { id: userId, naam: eigen?.naam, rol: eigen?.rol }, { toelichting, vervolgNodig });

  let gemaild = false;
  let mailFout: string | null = null;
  const kantoorAdres = process.env.RAPPORT_EMAIL?.trim();
  if (kantoorAdres) {
    try {
      await verstuurAfgerondMelding({
        naar: kantoorAdres,
        monteurNaam: eigen?.naam ?? opdracht.monteur_naam ?? "De monteur",
        klantNaam: opdracht.klant_naam ?? "de opdracht",
        referentienummer: opdracht.referentienummer,
        toelichting,
        vervolgNodig,
        organisatie: opdracht.keukenzaak ?? undefined,
      });
      gemaild = true;
    } catch (err) {
      mailFout = (err as Error).message;
    }
  }

  return NextResponse.json({ ok: true, gemaild, ...(mailFout ? { mailFout } : {}) }, { status: 200 });
}
