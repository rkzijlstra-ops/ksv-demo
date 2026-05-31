import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Haalt een verwijderde opdracht terug uit de prullenbak (verwijderd_at -> null). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await (await db()).herstelOpdracht(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Herstellen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ hersteld: true }, { status: 200 });
}
