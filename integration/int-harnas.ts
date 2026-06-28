import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * Gedeeld harnas voor de integratie-suite (FASE 5 data-isolatie).
 *
 * Probleem dat dit oplost: de integratie-tests deelden de test-DB met Reiniers handmatige keuringen,
 * maar wisten in een `wipe()` de HELE meldingen-tabel leeg. Dat verwijderde ook keuringsdata. Hier
 * krijgen de integratie-tests een eigen, herkenbare scope: een vaste eigen opdrachtgever (`INT-zaak`)
 * plus een vaste naam-prefix op `klant_naam`. De opruiming raakt alleen die scope, nooit de hele tabel.
 *
 * Spiegelt het patroon van `e2e/global-teardown.ts` (prefix-gescopte teardown, `ruimE2eKlussenOp`).
 */

/** Naam van de vaste integratie-opdrachtgever in de test-DB. Stabiel, wordt niet opgeruimd. */
export const INT_ZAAK_NAAM = "INT Integratietest";

/** Vaste naam-prefix voor alle integratie-klussen, zodat ad-hoc (zaakloze) test-klussen ook te scopen zijn. */
export const INT_PREFIX = "INT ";

/**
 * Get-or-create de vaste integratie-opdrachtgever (zaak) en geef zijn id terug. Idempotent: bestaat hij
 * al, dan wordt die hergebruikt, zodat er nooit dubbele INT-zaken ontstaan. De integratiesuite draait
 * sequentieel (fileParallelism: false), dus een simpele lees-dan-schrijf is veilig.
 *
 * Belangrijk: dit is NOOIT de standaard-opdrachtgever (die getStandaardOpdrachtgever teruggeeft), want
 * de INT-zaak wordt later aangemaakt dan Reiniers echte zaak. Zo blijft Reiniers data buiten de scope.
 */
export async function getIntZaakId(admin: SupabaseClient): Promise<string> {
  const { data: bestaand, error: leesfout } = await admin
    .from("opdrachtgevers")
    .select("id")
    .eq("naam", INT_ZAAK_NAAM)
    .limit(1)
    .maybeSingle();
  if (leesfout) throw new Error(`INT-zaak lezen mislukt: ${leesfout.message}`);
  if (bestaand?.id) return bestaand.id as string;

  const { data: nieuw, error: maakfout } = await admin
    .from("opdrachtgevers")
    .insert({ naam: INT_ZAAK_NAAM })
    .select("id")
    .single();
  if (maakfout) throw new Error(`INT-zaak maken mislukt: ${maakfout.message}`);
  return nieuw!.id as string;
}

/**
 * Gescopte opruiming: verwijder ALLEEN de eigen integratiedata, NOOIT de hele tabel.
 *
 * Twee complementaire scopes:
 *  1. alle meldingen onder de INT-zaak (`opdrachtgever_id = intZaakId`) — de kantoor-klussen;
 *  2. alle meldingen met de INT-naam-prefix — vangt ook ad-hoc (zaakloze) integratie-klussen.
 *
 * `documenten` en `opleveringen` hangen met `ON DELETE CASCADE` aan `meldingen`, dus die kinderen gaan
 * automatisch mee; een aparte brede delete daarop (zoals de oude wipe deed) is niet meer nodig.
 *
 * Wat hier NIET geraakt wordt: een keuring-klus onder een andere opdrachtgever met een gewone naam.
 */
export async function ruimIntDataOp(admin: SupabaseClient, intZaakId: string): Promise<void> {
  await admin.from("meldingen").delete().eq("opdrachtgever_id", intZaakId);
  await admin.from("meldingen").delete().like("klant_naam", `${INT_PREFIX}%`);
}
