import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { vereisRol } from "@/lib/toegang";
import { AfgerondMeldenScherm } from "@/components/AfgerondMeldenScherm";

export const dynamic = "force-dynamic";

export default async function AfgerondSnelPage({ params }: { params: Promise<{ id: string }> }) {
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
          href={`/opdracht/${id}/afronden`}
          className="inline-flex min-h-[44px] items-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface"
        >
          <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
          Terug
        </Link>
      </div>
      <header className="relative border-2 border-b-0 border-line bg-white px-5 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Snel afsluiten</p>
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Klus afsluiten</h1>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>
      <AfgerondMeldenScherm opdrachtId={id} klantNaam={klantNaam} />
    </main>
  );
}
