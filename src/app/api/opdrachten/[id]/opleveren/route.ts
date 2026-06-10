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

  const oplevering = await dbi.getOpleveringVoorOpdracht(id);
  if (!oplevering) {
    return NextResponse.json(
      { error: "Nog geen oplevering vastgelegd. Doorloop eerst de oplever-flow." },
      { status: 409 },
    );
  }

  // Ontvanger: het bij de oplevering ingestelde adres, anders het standaardadres uit de config.
  const naar = oplevering.rapport_email?.trim() || process.env.RAPPORT_EMAIL?.trim();
  if (!naar) {
    return NextResponse.json(
      { error: "Geen ontvanger voor het rapport (vul een e-mailadres in of stel RAPPORT_EMAIL in)" },
      { status: 500 },
    );
  }

  const meldingen = await dbi.getMeldingenVoorOpdracht(id);
  const bestandsnaam = `opleverrapport-${opdracht.referentienummer ?? id}.pdf`;

  // Afzender = de monteur die opleverde (uit zijn profiel), met terugval op de toegewezen monteur.
  const opleveraarId = oplevering.user_id ?? opdracht.toegewezen_aan;
  const p = opleveraarId ? await dbi.getProfiel(opleveraarId) : null;
  const afzender = p
    ? { naam: p.naam, bedrijfsnaam: p.bedrijfsnaam, telefoon: p.telefoon, email: p.contact_email }
    : null;

  let rapportUrl: string;
  try {
    const pdf = await genereerRapportPdf(opdracht, meldingen, oplevering, afzender);
    const { publieke_url } = await storage().uploadOpdrachtDocument(
      Buffer.from(pdf),
      bestandsnaam,
      "application/pdf",
    );
    rapportUrl = publieke_url;

    // Mail vóór het markeren: mislukt de mail, dan blijft de opdracht 'open' (kan opnieuw).
    await verstuurOpleverRapport({
      naar,
      opdracht,
      pdf,
      bestandsnaam,
      videoUrl: oplevering.video_url,
      afzender,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Opleveren mislukt: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  try {
    await dbi.finaliseerOplevering(id, rapportUrl);
    await dbi.markeerOpgeleverd(id, rapportUrl);
  } catch (err) {
    return NextResponse.json(
      { error: `Opgeleverd-status zetten mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json({ opgeleverd: true, rapport_url: rapportUrl }, { status: 200 });
}
