import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/** Het persoonlijke adresboek van de ingelogde gebruiker (RLS scopt op auth.uid()). */
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const dbi = await db();
  try {
    const adressen = await dbi.getAdresboek();
    return NextResponse.json({ adressen }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: `Ophalen mislukt: ${(err as Error).message}` }, { status: 503 });
  }
}

/** Voegt een adres toe aan het eigen adresboek. Body: { naam, email }. */
export async function POST(req: Request) {
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
  const naam = typeof body.naam === "string" ? body.naam.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!naam || !email || !email.includes("@")) {
    return NextResponse.json({ error: "Vul een naam en een geldig e-mailadres in" }, { status: 400 });
  }
  const dbi = await db();
  try {
    const { id } = await dbi.voegAdresToe(naam, email);
    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: `Opslaan mislukt: ${(err as Error).message}` }, { status: 503 });
  }
}
