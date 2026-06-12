import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { genereerRapportPdf, type RapportDoelgroep } from "@/lib/rapport";
import { verstuurOpleverRapport } from "@/lib/mail";
import { formatDatumLang } from "@/lib/datum";

/**
 * Verstuurt het opleverrapport naar één doelgroep, los in tijd:
 * - "klant": de schone versie (zonder interne notitie) naar het klant-mailadres. Raakt de
 *   opdracht-status NIET; onthoudt alleen wanneer/waarheen.
 * - "zaak": de volledige versie (mét interne notitie) naar het zaak-adres, en zet de opdracht PAS
 *   nu op opgeleverd. Heeft de klant zijn versie al gehad, dan vermeldt de zaak-mail dat.
 *
 * Zo houdt de monteur de regie over wanneer het kantoor het oplevermoment ziet.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const doelgroep: RapportDoelgroep = body.doelgroep === "klant" ? "klant" : "zaak";

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }

  const oplevering = await dbi.getOpleveringVoorOpdracht(id);
  if (!oplevering) {
    return NextResponse.json(
      { error: "Nog geen oplevering vastgelegd. Doorloop eerst de oplever-flow." },
      { status: 409 },
    );
  }

  // Ontvanger per doelgroep.
  const naar =
    doelgroep === "klant"
      ? oplevering.klant_rapport_email?.trim()
      : oplevering.rapport_email?.trim() || process.env.RAPPORT_EMAIL?.trim();
  if (!naar) {
    return doelgroep === "klant"
      ? NextResponse.json({ error: "Geen klant-mailadres ingevuld" }, { status: 400 })
      : NextResponse.json(
          { error: "Geen ontvanger voor de zaak (vul een e-mailadres in of stel RAPPORT_EMAIL in)" },
          { status: 500 },
        );
  }

  const meldingen = await dbi.getMeldingenVoorOpdracht(id);
  const suffix = doelgroep === "klant" ? "-klant" : "";
  const bestandsnaam = `opleverrapport-${opdracht.referentienummer ?? id}${suffix}.pdf`;

  // Afzender = de monteur die opleverde (uit zijn profiel), met terugval op de toegewezen monteur.
  const opleveraarId = oplevering.user_id ?? opdracht.toegewezen_aan;
  const p = opleveraarId ? await dbi.getProfiel(opleveraarId) : null;
  const afzender = p
    ? { naam: p.naam, bedrijfsnaam: p.bedrijfsnaam, telefoon: p.telefoon, email: p.contact_email }
    : null;

  // Alleen in de zaak-mail: vermeld dat de klant zijn versie ook al kreeg.
  const klantOok =
    doelgroep === "zaak" && oplevering.klant_rapport_verzonden_at
      ? {
          wanneer: formatDatumLang(oplevering.klant_rapport_verzonden_at),
          adres: oplevering.klant_rapport_email ?? "de klant",
        }
      : null;

  let rapportUrl: string;
  try {
    const pdf = await genereerRapportPdf(opdracht, meldingen, oplevering, afzender, doelgroep);
    const { publieke_url } = await storage().uploadOpdrachtDocument(
      Buffer.from(pdf),
      bestandsnaam,
      "application/pdf",
    );
    rapportUrl = publieke_url;

    // Mail vóór het registreren: mislukt de mail, dan blijft de stand 'niet verstuurd' (kan opnieuw).
    await verstuurOpleverRapport({
      naar,
      opdracht,
      pdf,
      bestandsnaam,
      videoUrl: oplevering.video_url,
      afzender,
      doelgroep,
      klantOok,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Versturen mislukt: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  try {
    if (doelgroep === "klant") {
      await dbi.registreerKlantRapport(id, rapportUrl, naar);
    } else {
      // Zet de opdracht pas nu op opgeleverd (kantoor ziet het oplevermoment nu pas).
      await dbi.registreerZaakRapport(id, rapportUrl);
    }
    // Verzendgeschiedenis: elke verzending append-only vastleggen (wie, waarheen, wanneer, welke PDF),
    // zodat dit niet meer in de mailprovider hoeft te worden teruggezocht.
    await dbi.logRapportVerzending({
      opdracht_id: id,
      doelgroep,
      naar,
      rapport_url: rapportUrl,
      door_id: opleveraarId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Status bijwerken mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { verzonden: true, doelgroep, rapport_url: rapportUrl, opgeleverd: doelgroep === "zaak" },
    { status: 200 },
  );
}
