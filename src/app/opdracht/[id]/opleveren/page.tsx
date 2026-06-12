import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";
import { OpleverFlow } from "@/components/OpleverFlow";

export const dynamic = "force-dynamic";

export default async function OpleverenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dbi = await db();
  // Onafhankelijke gegevens tegelijk ophalen i.p.v. in een rij (sneller).
  const [opdracht, meldingen, userId] = await Promise.all([
    dbi.getMeldingById(id),
    dbi.getMeldingenVoorOpdracht(id),
    getAuthenticatedUserId(),
  ]);
  if (!opdracht) notFound();
  // Privacy-voorkeur van de monteur: waarschuwen bij versturen naar de klant (standaard aan).
  const profiel = userId ? await dbi.getProfiel(userId) : null;
  const waarschuwKlantZicht = profiel?.waarschuw_klant_zicht ?? true;

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-40">
      <header className="relative border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          {opdracht.keukenzaak ? `${opdracht.keukenzaak} / ` : ""}Oplevering / Rapportage
        </p>
        <h1 className="mt-1 font-mono text-2xl font-extrabold tracking-tight">
          {opdracht.klant_naam ?? "Onbekende klant"}
        </h1>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      {meldingen.length > 0 && (
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
        <OpleverFlow
          opdrachtId={id}
          klantEmailVoorstel={opdracht.klant_email}
          waarschuwKlantZicht={waarschuwKlantZicht}
        />
      </div>
    </main>
  );
}
