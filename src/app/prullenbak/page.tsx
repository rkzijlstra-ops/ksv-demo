import { Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { PrullenbakActies } from "@/components/PrullenbakActies";
import { TerugKnop } from "@/components/TerugKnop";

export const dynamic = "force-dynamic";

export default async function PrullenbakPage() {
  const dbi = await db();
  const verwijderd = await dbi.getVerwijderdeOpdrachten();

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <TerugKnop href="/" label="Werkpool" />

      <header className="relative mt-2 mb-4 bg-primary px-5 py-5 text-white">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/70">Prullenbak</p>
        <h1 className="mt-1 font-mono text-2xl font-extrabold tracking-tight">
          Verwijderde opdrachten
        </h1>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      {verwijderd.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-none border border-line bg-surface p-8 text-center">
          <Trash2 size={40} className="text-ink-muted" aria-hidden="true" />
          <p className="font-semibold text-ink">Prullenbak is leeg</p>
          <p className="text-sm text-ink-muted">
            Verwijderde opdrachten komen hier terecht en kun je herstellen.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {verwijderd.map((m) => (
            <li key={m.id} className="rounded-none border border-line bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-bold text-ink">{m.klant_naam ?? "Onbekende klant"}</span>
                {m.referentienummer && (
                  <span className="font-mono text-xs text-ink-muted">ref {m.referentienummer}</span>
                )}
              </div>
              {m.klant_adres && <p className="mt-1 text-sm text-ink-muted">{m.klant_adres}</p>}
              <p className="mt-1 text-xs text-ink-muted">
                Verwijderd: {m.verwijderd_at ? formatDatumKort(m.verwijderd_at) : "onbekend"}
              </p>
              <div className="mt-3">
                <PrullenbakActies opdrachtId={m.id} klantNaam={m.klant_naam ?? "deze opdracht"} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
