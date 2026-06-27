import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Lichte check voor het inschieten: bestaat er al een (niet-verwijderde) klus met dit referentienummer?
 * Gebruikt service-rechten zodat een dubbele óók gevonden wordt als hij van een ander/kantoor is. Geeft
 * alleen de minimale info terug voor de waarschuwing.
 */
export async function GET(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const ref = new URL(req.url).searchParams.get("ref")?.trim();
  if (!ref) return NextResponse.json({ klussen: [] });

  try {
    const klussen = await dbAdmin().zoekOpReferentie(ref);
    return NextResponse.json({
      klussen: klussen
        .filter((k) => !k.verwijderd_at)
        .map((k) => ({ klant_naam: k.klant_naam, opdracht_status: k.opdracht_status })),
    });
  } catch {
    // Bij een fout niet blokkeren: liever doorlaten dan het inschieten tegenhouden.
    return NextResponse.json({ klussen: [] });
  }
}
