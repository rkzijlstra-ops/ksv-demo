import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";
import { vereisRol } from "@/lib/toegang";
import { magKlantLeveren } from "@/lib/klant-levering";
import { OpleverFlow } from "@/components/OpleverFlow";

export const dynamic = "force-dynamic";

/**
 * Snel afsluiten = een uitgeklede oplevering: dezelfde flow als opleveren, maar zonder handtekening en
 * zonder de voorvertoon-stap, en met de "er komt nog een vervolg"-optie. Levert een verkorte PDF op.
 */
export default async function AfgerondSnelPage({ params }: { params: Promise<{ id: string }> }) {
  await vereisRol(["monteur", "beheerder"]);
  const { id } = await params;
  const dbi = await db();
  const [opdracht, userId] = await Promise.all([dbi.getMeldingById(id), getAuthenticatedUserId()]);
  if (!opdracht) notFound();
  const profiel = userId ? await dbi.getProfiel(userId) : null;
  const waarschuwKlantZicht = profiel?.waarschuw_klant_zicht ?? true;
  const opdrachtgever = opdracht.opdrachtgever_id
    ? await dbi.getOpdrachtgever(opdracht.opdrachtgever_id)
    : null;
  const magKlant = magKlantLeveren(opdracht, opdrachtgever);

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
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">
          {opdracht.klant_naam ?? "Klus afsluiten"}
        </h1>
        <span
          aria-hidden
          className={`absolute inset-x-0 bottom-0 h-1.5 ${opdracht.opdracht_status === "opgeleverd" ? "bg-success" : "bg-accent"}`}
        />
      </header>
      <div className="mt-6">
        <OpleverFlow
          opdrachtId={id}
          klantEmailVoorstel={opdracht.klant_email}
          waarschuwKlantZicht={waarschuwKlantZicht}
          magKlantLeveren={magKlant}
          verkort
        />
      </div>
    </main>
  );
}
