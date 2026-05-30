import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const UpdateSchema = z.object({
  spoed: z.boolean(),
  ruwe_tekst: z.string().nullable(),
  foto_urls: z.array(z.string()),
  status: z.enum(["concept", "verzonden"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ongeldige melding", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const dbi = await db();
  const bestaand = await dbi.getMeldingById(id);
  if (!bestaand) {
    return NextResponse.json({ error: "Melding niet gevonden" }, { status: 404 });
  }

  const nieuweVersie = bestaand.versie + 1;
  try {
    await dbi.updateMelding(id, {
      spoed: parsed.data.spoed,
      ruwe_tekst: parsed.data.ruwe_tekst,
      foto_urls: parsed.data.foto_urls,
      status: parsed.data.status,
      versie: nieuweVersie,
    });
    return NextResponse.json({ id, versie: nieuweVersie }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Bijwerken mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbi = await db();
  const bestaand = await dbi.getMeldingById(id);
  if (!bestaand) {
    return NextResponse.json({ error: "Melding niet gevonden" }, { status: 404 });
  }
  try {
    await dbi.verwijderMelding(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Verwijderen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ verwijderd: true }, { status: 200 });
}
