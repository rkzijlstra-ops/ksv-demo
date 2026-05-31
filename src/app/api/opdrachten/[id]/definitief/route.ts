import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Verwijdert een opdracht definitief (echt wissen, incl. documenten/meldingen via cascade). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await (await db()).definitiefVerwijderen(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Definitief verwijderen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ verwijderd: true }, { status: 200 });
}
