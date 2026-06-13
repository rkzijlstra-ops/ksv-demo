import { NextResponse } from "next/server";
import { db, type OpdrachtGegevensInput } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";
import { logActie } from "@/lib/gebeurtenis";

const DOCUMENTTYPES = ["orderbevestiging", "werkbon_service", "tekst", "onbekend"] as const;

function tekstOfNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Corrigeert de kop-gegevens van een opdracht (parser-fouten herstellen). Alleen kantoor. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (!eigen || eigen.rol === "monteur") {
    return NextResponse.json({ error: "Alleen kantoor mag opdrachtgegevens corrigeren" }, { status: 403 });
  }

  const opdracht = await dbi.getOpdrachtById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  const type = DOCUMENTTYPES.includes(body.documenttype as (typeof DOCUMENTTYPES)[number])
    ? (body.documenttype as OpdrachtGegevensInput["documenttype"])
    : (opdracht.documenttype ?? "onbekend");

  const input: OpdrachtGegevensInput = {
    klant_naam: tekstOfNull(body.klant_naam),
    klant_adres: tekstOfNull(body.klant_adres),
    klant_telefoon: tekstOfNull(body.klant_telefoon),
    referentienummer: tekstOfNull(body.referentienummer),
    keukenzaak: tekstOfNull(body.keukenzaak),
    documenttype: type,
  };

  try {
    await dbi.updateOpdrachtGegevens(id, input);
  } catch (err) {
    return NextResponse.json(
      { error: `Bijwerken mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}

/**
 * Verwijdert een opdracht (soft-delete naar de prullenbak). Eigendom bepaalt het recht: een monteur
 * mag alleen zijn EIGEN ingeschoten klus weggooien (user_id = hij zelf). Een door kantoor ingeschoten
 * klus mag hij niet wissen (anders kan die stil uit zijn pool verdwijnen); daarvoor is "terugmelden".
 * Kantoor (beheerder/opdrachtgever) mag binnen zijn zaak alles.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (eigen?.rol === "monteur" && opdracht.user_id !== userId) {
    return NextResponse.json(
      { error: "Een door kantoor ingeschoten klus kun je niet verwijderen; gebruik 'terugmelden'." },
      { status: 403 },
    );
  }

  try {
    await dbi.verwijderOpdracht(id);
  } catch (err) {
    return NextResponse.json(
      { error: `Verwijderen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  await logActie(dbi, id, "verwijderd", { id: userId, naam: eigen?.naam, rol: eigen?.rol });

  return NextResponse.json({ verwijderd: true }, { status: 200 });
}
