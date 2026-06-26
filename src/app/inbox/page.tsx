import { Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { vereisRol } from "@/lib/toegang";
import { InboxItem } from "@/components/InboxItem";
import { TerugKnop } from "@/components/TerugKnop";
import { HydratieKlaar } from "@/components/HydratieKlaar";

export const dynamic = "force-dynamic";

/**
 * Het "te verwerken"-bakje: klussen die per mail zijn binnengekomen (inbound) en nog bevestigd moeten
 * worden voor ze in de kluspool komen. Alleen de monteur ziet zijn eigen voorstellen.
 */
export default async function InboxPage() {
  const { profiel } = await vereisRol(["monteur", "beheerder"]);
  const dbi = await db();
  const voorstellen = await dbi.getInboxVoor(profiel.id);

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <HydratieKlaar />
      <div className="mb-4">
        <TerugKnop href="/" label="Kluspool" />
      </div>
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Inbound / Te verwerken</p>
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Te verwerken</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Per mail binnengekomen. Bevestig wat klopt, dan komt het in je kluspool.
        </p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      {voorstellen.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 border border-line bg-surface p-8 text-center">
          <Inbox size={40} className="text-ink-muted" aria-hidden="true" />
          <p className="font-semibold text-ink">Niets te verwerken</p>
          <p className="text-sm text-ink-muted">
            Mail die je naar je klus-adres stuurt, verschijnt hier als voorstel.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {voorstellen.map((v) => (
            <InboxItem
              key={v.id}
              id={v.id}
              titel={v.klant_naam?.trim() || "Naamloos voorstel"}
              referentie={v.referentienummer}
              adres={v.klant_adres}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
