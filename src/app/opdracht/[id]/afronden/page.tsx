import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { vereisRol } from "@/lib/toegang";
import { NietDoorgegaanKnop } from "@/components/NietDoorgegaanKnop";

export const dynamic = "force-dynamic";

export default async function AfrondenPage({ params }: { params: Promise<{ id: string }> }) {
  await vereisRol(["monteur", "beheerder"]);
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) notFound();
  const klantNaam = opdracht.klant_naam ?? "deze klus";

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <Link
          href={`/opdracht/${id}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface"
        >
          <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
          Terug
        </Link>
      </div>
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Klus voltooien</p>
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Hoe voltooi je deze klus?</h1>
        <p className="mt-1 text-sm text-ink-muted">Kies wat bij deze klus past.</p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <div className="flex flex-col gap-3">
        <Link
          href={`/opdracht/${id}/afronden/snel`}
          className="flex items-center justify-between border-2 border-line bg-white p-5 hover:bg-surface"
        >
          <span>
            <span className="block font-mono text-xl font-extrabold text-ink">Voltooid, snel</span>
            <span className="block text-base text-ink-muted">Voor service of een kleine klus. Optioneel foto, video of een notitie. De zaak ziet dat het klaar is.</span>
          </span>
          <ChevronRight size={20} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
        </Link>

        <Link
          href={`/opdracht/${id}/opleveren`}
          className="flex items-center justify-between border-2 border-line bg-white p-5 hover:bg-surface"
        >
          <span>
            <span className="block font-mono text-xl font-extrabold text-ink">Voltooid + rapport</span>
            <span className="block text-base text-ink-muted">Volledige oplevering met foto&apos;s en handtekening.</span>
          </span>
          <ChevronRight size={20} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
        </Link>

        <NietDoorgegaanKnop opdrachtId={id} klantNaam={klantNaam} />
      </div>
    </main>
  );
}
