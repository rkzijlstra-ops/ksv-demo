import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db().verwijderDocument(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Verwijderen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ verwijderd: true }, { status: 200 });
}
