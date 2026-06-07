import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Werkt de eigen afzender-gegevens bij (bedrijfsnaam, telefoon, contact-mail) die op het opleverrapport
 * komen. Elke ingelogde gebruiker mag alleen zijn eigen rij; de db-laag gebruikt een SECURITY DEFINER
 * functie op auth.uid(), zodat de rol niet te raken is.
 */
export async function PATCH(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }
  const tekst = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const dbi = await db();
  try {
    await dbi.updateEigenGegevens({
      naam: tekst(body.naam),
      bedrijfsnaam: tekst(body.bedrijfsnaam),
      telefoon: tekst(body.telefoon),
      contact_email: tekst(body.contact_email),
    });
  } catch (err) {
    return NextResponse.json({ error: `Opslaan mislukt: ${(err as Error).message}` }, { status: 503 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
