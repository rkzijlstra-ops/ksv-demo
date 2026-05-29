import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const NieuweMeldingSchema = z.object({
  opdracht_id: z.string().uuid(),
  spoed: z.boolean(),
  ruwe_tekst: z.string().nullable(),
  foto_urls: z.array(z.string()),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const parsed = NieuweMeldingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ongeldige melding", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const { id } = await db().createMonteurMelding({
      opdracht_id: parsed.data.opdracht_id,
      spoed: parsed.data.spoed,
      ruwe_tekst: parsed.data.ruwe_tekst,
      spraak_tekst: null,
      foto_urls: parsed.data.foto_urls,
    });
    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}
