import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_ACCOUNTS, DEMO_WACHTWOORD } from "./demo.ts";

/**
 * Vult een DEMO-database met een schone, gevulde, altijd-actuele staat: nep-monteurs + klussen over alle
 * statussen, één klaar om af te melden, plus lege ruimte om zelf te doen. Datums relatief aan vandaag,
 * dus elke (re)seed schuift mee naar de huidige week.
 *
 * VEILIG: deze functie hoort ALLEEN tegen de demo-database te draaien (de aanroeper geeft een admin-client
 * van het demo-Supabase-project). Alle contactgegevens zijn NEP (voorbeelddomein + fictieve 06-nummers),
 * als dubbele bodem naast de SMS/mail-allowlist. Self-contained: geen @/-imports, zodat zowel de
 * reset-route (Next) als een CLI-script ('m kan aanroepen.
 */

// ---- datum-helpers (UTC, relatief aan vandaag; weekend wordt overgeslagen) ----

function isoVan(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Maandag van de week waarin `nu` valt (zaterdag/zondag schuiven naar de komende maandag). */
function maandagVanWeek(nu: Date): Date {
  const d = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate()));
  const dow = d.getUTCDay(); // 0=zo .. 6=za
  if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  else if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  else d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d;
}

function plusDagen(d: Date, n: number): string {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return isoVan(c);
}

interface SeedResultaat {
  accounts: Record<string, string>; // rol-sleutel -> user-id
  aantalKlussen: number;
}

/** Maakt een demo-account aan (of vindt het bestaande) en zet het profiel. Geeft het user-id terug.
 *  Het contact (telefoon/mail) wordt op het TEST-contact gezet, zodat notificaties vanzelf bij de tester
 *  binnenkomen (de monteur-SMS gaat naar het profiel-telefoonnummer). */
async function maakAccount(
  admin: SupabaseClient,
  account: { email: string; naam: string; rol: "beheerder" | "monteur" },
  opdrachtgeverId: string | null,
  testContact: { telefoon: string | null; mail: string | null },
): Promise<string> {
  const gemaakt = await admin.auth.admin.createUser({
    email: account.email,
    password: DEMO_WACHTWOORD,
    email_confirm: true,
  });
  let id = gemaakt.data?.user?.id ?? "";
  if (!id) {
    // Bestaat al: opzoeken op e-mail.
    for (let page = 1; page <= 20 && !id; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      const found = data?.users?.find((u) => u.email === account.email);
      if (found) id = found.id;
      if (!data?.users?.length) break;
    }
  }
  if (!id) throw new Error(`Kon demo-account ${account.email} niet aanmaken of vinden`);
  const { error } = await admin.from("profielen").upsert(
    {
      id,
      rol: account.rol,
      naam: account.naam,
      opdrachtgever_id: opdrachtgeverId,
      // Koppel het profiel aan het testcontact zodat SMS/mail vanzelf bij de tester binnenkomen.
      telefoon: testContact.telefoon,
      contact_email: testContact.mail,
      sms_werk_kritiek: true,
      sms_overig: true,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`Demo-profiel ${account.email} mislukt: ${error.message}`);
  return id;
}

export async function seedDemo(admin: SupabaseClient): Promise<SeedResultaat> {
  // 1) Zaak (opdrachtgever) ophalen of aanmaken.
  let opdrachtgeverId: string | null = null;
  const { data: zaak } = await admin.from("opdrachtgevers").select("id").limit(1).maybeSingle();
  if (zaak?.id) {
    opdrachtgeverId = zaak.id as string;
  } else {
    const { data: nieuw, error } = await admin
      .from("opdrachtgevers")
      .insert({ naam: "Demo Keukenstudio" })
      .select("id")
      .single();
    if (error) throw new Error(`Demo-opdrachtgever aanmaken mislukt: ${error.message}`);
    opdrachtgeverId = (nieuw?.id as string) ?? null;
  }

  // 2) Accounts. Nog GEEN contact: de tester registreert zelf zijn 06/mail (demo-registratie), dan komen
  // de berichten op zíjn toestel. Tot die tijd staat er geen nummer, dus er gaat niets per ongeluk uit.
  const geenContact = { telefoon: null, mail: null };
  const kantoorId = await maakAccount(admin, DEMO_ACCOUNTS.kantoor, opdrachtgeverId, geenContact);
  const monteurId = await maakAccount(admin, DEMO_ACCOUNTS.monteur, opdrachtgeverId, geenContact);
  const monteur2Id = await maakAccount(admin, DEMO_ACCOUNTS.monteur2, opdrachtgeverId, geenContact);

  // 3) Bestaande demo-klussen wissen (idempotent; ALLEEN deze demo-DB). Opleveringen hangen via cascade.
  await admin.from("meldingen").delete().not("id", "is", null);

  // 4) Klussen over alle statussen, datums relatief aan deze week. Alle contactgegevens NEP.
  const maandag = maandagVanWeek(new Date());
  let n = 0;
  const nepTelefoon = () => `+3160000${String(100 + n).padStart(4, "0")}`;
  const nepMail = () => `klant${n}@voorbeeld.kluslus.test`;

  async function maakKlus(over: Record<string, unknown>): Promise<string> {
    n += 1;
    const basis: Record<string, unknown> = {
      bron: "pdf",
      documenttype: n % 2 === 0 ? "orderbevestiging" : "werkbon_service",
      klant_naam: `Fam. Demo-${["Jansen", "Bakker", "de Wit", "Visser", "Smit", "Koster", "Mulder", "Groot"][n % 8]}`,
      klant_adres: `Voorbeeldstraat ${10 + n}, Demostad`,
      referentienummer: `${9000 + n}`,
      klant_telefoon: nepTelefoon(),
      klant_email: nepMail(),
      keukenzaak: "Demo Keukenstudio",
      meldingen: [],
      opdrachtgever_id: opdrachtgeverId,
      user_id: kantoorId,
      duur_dagen: 1,
    };
    const { data, error } = await admin
      .from("meldingen")
      .insert({ ...basis, ...over })
      .select("id")
      .single();
    if (error) throw new Error(`Demo-klus aanmaken mislukt: ${error.message}`);
    return data?.id as string;
  }

  const verzonden = (dag: string, monteur: string, naam: string) => ({
    verzonden_monteur: naam,
    verzonden_toegewezen_aan: monteur,
    verzonden_startdatum: dag,
    verzonden_starttijd: null,
    verzonden_at: new Date().toISOString(),
  });

  // Pool: te plannen (lege ruimte om zelf te slepen).
  await maakKlus({ dashboard_status: "binnen" });
  await maakKlus({ dashboard_status: "binnen" });

  // Gepland (verstuurd, wacht op bevestiging) bij monteur 1, deze week dinsdag.
  await maakKlus({
    dashboard_status: "gepland",
    toegewezen_aan: monteurId,
    monteur_naam: DEMO_ACCOUNTS.monteur.naam,
    startdatum: plusDagen(maandag, 1),
    uitvoerdatum: plusDagen(maandag, 1),
    ...verzonden(plusDagen(maandag, 1), monteurId, DEMO_ACCOUNTS.monteur.naam),
  });

  // Bevestigd bij monteur 2, deze week woensdag.
  await maakKlus({
    dashboard_status: "bevestigd",
    bevestigd_at: new Date().toISOString(),
    toegewezen_aan: monteur2Id,
    monteur_naam: DEMO_ACCOUNTS.monteur2.naam,
    startdatum: plusDagen(maandag, 2),
    uitvoerdatum: plusDagen(maandag, 2),
    ...verzonden(plusDagen(maandag, 2), monteur2Id, DEMO_ACCOUNTS.monteur2.naam),
  });

  // KLAAR OM AF TE MELDEN: bevestigd bij monteur 1, vandaag (de twee-kanten-magie meteen toonbaar).
  await maakKlus({
    dashboard_status: "bevestigd",
    bevestigd_at: new Date().toISOString(),
    toegewezen_aan: monteurId,
    monteur_naam: DEMO_ACCOUNTS.monteur.naam,
    startdatum: isoVan(new Date()),
    uitvoerdatum: isoVan(new Date()),
    ...verzonden(isoVan(new Date()), monteurId, DEMO_ACCOUNTS.monteur.naam),
  });

  // Opgeleverd (groen, met oplever-record) bij monteur 2, vorige week.
  const opgeleverdId = await maakKlus({
    dashboard_status: "opgeleverd",
    opdracht_status: "opgeleverd",
    opgeleverd_at: new Date().toISOString(),
    toegewezen_aan: monteur2Id,
    monteur_naam: DEMO_ACCOUNTS.monteur2.naam,
    startdatum: plusDagen(maandag, -4),
    uitvoerdatum: plusDagen(maandag, -4),
  });
  await admin.from("opleveringen").insert({
    opdracht_id: opgeleverdId,
    uitkomst: "afgerond",
    eindstaat_foto_urls: [],
    video_url: null,
    opmerking: "Keuken netjes opgeleverd, klant tevreden. (demo)",
    zaak_rapport_verzonden_at: new Date().toISOString(),
    user_id: monteur2Id,
  });

  return {
    accounts: { kantoor: kantoorId, monteur: monteurId, monteur2: monteur2Id },
    aantalKlussen: n,
  };
}
