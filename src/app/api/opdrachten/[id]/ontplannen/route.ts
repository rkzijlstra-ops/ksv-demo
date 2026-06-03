import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/** Haalt een opdracht van het planbord terug naar de pool (status binnen, planning leeg). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await (await db()).ontplanOpdracht(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Ontplannen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
