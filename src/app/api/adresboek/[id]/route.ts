import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

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
