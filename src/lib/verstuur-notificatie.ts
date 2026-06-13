import type { Db, Melding } from "./db";
import { notificeerNieuweOpdrachten, notificeerAnnulering } from "./notificaties";
import { historieVoorMonteur } from "./monteur-mail";
import { klassificeerVerzending } from "./opdracht-status";

/**
 * Meldt een (her)verstuurronde aan de betrokken monteurs. Centraal gedeeld door de bulk-poort
 * (dashboard/versturen) en het envelopje op de kaart (mail-monteur), zodat beide gegarandeerd
 * hetzelfde doen:
 *  - de huidige monteur(s) krijgen de nieuwe of gewijzigde klus(sen), gebundeld, met een verzet-toon
 *    als het een verzetting is (al verstuurd aan dezelfde monteur, nu andere datum/tijd);
 *  - bij een monteur-WISSEL krijgt de vorige monteur de annulering-melding ("is geannuleerd"): voor
 *    hem is de klus van de baan. Bewust zonder reden/overname, want dat gaat hem niet aan en kan
 *    interne wrijving geven.
 *
 * De opdrachten moeten VÓÓR markeerVerzonden gelezen zijn: hun verzonden_* moet nog de vorige plek
 * bevatten, anders is er niets te vergelijken. Best-effort: mail/SMS-fouten worden verzameld en
 * teruggegeven, ze blokkeren niets (de status is in de route al bijgewerkt).
 */
export async function meldVerstuurd(
  dbi: Pick<Db, "zoekOpReferentie">,
  opdrachten: Melding[],
): Promise<{ mailFout: string | null; smsFout: string | null; monteurs: number }> {
  let mailFout: string | null = null;
  let smsFout: string | null = null;
  const onthoud = (r: { mailFout: string | null; smsFout: string | null }) => {
    mailFout ??= r.mailFout;
    smsFout ??= r.smsFout;
  };

  // 1. Bundel per huidige monteur en meld de nieuwe/gewijzigde klus(sen).
  const perMonteur = new Map<string, Melding[]>();
  for (const o of opdrachten) {
    const sleutel = o.toegewezen_aan ?? o.monteur_naam;
    if (!sleutel) continue;
    (perMonteur.get(sleutel) ?? perMonteur.set(sleutel, []).get(sleutel)!).push(o);
  }
  for (const eigen of perMonteur.values()) {
    const eerste = eigen[0];
    const metMarkering = await Promise.all(
      eigen.map(async (o) => ({
        ...o,
        verzet: klassificeerVerzending(o).verzet,
        historie: o.referentienummer
          ? historieVoorMonteur(await dbi.zoekOpReferentie(o.referentienummer), o.id)
          : undefined,
      })),
    );
    onthoud(
      await notificeerNieuweOpdrachten({
        toegewezenAan: eerste.toegewezen_aan,
        monteurNaam: eerste.monteur_naam ?? "monteur",
        opdrachten: metMarkering,
        zaaknaam: eerste.keukenzaak,
      }),
    );
  }

  // 2. Bij een monteur-wissel: de vorige monteur krijgt de annulering-melding (voor hem is de klus van
  //    de baan), per klus. Geen reden of overname-detail.
  for (const o of opdrachten) {
    const { vorigeMonteur } = klassificeerVerzending(o);
    if (!vorigeMonteur) continue;
    onthoud(
      await notificeerAnnulering({
        toegewezenAan: vorigeMonteur.toegewezen_aan,
        monteurNaam: vorigeMonteur.monteur_naam ?? "monteur",
        klantNaam: o.klant_naam ?? "klant",
        referentienummer: o.referentienummer,
        zaaknaam: o.keukenzaak,
      }),
    );
  }

  return { mailFout, smsFout, monteurs: perMonteur.size };
}
