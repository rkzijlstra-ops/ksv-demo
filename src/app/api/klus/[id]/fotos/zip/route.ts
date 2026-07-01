import { NextResponse } from "next/server";
import { zipSync } from "fflate";
import { db } from "@/lib/db";
import { fotoDownloadEntries } from "@/lib/rapport-indeling";

export const dynamic = "force-dynamic";

/**
 * Publieke zip-download van de oplever-foto's van één klus, gesleuteld op het opdracht-id (UUID) —
 * dezelfde niet-raadbare laag als de al-publieke foto-URL's. `?sel=0,2,3` kiest specifieke foto's
 * (index in de eigen fotolijst van de klus); zonder `sel` komt alles mee. De route accepteert alléén
 * indexen in die eigen lijst, nooit losse URL's, zodat er geen SSRF ontstaat.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Klus niet gevonden" }, { status: 404 });
  }

  const meldingen = await dbi.getMeldingenVoorOpdracht(id);
  const oplevering = await dbi.getOpleveringVoorOpdracht(id);
  const eindstaat = oplevering?.eindstaat_foto_urls ?? [];

  const entries = fotoDownloadEntries(meldingen, eindstaat);
  if (entries.length === 0) {
    return NextResponse.json({ error: "Geen foto's bij deze klus" }, { status: 404 });
  }

  // Selectie: alleen geldige indexen uit de eigen lijst; geen/lege sel = alles.
  const selParam = new URL(req.url).searchParams.get("sel");
  let gekozen = entries;
  if (selParam !== null && selParam.trim() !== "") {
    const wil = new Set(
      selParam
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n)),
    );
    gekozen = entries.filter((e) => wil.has(e.index));
    if (gekozen.length === 0) {
      return NextResponse.json({ error: "Geen geldige foto-selectie" }, { status: 400 });
    }
  }

  // Foto's server-side ophalen (publieke storage-URL's). Een mislukte fetch slaan we over; komt er
  // niets binnen, dan een nette 502.
  const bestanden: Record<string, Uint8Array> = {};
  await Promise.all(
    gekozen.map(async (e) => {
      try {
        const res = await fetch(e.url);
        if (!res.ok) return;
        bestanden[e.naam] = new Uint8Array(await res.arrayBuffer());
      } catch {
        // overslaan; de zip bevat de foto's die wél lukten
      }
    }),
  );
  if (Object.keys(bestanden).length === 0) {
    return NextResponse.json({ error: "Foto's ophalen mislukt" }, { status: 502 });
  }

  // level 0 (store): JPEG/PNG zijn al gecomprimeerd, dus geen winst en wél sneller.
  const zip = zipSync(bestanden, { level: 0 });
  const ref = opdracht.referentienummer?.replace(/[^a-zA-Z0-9_-]/g, "") || id;
  return new NextResponse(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="fotos-${ref}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
