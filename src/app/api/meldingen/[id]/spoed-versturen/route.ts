import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verstuurSpoedMelding } from "@/lib/mail";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const melding = await db().getMeldingById(id);
  if (!melding || !melding.opdracht_id) {
    return NextResponse.json({ error: "Melding niet gevonden" }, { status: 404 });
  }
  const opdracht = await db().getMeldingById(melding.opdracht_id);
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

  try {
    await verstuurSpoedMelding({ naar, opdracht, melding });
  } catch (err) {
    return NextResponse.json(
      { error: `Spoed versturen mislukt: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  try {
    await db().markeerSpoedVerzonden(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Spoed-status zetten mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json({ verstuurd: true }, { status: 200 });
}
