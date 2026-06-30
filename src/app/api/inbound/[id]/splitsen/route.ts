import { NextResponse } from "next/server";
import { db, dbAdmin, type OpdrachtInput } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Splitst een voorstel/klus dat mogelijk meerdere opdrachten bevat in losse klussen. De voorgestelde
 * splitsing is bij binnenkomst al bepaald en bewaard (meldingen.splits_voorstel). Op één tik maken we
 * per deel een nieuwe klus, verhuizen de bijbehorende documenten mee en verwijderen het origineel.
 * Rol-bewust geautoriseerd: de toegewezen monteur, een beheerder, of de opdrachtgever van de zaak.
 * De mutaties lopen via service-rechten (dbAdmin) na de check, zodat RLS niet in de weg zit.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const dbi = await db();
  const melding = await dbi.getMeldingById(id);
  if (!melding) return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });

  const eigen = await dbi.getProfiel(userId);
  const magMonteur = eigen?.rol === "monteur" && melding.toegewezen_aan === userId;
  const magBeheerder = eigen?.rol === "beheerder";
  const magOpdrachtgever =
    eigen?.rol === "opdrachtgever" &&
    melding.opdrachtgever_id != null &&
    melding.opdrachtgever_id === eigen.opdrachtgever_id;
  if (!magMonteur && !magBeheerder && !magOpdrachtgever) {
    return NextResponse.json({ error: "Geen rechten om te splitsen" }, { status: 403 });
  }

  const voorstel = melding.splits_voorstel;
  if (!voorstel || voorstel.length === 0) {
    return NextResponse.json({ error: "Geen splitsing om uit te voeren" }, { status: 400 });
  }

  try {
    const adm = dbAdmin();
    const nieuw: string[] = [];
    for (const deel of voorstel) {
      const basis: OpdrachtInput = {
        documenttype: "onbekend",
        klant_naam: null,
        klant_adres: null,
        referentienummer: null,
        adviseur: null,
        klant_telefoon: null,
        leverweek: null,
        meldingen: [],
        ...deel.velden,
        user_id: melding.user_id,
        toegewezen_aan: melding.toegewezen_aan,
        opdrachtgever_id: melding.opdrachtgever_id,
        // Het nieuwe deel erft de status van de bron: monteur-voorstel blijft een te-verwerken voorstel,
        // een kantoor-klus blijft een gewone klus op het dashboard.
        te_verwerken: melding.te_verwerken,
        controleer_splitsing: false,
      };
      const { id: nieuwId } = await adm.createOpdracht(basis);
      for (const docId of deel.document_ids) await adm.verplaatsDocument(docId, nieuwId);
      nieuw.push(nieuwId);
    }
    // Documenten zijn verplaatst; het oorspronkelijke voorstel kan weg (soft-delete).
    await adm.verwijderOpdracht(id);
    return NextResponse.json({ ok: true, aantal: nieuw.length }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: `Splitsen mislukt: ${(err as Error).message}` }, { status: 503 });
  }
}
