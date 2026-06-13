import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { rapportAfzenderWeergave } from "@/lib/rapport";
import { RapportWeergave, type RapportWeergaveData } from "@/components/RapportWeergave";

export const dynamic = "force-dynamic";

export default async function RapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) notFound();
  const meldingen = await dbi.getMeldingenVoorOpdracht(id);
  const oplevering = await dbi.getOpleveringVoorOpdracht(id);

  const opleveraarId = oplevering?.user_id ?? opdracht.toegewezen_aan;
  const p = opleveraarId ? await dbi.getProfiel(opleveraarId) : null;
  const afzender = rapportAfzenderWeergave(
    p ? { naam: p.naam, bedrijfsnaam: p.bedrijfsnaam, telefoon: p.telefoon, email: p.contact_email } : null,
  );

  const opleverdatum = opdracht.opgeleverd_at ?? new Date().toISOString();
  const fotos = oplevering?.eindstaat_foto_urls ?? [];
  const ondertekend = Boolean(oplevering?.handtekening_url);
  const opmerking = oplevering?.opmerking?.trim() || null;

  const chips: string[] = [];
  if (opdracht.referentienummer) chips.push(`Ref ${opdracht.referentienummer}`);
  if (opdracht.leverweek) chips.push(`Leverweek ${opdracht.leverweek}`);
  if (opdracht.keukenzaak) chips.push(opdracht.keukenzaak);

  const data: RapportWeergaveData = {
    afzenderKop: afzender.kop,
    opleverdatum,
    klantNaam: opdracht.klant_naam ?? "Onbekende klant",
    klantAdres: opdracht.klant_adres ?? null,
    chips,
    ondertekend,
    handtekeningUrl: oplevering?.handtekening_url ?? null,
    videoUrl: oplevering?.video_url ?? null,
    fotos,
    opmerking,
    meldingen: meldingen.map((m) => ({
      id: m.id,
      spoed: m.spoed,
      spoed_verzonden_at: m.spoed_verzonden_at,
      created_at: m.created_at,
      ruwe_tekst: m.ruwe_tekst,
      foto_urls: m.foto_urls,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <RapportWeergave data={data} />

      {/* vaste onderbalk: terug naar versturen */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href={`/opdracht/${id}/opleveren`}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
            Terug naar versturen
          </Link>
        </div>
      </div>
    </main>
  );
}
