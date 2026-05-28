import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MeldingForm } from "@/components/MeldingForm";

export const dynamic = "force-dynamic";

export default async function MeldingToevoegenPagina({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opdracht = await db().getMeldingById(id);
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

      <h1 className="mt-2 text-2xl font-bold text-ink">Melding toevoegen</h1>
      <p className="mb-5 mt-1 text-sm text-ink-muted">
        Voor {opdracht.klant_naam ?? "deze opdracht"}
        {opdracht.referentienummer ? ` (ref ${opdracht.referentienummer})` : ""}
      </p>

      <MeldingForm opdrachtId={id} />
    </main>
  );
}
