import { NextResponse } from "next/server";
import { Resend } from "resend";
import { dbAdmin, type Db, type OpdrachtInput } from "@/lib/db";
import { storage } from "@/lib/storage";
import { parseOrderWithClaude } from "@/lib/claude-client";
import { adresKeuzeNodig } from "@/lib/adres-keuze";
import { tokenUitAdressen } from "@/lib/inbound";
import { verifyResendSignature } from "@/lib/webhook-handtekening";
import { groepeerInboundOrder } from "@/lib/inbound-groep";
import { schoonOmschrijving } from "@/lib/mail-schoon";
import { bestemmingVoor, type Rol } from "@/lib/invoer-bestemming";

export const runtime = "nodejs";

/**
 * Ontvangst-endpoint voor mail-naar-app (Resend Receiving). Resend POST een `email.received`-webhook.
 * We verifiëren de handtekening, herkennen de ontvanger aan zijn ontvangstadres (klus-<token>@...),
 * halen de mail + bijlagen op via de Resend-API en maken per keuken (gegroepeerd op referentienummer,
 * net als slepen op het dashboard) één voorstel aan. De mailtekst landt in het werk-veld. Rol-bewust:
 * - een MONTEUR-adres -> voorstel op `te_verwerken` in zijn /inbox-bakje (hij bevestigt eerst);
 * - een KANTOOR-adres (opdrachtgever/beheerder) -> direct als gewone klus voor de zaak op het dashboard
 *   ("te plannen"), want kantoor wil het meteen in de planlijst zien.
 */

interface InboundAttachmentMeta {
  id: string;
  filename: string | null;
  content_type: string;
}

async function bewaarBijlage(
  adm: Db,
  opdrachtId: string,
  att: InboundAttachmentMeta,
  bytes: Buffer,
  userId: string,
  referentienummer: string | null,
  isPrimair: boolean,
): Promise<void> {
  const isPdf = (att.content_type ?? "").includes("pdf");
  const naam = att.filename ?? (isPdf ? "bijlage.pdf" : "bijlage");
  const { pad, publieke_url } = await storage().uploadOpdrachtDocument(
    bytes,
    naam,
    att.content_type || "application/octet-stream",
  );
  await adm.addDocument({
    opdracht_id: opdrachtId,
    type: isPdf ? "pdf" : "afbeelding",
    bestandsnaam: naam,
    storage_pad: pad,
    publieke_url,
    referentienummer,
    is_primair: isPrimair,
    user_id: userId,
  });
}

export async function POST(req: Request) {
  const body = await req.text();

  // Handtekening verifiëren als de secret is ingesteld. Zo niet: loggen en doorgaan, want de token- en
  // ophaal-controles hieronder beperken misbruik al (een vervalste mail kunnen we toch niet ophalen).
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (secret) {
    const geldig = verifyResendSignature(
      secret,
      {
        id: req.headers.get("svix-id"),
        timestamp: req.headers.get("svix-timestamp"),
        signature: req.headers.get("svix-signature"),
      },
      body,
    );
    if (!geldig) {
      return NextResponse.json({ error: "Ongeldige handtekening" }, { status: 401 });
    }
  } else {
    console.warn("[inbound] RESEND_WEBHOOK_SECRET niet gezet: webhook niet geverifieerd.");
  }

  let event: {
    type?: string;
    data?: {
      email_id?: string;
      to?: string[];
      subject?: string | null;
      text?: string | null;
      attachments?: Array<{ id: string; filename: string | null; content_type: string }>;
    };
  };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  // Andere events negeren we (zoals het Resend-voorbeeld).
  if (event?.type !== "email.received") {
    return NextResponse.json({ ok: true });
  }

  const emailId = event.data?.email_id;
  const ontvangers = Array.isArray(event.data?.to) ? event.data!.to! : [];
  if (!emailId) return NextResponse.json({ ok: true });

  const token = tokenUitAdressen(ontvangers);
  if (!token) return NextResponse.json({ ok: true }); // niet voor ons

  const adm = dbAdmin();
  const profiel = await adm.getProfielByInboundToken(token);
  if (!profiel) return NextResponse.json({ ok: true }); // onbekend token

  // Idempotentie: Resend kan dezelfde mail opnieuw afleveren (het parsen hieronder duurt 10-30s,
  // langer dan Resend wacht). Verwerk elke email_id maar één keer, anders ontstaan dubbele klussen.
  const eersteKeer = await adm.markeerInboundVerwerkt(emailId);
  if (!eersteKeer) return NextResponse.json({ ok: true, dubbel: true });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY ontbreekt" }, { status: 500 });
  const resend = new Resend(apiKey);

  // De volledige mail erbij ophalen geeft de body-tekst. Lukt dat niet, dan loggen we de échte fout en
  // gaan we door op de webhook-payload (die onderwerp + bijlagen al bevat), zodat de klus tóch ontstaat.
  const volledig = await resend.emails.receiving
    .get(emailId)
    .catch((e: unknown) => ({ error: e, data: null }));
  if (volledig.error || !volledig.data) {
    console.error(
      "[inbound] receiving.get faalde, val terug op de webhook-payload:",
      JSON.stringify(volledig.error ?? "geen data"),
    );
  }
  // mail = de opgehaalde mail, of anders de payload uit de webhook.
  const mail = (volledig.data ?? event.data ?? {}) as {
    subject?: string | null;
    text?: string | null;
    attachments?: Array<{ id: string; filename: string | null; content_type: string }>;
  };
  const bijlagen: InboundAttachmentMeta[] = Array.isArray(mail.attachments)
    ? mail.attachments.map((a) => ({ id: a.id, filename: a.filename, content_type: a.content_type }))
    : [];

  async function haalBytes(attId: string): Promise<Buffer | null> {
    try {
      const att = await resend.emails.receiving.attachments.get({ emailId: emailId!, id: attId });
      if (att.error) {
        console.error("[inbound] attachments.get faalde:", JSON.stringify(att.error));
        return null;
      }
      const url = att.data?.download_url;
      if (!url) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.error("[inbound] bijlage downloaden faalde:", JSON.stringify(e));
      return null;
    }
  }

  const userId = profiel.id;
  const rol = (profiel.rol ?? "monteur") as Rol;
  // Een beheerder hangt niet aan één zaak; net als bij handmatig inschieten valt hij terug op de
  // standaard-zaak (de eerst aangemaakte opdrachtgever), zodat een doorgestuurde mail ergens landt.
  const gekozenZaak = rol === "beheerder" ? ((await adm.getStandaardOpdrachtgever())?.id ?? null) : null;
  const bestemming = bestemmingVoor(
    rol,
    { id: userId, opdrachtgever_id: profiel.opdrachtgever_id },
    gekozenZaak,
  );
  // Monteur: voorstel eerst in zijn /inbox (te_verwerken). Kantoor: direct als gewone klus op het
  // dashboard (te plannen), zoals Ed het wil zien.
  const teVerwerken = rol === "monteur";
  // De mailtekst (body) komt in het werk-veld zodat de doorgestuurde context meteen zichtbaar is.
  const mailtekst = ((mail as { text?: string | null }).text ?? "").trim() || null;

  /** Bouwt een volledige kop uit een (deels) geparste basis, met rol-bewuste bestemming + mailtekst. */
  function maakKop(basis: Partial<OpdrachtInput>): OpdrachtInput {
    return {
      documenttype: "onbekend",
      klant_naam: null,
      klant_adres: null,
      referentienummer: null,
      adviseur: null,
      klant_telefoon: null,
      leverweek: null,
      meldingen: [],
      ...basis,
      user_id: userId,
      toegewezen_aan: bestemming.toegewezen_aan,
      opdrachtgever_id: bestemming.opdrachtgever_id,
      te_verwerken: teVerwerken,
      // De PDF-omschrijving wint; anders de opgeschoonde mailtekst (handtekening/citaat/disclaimer eraf),
      // zodat het werk-veld de boodschap toont en niet de hele mail-staart.
      werkomschrijving: basis.werkomschrijving ?? schoonOmschrijving(mailtekst),
    };
  }

  const pdfs = bijlagen.filter((a) => (a.content_type ?? "").includes("pdf"));
  const overige = bijlagen.filter((a) => !(a.content_type ?? "").includes("pdf"));
  const voorstellen: string[] = [];

  try {
    if (pdfs.length > 0) {
      // Parse elke PDF, groepeer dan op referentienummer (zelfde keuken = één voorstel met meerdere
      // documenten, net als meerdere PDF's tegelijk slepen op het dashboard).
      const koppen: OpdrachtInput[] = [];
      const bytesPerPdf: (Buffer | null)[] = [];
      for (const att of pdfs) {
        const bytes = await haalBytes(att.id);
        bytesPerPdf.push(bytes);
        let basis: Partial<OpdrachtInput> = {};
        if (bytes) {
          try {
            const p = await parseOrderWithClaude(bytes, att.content_type);
            // Adres-keuze: meerdere adressen op de PDF? Dan niets gokken: klant_adres leeg laten en
            // de klus vlaggen, zodat de ontvanger (monteur in z'n inbox / kantoor op het dashboard)
            // bewust de montagelocatie kiest. Eén adres: gewoon overnemen.
            const keuzeNodig = adresKeuzeNodig(p.adressen);
            basis = {
              ...p,
              adres_kandidaten: p.adressen.length ? p.adressen : null,
              adres_keuze_nodig: keuzeNodig,
              klant_adres: keuzeNodig ? null : p.klant_adres,
            };
          } catch {
            // Parser faalt: leeg voorstel, het document blijft bewaard zodat de ontvanger het zelf leest.
          }
        }
        koppen.push(maakKop(basis));
      }

      // Eén mail = één keuken (tenzij echt meerdere refs). Zo ontstaat er geen kale, lege klus uit
      // een tweede PDF (bijv. een leidingadvies of een leeg-geparste order). De meest complete kop
      // wordt de kop van de klus.
      const groepen = groepeerInboundOrder(koppen);
      for (let g = 0; g < groepen.length; g++) {
        const groep = groepen[g];
        const kop = koppen[groep.kopIndex];
        const { id: opdrachtId } = await adm.createOpdracht(kop);
        voorstellen.push(opdrachtId);
        for (const idx of groep.indexen) {
          const bytes = bytesPerPdf[idx];
          if (bytes) {
            await bewaarBijlage(
              adm, opdrachtId, pdfs[idx], bytes, userId, kop.referentienummer ?? null,
              idx === groep.kopIndex,
            );
          }
        }
        // Losse afbeeldingen bij het eerste voorstel hangen.
        if (g === 0) {
          for (const img of overige) {
            const imgBytes = await haalBytes(img.id);
            if (imgBytes) await bewaarBijlage(adm, opdrachtId, img, imgBytes, userId, kop.referentienummer ?? null, false);
          }
        }
      }
    } else {
      // Geen PDF: één voorstel met het onderwerp als hint, de mailtekst in het werk-veld, bijlagen erbij.
      const kop = maakKop({ klant_naam: mail.subject?.trim() || null });
      const { id: opdrachtId } = await adm.createOpdracht(kop);
      voorstellen.push(opdrachtId);
      for (const img of overige) {
        const imgBytes = await haalBytes(img.id);
        if (imgBytes) await bewaarBijlage(adm, opdrachtId, img, imgBytes, userId, null, false);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: `Verwerken mislukt: ${(err as Error).message}` }, { status: 503 });
  }

  return NextResponse.json({ ok: true, voorstellen: voorstellen.length });
}
