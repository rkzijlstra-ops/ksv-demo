import Link from "next/link";
import { Inbox, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { groepeerMeldingen } from "@/lib/werkbak";
import { OpdrachtCard } from "@/components/OpdrachtCard";
import { HistorySection } from "@/components/HistorySection";
import { PdfUpload } from "@/components/PdfUpload";

export const dynamic = "force-dynamic";

export default async function WerkbakPage() {
  const meldingen = await db().getMeldingen();
  const { actief, history } = groepeerMeldingen(meldingen);

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <header className="py-4">
        <h1 className="text-2xl font-bold text-ink">Opdrachten</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {actief.length} {actief.length === 1 ? "actieve klus" : "actieve klussen"}
        </p>
      </header>

      <Link
        href="/melding/nieuw"
        className="mb-3 flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-primary"
      >
        <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
        Nieuwe melding
      </Link>

      <div className="mb-4">
        <PdfUpload />
      </div>

      {actief.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-8 text-center">
          <Inbox size={40} className="text-ink-muted" aria-hidden="true" />
          <p className="font-semibold text-ink">Geen actieve klussen</p>
          <p className="text-sm text-ink-muted">
            Nieuwe opdrachten en meldingen verschijnen hier.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {actief.map((m) => (
            <OpdrachtCard key={m.id} melding={m} />
          ))}
        </div>
      )}

      <HistorySection meldingen={history} />
    </main>
  );
}
