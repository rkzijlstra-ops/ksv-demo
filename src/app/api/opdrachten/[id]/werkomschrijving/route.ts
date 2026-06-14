import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

function tekstOfNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Werkt de werk-omschrijving van een klus bij (typen/spraak op de detailpagina). Anders dan de
 * kantoor-only gegevens-correctie (PATCH /api/opdrachten/[id]) mag de monteur dit veld op zijn EIGEN
 * klus aanpassen: het is zijn eigen geheugensteun. RLS scheelt de zichtbaarheid al (getMeldingById
 * geeft null als de klus niet van hem is); de rol/eigendom-check hieronder weigert daarbovenop een
 * monteur die wel een vreemde klus zou kunnen zien. Kantoor (beheerder/opdrachtgever) mag altijd.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  }

  const eigen = await dbi.getProfiel(userId);
  const isVanMij = opdracht.toegewezen_aan === userId || opdracht.user_id === userId;
  if (eigen?.rol === "monteur" && !isVanMij) {
    return NextResponse.json(
      { error: "Je kunt alleen de werk-omschrijving van je eigen klus aanpassen" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  try {
    await dbi.updateWerkomschrijving(id, tekstOfNull(body.werkomschrijving));
  } catch (err) {
    return NextResponse.json(
      { error: `Bijwerken mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
