import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { genereerRapportPdf } from "@/lib/rapport";
import { verstuurOpleverRapport } from "@/lib/mail";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }

  const naar = process.env.RAPPORT_EMAIL?.trim();
  if (!naar) {
    return NextResponse.json(
      { error: "RAPPORT_EMAIL ontbreekt in de serverconfig (.env.local)" },
      { status: 500 },
    );
  }

  const meldingen = await dbi.getMeldingenVoorOpdracht(id);
  const bestandsnaam = `opleverrapport-${opdracht.referentienummer ?? id}.pdf`;

  let rapportUrl: string;
  try {
    const pdf = await genereerRapportPdf(opdracht, meldingen);
    const { publieke_url } = await storage().uploadOpdrachtDocument(
      Buffer.from(pdf),
      bestandsnaam,
      "application/pdf",
    );
    rapportUrl = publieke_url;

    // Mail vóór het markeren: mislukt de mail, dan blijft de opdracht 'open' (kan opnieuw).
    await verstuurOpleverRapport({ naar, opdracht, pdf, bestandsnaam });
  } catch (err) {
    return NextResponse.json(
      { error: `Opleveren mislukt: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  try {
    await dbi.markeerOpgeleverd(id, rapportUrl);
  } catch (err) {
    return NextResponse.json(
      { error: `Opgeleverd-status zetten mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json({ opgeleverd: true, rapport_url: rapportUrl }, { status: 200 });
}
