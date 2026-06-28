import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { notificeerNieuweOpdrachten } from "@/lib/notificaties";
import { verstuurOpleverRapport } from "@/lib/mail";
import { inboundAdres } from "@/lib/inbound";
import { SUPABASE_URL, SUPABASE_SECRET, SUPABASE_ANON, OP_ZIJSPOOR, BEHEERDER, MONTEUR } from "../e2e/test-env";
import { getIntZaakId, INT_PREFIX, ruimIntDataOp } from "./int-harnas";

/**
 * Keten-integratietest: de HELE loop in één doorloop, op de lib/db-laag plus de ECHTE inbound-handler.
 * Dekt het gat dat alle losse int-tests per stap testen maar geen enkele de keten als geheel: groen
 * hier betekent dat een binnengekomen mail tot en met de oplevering blijft lopen.
 *
 * Schakels:
 *  1. INBOUND  - de echte POST uit src/app/api/inbound/route.ts met een email.received-payload
 *                (TEKST-mail, geen PDF: geen Claude-call, de payload-terugval maakt de klus).
 *  2. PLANNEN  - db.planOpdracht (kantoor wijst de klus toe aan de monteur).
 *  3. BEVESTIGEN - notificeerNieuweOpdrachten (mail + sms-poging naar de monteur), daarna
 *                  markeerVerzonden + bevestigOntvangst (de statusovergangen).
 *  4. OPLEVEREN - upsertOpleveringConcept + verstuurOpleverRapport (rapport-mailpoging) +
 *                 registreerZaakRapport (op 'opgeleverd').
 *
 * Mail/sms gaan NOOIT echt de deur uit: MAIL_DRY_RUN/SMS_DRY_RUN staan aan en we controleren de
 * verzendpoging op ontvanger + inhoud via de dry-run-regel die mail.ts/sms.ts loggen.
 *
 * Data-isolatie: alle test-data hangt aan de INT-scope (int-harnas). De inbound-klus ontstaat onder
 * de zaak van het kantoor-token (niet de INT-zaak), dus de klantnaam krijgt de INT-prefix zodat
 * ruimIntDataOp 'm ook opruimt; daarnaast verwijderen we 'm expliciet op id.
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

// Het inbound-domein dat de keten-test gebruikt; het ontvangstadres en de token-herkenning volgen dit.
const KETEN_DOMEIN = "keten-test.kluslus.nl";

let intZaakId = "";
let kantoorToken = "";
let standaardZaakId = "";
let standaardZaakNaam = "";
let verwerkteEmailIds: string[] = [];

/** Leest de actuele statusvelden van een klus rechtstreeks uit de DB. */
async function statusVan(id: string) {
  const { data } = await admin
    .from("meldingen")
    .select("dashboard_status, opdracht_status, toegewezen_aan, opdrachtgever_id, te_verwerken")
    .eq("id", id)
    .single();
  return data;
}

describe.skipIf(!OP_ZIJSPOOR)("Keten: inbound -> plannen -> bevestigen -> opleveren", () => {
  beforeAll(async () => {
    // Env voor de echte route + de mail/sms-libs. env() (zod) wordt pas tijdens de testbody aangeroepen
    // (alle env()-calls zitten in functies), dus hier zetten is op tijd.
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SECRET_KEY = SUPABASE_SECRET;
    process.env.SUPABASE_PUBLISHABLE_KEY = SUPABASE_ANON || "x".repeat(40);
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "x".repeat(40);
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "x".repeat(40);
    // Mail/sms staan VERPLICHT op dry-run; de tokens moeten alleen aanwezig zijn (verstuur* eist ze,
    // ook in dry-run), de waarde doet er in dry-run niet toe.
    process.env.MAIL_DRY_RUN = "1";
    process.env.SMS_DRY_RUN = "1";
    process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_keten_test_dummy_key_0000000000";
    process.env.CM_PRODUCT_TOKEN = process.env.CM_PRODUCT_TOKEN || "keten-test-dummy-token";
    process.env.INBOUND_DOMAIN = KETEN_DOMEIN;
    process.env.RAPPORT_EMAIL = "kantoor@keten.kluslus.test";
    process.env.APP_URL = "https://keten-test.kluslus.nl";
    // Geen webhook-secret: dan slaat de route de handtekening-check over (token + ophaal beperken misbruik).
    delete process.env.RESEND_WEBHOOK_SECRET;

    intZaakId = await getIntZaakId(admin);

    // Het kantoor-inbound-token: get-or-create op het beheerder-testaccount.
    kantoorToken = await db.ensureInboundToken(BEHEERDER.uid);

    // De standaard-zaak: hier landt de kantoor-inbound-klus (beheerder hangt niet aan één zaak).
    const zaak = await db.getStandaardOpdrachtgever();
    if (!zaak) throw new Error("Geen standaard-opdrachtgever; draai de migraties eerst.");
    standaardZaakId = zaak.id;
    standaardZaakNaam = zaak.naam;
  });

  beforeEach(async () => {
    await ruimIntDataOp(admin, intZaakId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await ruimIntDataOp(admin, intZaakId);
    // Idempotentie-rijen van deze run opruimen, zodat een herdraai met hetzelfde (her)bruikte id niet stuit.
    for (const eid of verwerkteEmailIds) {
      await admin.from("inbound_verwerkt").delete().eq("email_id", eid);
    }
  });

  it("een binnengekomen mail loopt als één keten t/m de oplevering", async () => {
    const stamp = Date.now();
    const klant = `${INT_PREFIX}Keten ${stamp}`; // wordt klant_naam (= onderwerp bij een tekstmail)
    const emailId = `keten-int-${stamp}`;
    verwerkteEmailIds.push(emailId);
    const naarAdres = inboundAdres(kantoorToken, KETEN_DOMEIN);

    // Console meelezen: de dry-run-regels van mail.ts/sms.ts zijn ons bewijs van de verzendpoging.
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    // ---- 1. INBOUND: echte handler, tekstmail, payload-terugval (geen PDF) ----
    const { POST } = await import("@/app/api/inbound/route");
    const payload = {
      type: "email.received",
      data: {
        email_id: emailId,
        to: [naarAdres],
        subject: klant,
        text: "Graag deze keuken inplannen. Klant is bereikbaar op werkdagen.\n\nGroet, het kantoor",
        attachments: [],
      },
    };
    const res = await POST(
      new Request("https://keten-test.kluslus.nl/api/inbound", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).voorstellen).toBe(1);

    // De klus moet bestaan, onder de kantoor-zaak, als te-plannen klus (kantoor, niet 'te verwerken').
    const { data: rij } = await admin
      .from("meldingen")
      .select("id")
      .eq("klant_naam", klant)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const id = rij?.id as string | undefined;
    expect(id, "inbound moet een klus hebben aangemaakt").toBeTruthy();

    const naInbound = await statusVan(id!);
    expect(naInbound?.dashboard_status).toBe("binnen");
    expect(naInbound?.opdrachtgever_id).toBe(standaardZaakId);
    expect(naInbound?.toegewezen_aan).toBeNull();
    expect(naInbound?.te_verwerken).toBe(false);

    // ---- 2. PLANNEN: kantoor wijst toe aan de monteur ----
    await db.planOpdracht(id!, {
      toegewezen_aan: MONTEUR.uid,
      monteur_naam: "E2E Monteur",
      startdatum: "2026-06-20",
      starttijd: null,
      duur_dagen: 1,
    });
    expect((await statusVan(id!))?.dashboard_status).toBe("concept_gepland");

    // ---- 3a. BEVESTIGEN: mail + sms-poging naar de monteur ----
    const opdracht = await db.getMeldingById(id!);
    expect(opdracht, "klus moet leesbaar zijn voor de monteur-mail").toBeTruthy();
    const notif = await notificeerNieuweOpdrachten({
      toegewezenAan: MONTEUR.uid,
      monteurNaam: "E2E Monteur",
      opdrachten: [opdracht!],
      zaaknaam: standaardZaakNaam,
    });
    expect(notif.gemaild, `mail moest lukken, fout: ${notif.mailFout}`).toBe(true);
    expect(notif.gesmst, `sms moest lukken, fout: ${notif.smsFout}`).toBe(true);

    // Mail-poging: juiste ontvanger (profiel-contactadres van de monteur) + juiste onderwerp.
    const mailRegel = logs.find((l) => l.startsWith("[mail dry-run]") && l.includes(klant));
    expect(mailRegel, `geen mail-dry-run-regel gevonden in: ${logs.join(" | ")}`).toBeTruthy();
    expect(mailRegel).toContain("monteur@e2e.test"); // contact_email van de testmonteur
    expect(mailRegel).toContain(`Klus voor E2E Monteur: ${klant}`);

    // Sms-poging: juiste nummer (genormaliseerd) + juiste inhoud (nieuwe klus, klantnaam).
    const smsRegel = logs.find((l) => l.startsWith("[SMS dry-run]") && l.includes(klant));
    expect(smsRegel, `geen sms-dry-run-regel gevonden in: ${logs.join(" | ")}`).toBeTruthy();
    expect(smsRegel).toContain("+31612345678"); // 0612345678 genormaliseerd
    expect(smsRegel).toContain(`nieuwe klus: ${klant}`);

    // ---- 3b. BEVESTIGEN: statusovergangen verstuurd -> bevestigd ----
    await db.markeerVerzonden(id!, {
      toegewezen_aan: MONTEUR.uid,
      monteur_naam: "E2E Monteur",
      startdatum: "2026-06-20",
      starttijd: null,
    });
    expect((await statusVan(id!))?.dashboard_status).toBe("gepland");

    await db.bevestigOntvangst(id!);
    expect((await statusVan(id!))?.dashboard_status).toBe("bevestigd");

    // ---- 4. OPLEVEREN: oplever-concept + rapport-mailpoging + op 'opgeleverd' ----
    await db.upsertOpleveringConcept({
      opdracht_id: id!,
      eindstaat_foto_urls: [`https://test.supabase.co/storage/v1/object/public/oplever/foto-${id}.png`],
      video_url: null,
      opmerking: "INT keten netjes opgeleverd",
      interne_opmerking: null,
      klant_rapport_email: null,
      handtekening_url: `https://x/htk-${id}.png`,
      rapport_email: null,
      user_id: MONTEUR.uid,
    });

    const oplevering = await db.getOpleveringVoorOpdracht(id!);
    expect(oplevering, "oplever-concept moet vastgelegd zijn").toBeTruthy();
    const naar = oplevering!.rapport_email?.trim() || process.env.RAPPORT_EMAIL!.trim();
    const p = await db.getProfiel(MONTEUR.uid);
    const afzender = p
      ? { naam: p.naam, bedrijfsnaam: p.bedrijfsnaam, telefoon: p.telefoon, email: p.contact_email }
      : null;

    // Mirror van de rapport-route: mail eerst (poging), daarna de status registreren.
    await verstuurOpleverRapport({
      naar,
      opdracht: opdracht!,
      pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]), // "%PDF" - dry-run verstuurt niets, dus dummy mag
      bestandsnaam: `opleverrapport-${id}.pdf`,
      videoUrl: oplevering!.video_url,
      afzender,
      doelgroep: "zaak",
      klantOok: null,
    });

    const rapportRegel = logs.find(
      (l) => l.startsWith("[mail dry-run]") && l.includes(`Opleverrapport ${klant}`),
    );
    expect(rapportRegel, `geen rapport-mail-dry-run-regel gevonden in: ${logs.join(" | ")}`).toBeTruthy();
    expect(rapportRegel).toContain("kantoor@keten.kluslus.test"); // RAPPORT_EMAIL (zaak-ontvanger)

    await db.registreerZaakRapport(id!, `https://x/opdracht-documenten/${id}.pdf`);
    expect((await statusVan(id!))?.opdracht_status).toBe("opgeleverd");
  });
});
