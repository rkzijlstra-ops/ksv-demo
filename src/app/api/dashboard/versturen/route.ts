import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Verstuur-poort: zet de opgegeven concept/gewijzigde opdrachten op 'gepland' en reset de
 * gewijzigd-marker. De daadwerkelijke mail naar monteurs komt in blok 4; dit is de statussprong.
 */
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

  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Geen opdrachten om te versturen" }, { status: 400 });
  }

  try {
    await (await db()).verstuurNaarMonteurs(ids);
  } catch (err) {
    return NextResponse.json(
      { error: `Versturen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, aantal: ids.length }, { status: 200 });
}
