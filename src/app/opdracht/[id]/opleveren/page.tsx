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

      <div className="mt-6">
        <OpleverFlow opdrachtId={id} />
      </div>
    </main>
  );
}
