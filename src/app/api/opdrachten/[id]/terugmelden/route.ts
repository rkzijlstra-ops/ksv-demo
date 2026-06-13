import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verstuurTerugmelding } from "@/lib/mail";
import { TERUGMELD_REDENEN } from "@/lib/terugmeld-mail";
import { getAuthenticatedUserId } from "@/lib/auth";
import { logActie } from "@/lib/gebeurtenis";

/**
 * De monteur meldt een aan hem toegewezen klus terug aan kantoor (niet doorgegaan, met reden). De klus
 * gaat uit zijn actieve werkpool (in zijn history) en komt bij kantoor met een markering; kantoor
 * krijgt automatisch bericht. De klus verdwijnt nooit stil. Alleen de toegewezen monteur, met een
 * geldige reden. Best-effort mail; de terugmelding blijft staan ook als de mail faalt.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const reden = typeof body.reden === "string" ? body.reden : "";
  if (!TERUGMELD_REDENEN.some((r) => r.waarde === reden)) {
    return NextResponse.json({ error: "Kies een geldige reden" }, { status: 400 });
  }
  const toelichting = typeof body.toelichting === "string" && body.toelichting.trim() ? body.toelichting.trim() : null;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  }
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "monteur" || opdracht.toegewezen_aan !== userId) {
    return NextResponse.json({ error: "Alleen de toegewezen monteur kan terugmelden" }, { status: 403 });
  }

  try {
    await dbi.markeerTeruggemeld(id, { reden, toelichting });
  } catch (err) {
    return NextResponse.json({ error: `Terugmelden mislukt: ${(err as Error).message}` }, { status: 503 });
  }
  await logActie(dbi, id, "teruggemeld", { id: userId, naam: eigen?.naam, rol: eigen?.rol }, { reden, toelichting });

  // Kantoor op de hoogte brengen (best-effort). Naar het kantoor-adres (zoals de spoedmelding).
  let gemaild = false;
  let mailFout: string | null = null;
  const kantoorAdres = process.env.RAPPORT_EMAIL?.trim();
  if (kantoorAdres) {
    try {
      await verstuurTerugmelding({
        naar: kantoorAdres,
        monteurNaam: eigen?.naam ?? opdracht.monteur_naam ?? "De monteur",
        klantNaam: opdracht.klant_naam ?? "klant",
        referentienummer: opdracht.referentienummer,
        reden,
        toelichting,
        organisatie: opdracht.keukenzaak ?? undefined,
      });
      gemaild = true;
    } catch (err) {
      mailFout = (err as Error).message;
    }
  }

  return NextResponse.json({ ok: true, gemaild, ...(mailFout ? { mailFout } : {}) }, { status: 200 });
}
