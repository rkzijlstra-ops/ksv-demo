import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGebruikerEmail } from "@/lib/supabase-admin";
import { verstuurUitnodiging } from "@/lib/mail";
import { getAuthenticatedUserId } from "@/lib/auth";

/** Stuurt een gebruiker opnieuw de inlog-/uitnodigingsmail (als hij de link kwijt is). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen de beheerder mag dit" }, { status: 403 });
  }
  const { id } = await params;

  const doel = await dbi.getProfiel(id);
  if (!doel) {
    return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
  }
  const email = await getGebruikerEmail(id);
  if (!email) {
    return NextResponse.json({ error: "Geen e-mailadres bij dit account" }, { status: 404 });
  }

  const zaak = await dbi.getStandaardOpdrachtgever();
  try {
    await verstuurUitnodiging({
      naar: email,
      naam: doel.naam,
      rol: doel.rol,
      appUrl: new URL(req.url).origin,
      organisatie: zaak?.naam ?? "",
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Mail versturen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
