import { NextResponse } from "next/server";
import { Resend } from "resend";
import { dbAdmin, type Db, type OpdrachtInput } from "@/lib/db";
import { storage } from "@/lib/storage";
import { parsePdfWithClaude } from "@/lib/claude-client";
import { tokenUitAdressen } from "@/lib/inbound";
import { verifyResendSignature } from "@/lib/webhook-handtekening";

export const runtime = "nodejs";

/**
 * Ontvangst-endpoint voor mail-naar-app (Resend Receiving). Resend POST een `email.received`-webhook.
 * We verifiëren de handtekening, herkennen de monteur aan zijn ontvangstadres (klus-<token>@...),
 * halen de mail + bijlagen op via de Resend-API en maken per PDF een "te verwerken"-voorstel aan dat
 * de monteur in zijn bakje bevestigt. Geen PDF: één voorstel met het onderwerp als hint + de bijlagen.
 * Maakt nooit blind een echte klus: alles staat op `te_verwerken` tot de monteur het nakijkt.
 */

interface InboundAttachmentMeta {
  id: string;
  filename: string | null;
  content_type: string;
}

function leegKop(userId: string): OpdrachtInput {
  return {
    documenttype: "onbekend",
    klant_naam: null,
    klant_adres: null,
    referentienummer: null,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    meldingen: [],
    user_id: userId,
    toegewezen_aan: userId,
    te_verwerken: true,
  };
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

  let event: { type?: string; data?: { email_id?: string; to?: string[] } };
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

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY ontbreekt" }, { status: 500 });
  const resend = new Resend(apiKey);

  const volledig = await resend.emails.receiving.get(emailId);
  if (volledig.error || !volledig.data) {
    return NextResponse.json({ error: "Mail ophalen mislukt" }, { status: 502 });
  }
  const mail = volledig.data;
  const bijlagen: InboundAttachmentMeta[] = Array.isArray(mail.attachments)
    ? mail.attachments.map((a) => ({ id: a.id, filename: a.filename, content_type: a.content_type }))
    : [];

  async function haalBytes(attId: string): Promise<Buffer | null> {
    const att = await resend.emails.receiving.attachments.get({ emailId: emailId!, id: attId });
    const url = att.data?.download_url;
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  const userId = profiel.id;
  const pdfs = bijlagen.filter((a) => (a.content_type ?? "").includes("pdf"));
  const overige = bijlagen.filter((a) => !(a.content_type ?? "").includes("pdf"));
  const voorstellen: string[] = [];

  try {
    if (pdfs.length > 0) {
      // Elke PDF = één voorstel: parsen, voorstel aanmaken, document bewaren.
      for (let i = 0; i < pdfs.length; i++) {
        const att = pdfs[i];
        const bytes = await haalBytes(att.id);
        let kop = leegKop(userId);
        if (bytes) {
          try {
            const p = await parsePdfWithClaude(bytes);
            kop = { ...p, user_id: userId, toegewezen_aan: userId, te_verwerken: true };
          } catch {
            // Parser faalt: leeg voorstel, het document blijft bewaard zodat de monteur het zelf leest.
          }
        }
        const { id: opdrachtId } = await adm.createOpdracht(kop);
        voorstellen.push(opdrachtId);
        if (bytes) {
          await bewaarBijlage(adm, opdrachtId, att, bytes, userId, kop.referentienummer ?? null, true);
        }
        // Losse afbeeldingen bij het eerste voorstel hangen.
        if (i === 0) {
          for (const img of overige) {
            const imgBytes = await haalBytes(img.id);
            if (imgBytes) await bewaarBijlage(adm, opdrachtId, img, imgBytes, userId, kop.referentienummer ?? null, false);
          }
        }
      }
    } else {
      // Geen PDF: één voorstel met het onderwerp als hint en de bijlagen erbij.
      const kop = leegKop(userId);
      kop.klant_naam = mail.subject?.trim() || null;
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
