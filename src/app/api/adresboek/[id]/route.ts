import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/** Past een adres in het eigen adresboek aan. Body: { naam, email }. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;
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
    await dbi.werkAdresBij(id, naam, email);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: `Bijwerken mislukt: ${(err as Error).message}` }, { status: 503 });
  }
}

/** Verwijdert een adres uit het eigen adresboek (RLS zorgt dat je alleen je eigen rij kunt wissen). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;
  const dbi = await db();
  try {
    await dbi.verwijderAdres(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: `Verwijderen mislukt: ${(err as Error).message}` }, { status: 503 });
  }
}
