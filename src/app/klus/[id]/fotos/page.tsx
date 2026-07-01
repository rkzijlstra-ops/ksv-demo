import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fotoGroepen } from "@/lib/rapport-indeling";
import { FotoDownloadClient } from "./FotoDownloadClient";

export const dynamic = "force-dynamic";

/**
 * Publieke foto-downloadpagina die vanuit het opleverrapport (knop "Foto's downloaden") wordt geopend.
 * Toegang via het niet-raadbare opdracht-id; de opdrachtgever is hier niet ingelogd (zie de PUBLIEK-
 * lijst in supabase-middleware.ts). Toont de foto's in rapport-volgorde: meldingen (met tekst) eerst,
 * dan de eindstaat.
 */
export default async function KlusFotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) notFound();

  const meldingen = await dbi.getMeldingenVoorOpdracht(id);
  const oplevering = await dbi.getOpleveringVoorOpdracht(id);
  const eindstaat = oplevering?.eindstaat_foto_urls ?? [];

  const groepen = fotoGroepen(
    meldingen.map((m) => ({
      id: m.id,
      spoed: m.spoed,
      ruwe_tekst: m.ruwe_tekst,
      created_at: m.created_at,
      foto_urls: m.foto_urls,
    })),
    eindstaat,
  );

  return (
    <FotoDownloadClient
      id={id}
      klantNaam={opdracht.klant_naam ?? "Onbekende klant"}
      opleverdatum={opdracht.opgeleverd_at ?? opdracht.created_at}
      groepen={groepen}
    />
  );
}
