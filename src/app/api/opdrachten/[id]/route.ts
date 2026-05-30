import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }

  try {
    await dbi.verwijderOpdracht(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Verwijderen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json({ verwijderd: true }, { status: 200 });
}
