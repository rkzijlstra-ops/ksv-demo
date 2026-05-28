import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
      <Link
        href={`/opdracht/${id}`}
        className="inline-flex min-h-[44px] items-center gap-1 text-base font-semibold text-primary hover:underline"
      >
        <ChevronLeft size={22} aria-hidden="true" />
        Terug naar opdracht
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-ink">Melding bewerken</h1>
      <p className="mb-5 mt-1 text-sm text-ink-muted">
        Huidige versie: v{melding.versie}. Opnieuw verzenden maakt er v{melding.versie + 1} van.
      </p>

      <MeldingForm
        opdrachtId={id}
        bestaand={{
          id: melding.id,
          urgentie: melding.urgentie,
          ruwe_tekst: melding.ruwe_tekst,
          foto_urls: melding.foto_urls,
        }}
      />
    </main>
  );
}
