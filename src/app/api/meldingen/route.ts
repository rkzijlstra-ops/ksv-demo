import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const NieuweMeldingSchema = z.object({
  urgentie: z.enum(["rood", "geel"]),
  ruwe_tekst: z.string().nullable(),
  foto_urls: z.array(z.string()),
  klant_naam: z.string().nullable().optional(),
  klant_adres: z.string().nullable().optional(),
  referentienummer: z.string().nullable().optional(),
  status: z.enum(["concept", "verzonden"]),
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
      urgentie: parsed.data.urgentie,
      ruwe_tekst: parsed.data.ruwe_tekst,
      spraak_tekst: null,
      foto_urls: parsed.data.foto_urls,
      klant_naam: parsed.data.klant_naam ?? null,
      klant_adres: parsed.data.klant_adres ?? null,
      referentienummer: parsed.data.referentienummer ?? null,
      status: parsed.data.status,
    });
    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}
