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

/** Zoekt het user-id bij een e-mailadres (auth.users). */
async function vindUserId(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 30; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    const found = data?.users?.find((u) => u.email === email);
    if (found) return found.id;
    if (!data?.users?.length) break;
  }
  return null;
}

// Alle demo-accounts leven in deze namespace. Het opruimen blijft daarbinnen, zodat het NOOIT andere
// accounts raakt (bv. de e2e-accounts als de demo tegen de gedeelde test-DB draait).
const DEMO_DOMEIN = "@voorbeeld.kluslus.test";

/** Verwijdert de ZELF-aangemelde demo-monteurs (binnen de demo-namespace, niet de vaste accounts). */
async function ruimZelfAangemeldOp(admin: SupabaseClient): Promise<void> {
  const vast = new Set([DEMO_ACCOUNTS.kantoor.email, DEMO_ACCOUNTS.monteur.email, DEMO_ACCOUNTS.monteur2.email]);
  const teVerwijderen: string[] = [];
  for (let page = 1; page <= 30; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && u.email.endsWith(DEMO_DOMEIN) && !vast.has(u.email)) teVerwijderen.push(u.id);
    }
    if (users.length < 100) break;
  }
  for (const id of teVerwijderen) {
    await admin.from("profielen").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);
  }
}

export async function seedDemo(
  admin: SupabaseClient,
  opts?: { behoudKantoorContact?: boolean },
): Promise<SeedResultaat> {
  // 1) De demo-zaak ophalen of aanmaken, OP NAAM. Zo heeft de demo een eigen opdrachtgever en raakt hij
  // andere data in dezelfde DB niet (belangrijk als de demo tegen de gedeelde test-DB draait).
  let opdrachtgeverId: string | null = null;
  const { data: zaak } = await admin
    .from("opdrachtgevers")
    .select("id")
    .eq("naam", "Demo Keukenstudio")
    .limit(1)
    .maybeSingle();
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

  // 2) Het beheerder-contact bewaren bij een gewone reset, zodat de demo-draaier zich niet opnieuw hoeft
  // te melden. Bij een volledige reset (behoudKantoorContact=false) start de beheerder weer leeg.
  let kantoorContact: { telefoon: string | null; mail: string | null } = { telefoon: null, mail: null };
  let kantoorNaam = DEMO_ACCOUNTS.kantoor.naam;
  if (opts?.behoudKantoorContact) {
    const kId = await vindUserId(admin, DEMO_ACCOUNTS.kantoor.email);
    if (kId) {
      const { data: p } = await admin
        .from("profielen")
        .select("naam, telefoon, contact_email")
        .eq("id", kId)
        .maybeSingle();
      if (p) {
        kantoorContact = { telefoon: (p.telefoon as string) ?? null, mail: (p.contact_email as string) ?? null };
        if (p.naam) kantoorNaam = p.naam as string;
      }
    }
  }

  // 3) Zelf-aangemelde monteurs opruimen + de klussen van DEZE demo-zaak wissen (alleen de demo-tenant,
  // zodat andere data in dezelfde DB ongemoeid blijft).
  await ruimZelfAangemeldOp(admin);
  await admin.from("meldingen").delete().eq("opdrachtgever_id", opdrachtgeverId);

  // 4) Vaste accounts. Kantoor = de beheerder (houdt zijn contact bij een gewone reset). De voorbeeld-
  // monteurs krijgen hetzelfde contact, zodat een klus aan hen bij de demo-draaier (beheerder) binnenkomt.
  const kantoorId = await maakAccount(admin, { ...DEMO_ACCOUNTS.kantoor, naam: kantoorNaam }, opdrachtgeverId, kantoorContact);
  const monteurId = await maakAccount(admin, DEMO_ACCOUNTS.monteur, opdrachtgeverId, kantoorContact);
  const monteur2Id = await maakAccount(admin, DEMO_ACCOUNTS.monteur2, opdrachtgeverId, kantoorContact);

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
