import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { OpleverFlow } from "@/components/OpleverFlow";

export const dynamic = "force-dynamic";

export default async function OpleverenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) notFound();
  const meldingen = await dbi.getMeldingenVoorOpdracht(id);

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <Link
        href={`/opdracht/${id}`}
        className="inline-flex min-h-[44px] items-center gap-1 text-base font-semibold text-primary hover:underline"
      >
        <ChevronLeft size={22} aria-hidden="true" />
        Terug naar opdracht
      </Link>

      <header className="relative mt-2 bg-primary px-5 py-5 text-white">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/70">Oplevering</p>
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
        <OpleverFlow opdrachtId={id} />
      </div>
    </main>
  );
}
