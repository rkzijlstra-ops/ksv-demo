import { notFound } from "next/navigation";
import { db, dbAdmin } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";
import { magKlantLeveren } from "@/lib/klant-levering";
import { opleverToegang } from "@/lib/oplever-toegang";
import { OpleverFlow } from "@/components/OpleverFlow";
import { OpleverReadOnly } from "@/components/OpleverReadOnly";
import { OpleverTerugLink } from "@/components/OpleverTerugLink";

export const dynamic = "force-dynamic";

export default async function OpleverenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dbi = await db();
  // Onafhankelijke gegevens tegelijk ophalen i.p.v. in een rij (sneller).
  // Verzendingen met service-rechten (RLS blokkeert dit lezen anders soms voor de monteur).
  const [opdracht, meldingen, userId, verzendingen] = await Promise.all([
    dbi.getMeldingById(id),
    dbi.getMeldingenVoorOpdracht(id),
    getAuthenticatedUserId(),
    dbAdmin().getRapportVerzendingen(id),
  ]);
  if (!opdracht) notFound();
  // Al verstuurd rapport opnieuw openen: eigen klus mag (mét waarschuwing), opdrachtgever-klus = read-only.
  const toegang = opleverToegang({
    opdrachtgeverId: opdracht.opdrachtgever_id,
    opgeleverd: opdracht.opdracht_status === "opgeleverd",
    verzendingen,
  });
  const rapportUrl =
    [...verzendingen]
      .filter((v) => v.rapport_url)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.rapport_url ?? null;
  // Privacy-voorkeur van de monteur: waarschuwen bij versturen naar de klant (standaard aan).
  const profiel = userId ? await dbi.getProfiel(userId) : null;
  const waarschuwKlantZicht = profiel?.waarschuw_klant_zicht ?? true;
  // Mag deze klus ook aan de klant opgeleverd worden? Eigen klus altijd; opdrachtgever-klus volgt
  // de instelling van die opdrachtgever (standaard aan, per opdrachtgever uit te zetten in het dashboard).
  const opdrachtgever = opdracht.opdrachtgever_id
    ? await dbi.getOpdrachtgever(opdracht.opdrachtgever_id)
    : null;
  const magKlant = magKlantLeveren(opdracht, opdrachtgever);

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <OpleverTerugLink href={`/opdracht/${id}/afronden`} />
      </div>
      <header className="relative border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          {opdracht.keukenzaak ? `${opdracht.keukenzaak} / ` : ""}Oplevering / Rapportage
        </p>
        <h1 className="mt-1 font-mono text-2xl font-extrabold tracking-tight">
          {opdracht.klant_naam ?? "Onbekende klant"}
        </h1>
        <span
          aria-hidden
          className={`absolute inset-x-0 bottom-0 h-1.5 ${opdracht.opdracht_status === "opgeleverd" ? "bg-success" : "bg-accent"}`}
        />
      </header>

      {!toegang.readOnly && meldingen.length > 0 && (
        <div className="mt-6 rounded-none border border-accent/40 bg-accent/10 p-3">
          <p className="text-sm font-semibold text-ink">
            Meldingen in dit rapport ({meldingen.length})
          </p>
          <ul className="mt-1 flex flex-col gap-1 text-sm text-ink-muted">
            {meldingen.map((m) => (
              <li key={m.id} className="truncate">
                {m.spoed ? "Spoed: " : "• "}
                {m.ruwe_tekst?.trim() || "(foto, geen tekst)"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        {toegang.readOnly ? (
          <OpleverReadOnly
            meldingen={meldingen.map((m) => ({
              id: m.id,
              spoed: m.spoed,
              ruwe_tekst: m.ruwe_tekst,
              foto_urls: m.foto_urls,
              video_url: m.video_url,
              created_at: m.created_at,
            }))}
            rapportUrl={rapportUrl}
            verstuurdOp={toegang.verstuurdOp}
          />
        ) : (
          <OpleverFlow
            opdrachtId={id}
            klantEmailVoorstel={opdracht.klant_email}
            waarschuwKlantZicht={waarschuwKlantZicht}
            magKlantLeveren={magKlant}
            waarschuwBestaand={toegang.waarschuwBestaand}
          />
        )}
      </div>
    </main>
  );
}
