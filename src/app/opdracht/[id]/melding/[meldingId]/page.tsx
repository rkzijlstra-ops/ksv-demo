import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MeldingForm } from "@/components/MeldingForm";

export const dynamic = "force-dynamic";

export default async function MeldingBewerkenPagina({
  params,
}: {
  params: Promise<{ id: string; meldingId: string }>;
}) {
  const { id, meldingId } = await params;
  const melding = await db().getMeldingById(meldingId);
  if (!melding) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <MeldingForm
        opdrachtId={id}
        terugHref={`/opdracht/${id}`}
        bestaand={{
          id: melding.id,
          spoed: melding.spoed,
          ruwe_tekst: melding.ruwe_tekst,
          foto_urls: melding.foto_urls,
        }}
        kop={
          <div>
            <h1 className="mt-2 text-2xl font-bold text-ink">Melding bewerken</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Huidige versie: v{melding.versie}. Bijwerken maakt er v{melding.versie + 1} van.
            </p>
          </div>
        }
      />
    </main>
  );
}
