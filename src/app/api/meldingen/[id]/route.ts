import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const UpdateSchema = z.object({
  urgentie: z.enum(["rood", "geel"]),
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

  const bestaand = await db().getMeldingById(id);
  if (!bestaand) {
    return NextResponse.json({ error: "Melding niet gevonden" }, { status: 404 });
  }

  const nieuweVersie = bestaand.versie + 1;
  try {
    await db().updateMelding(id, {
      urgentie: parsed.data.urgentie,
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
