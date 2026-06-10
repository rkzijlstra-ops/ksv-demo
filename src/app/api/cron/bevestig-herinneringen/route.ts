import { NextResponse } from "next/server";
import { dbAdmin, type Melding } from "@/lib/db";
import { notificeerHerinnering } from "@/lib/notificaties";
import { herinneringCutoff } from "@/lib/herinnering";

export const dynamic = "force-dynamic";

/**
 * Cron-endpoint (Vercel Cron, GET): stuurt een bevestig-herinnering naar monteurs met klussen die langer
 * dan HERINNERING_NA_UUR geleden verstuurd zijn en nog niet bevestigd. Per monteur gebundeld, idempotent
 * via herinnering_verzonden_at. Beschermd met CRON_SECRET (Vercel stuurt 'Authorization: Bearer <secret>').
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
    }
  }

  const uren = Number(process.env.HERINNERING_NA_UUR?.trim() || "24");
  const cutoff = herinneringCutoff(new Date(), uren);

  const dbi = dbAdmin();
  const klussen = await dbi.getKlussenVoorHerinnering(cutoff);

  // Bundel per monteur (toegewezen_aan).
  const perMonteur = new Map<string, Melding[]>();
  for (const k of klussen) {
    const sleutel = k.toegewezen_aan;
    if (!sleutel) continue;
    (perMonteur.get(sleutel) ?? perMonteur.set(sleutel, []).get(sleutel)!).push(k);
  }

  const verstuurdeIds: string[] = [];
  for (const [toegewezenAan, eigen] of perMonteur.entries()) {
    const eerste = eigen[0];
    await notificeerHerinnering({
      toegewezenAan,
      monteurNaam: eerste.monteur_naam ?? "monteur",
      klantNamen: eigen.map((k) => k.klant_naam ?? "een klus"),
      zaaknaam: eerste.keukenzaak,
    });
    verstuurdeIds.push(...eigen.map((k) => k.id));
  }
  await dbi.markeerHerinneringVerzonden(verstuurdeIds);

  return NextResponse.json({ ok: true, monteurs: perMonteur.size, klussen: verstuurdeIds.length });
}
