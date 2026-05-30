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
      <MeldingForm
        opdrachtId={id}
        terugHref={`/opdracht/${id}`}
        kop={
          <div>
            <h1 className="mt-2 text-2xl font-bold text-ink">Melding toevoegen</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Voor {opdracht.klant_naam ?? "deze opdracht"}
              {opdracht.referentienummer ? ` (ref ${opdracht.referentienummer})` : ""}
            </p>
          </div>
        }
      />
    </main>
  );
}
