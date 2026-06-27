import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Zap, ClipboardCheck, Lock } from "lucide-react";
import { db, dbAdmin } from "@/lib/db";
import { vereisRol } from "@/lib/toegang";
import { opleverToegang } from "@/lib/oplever-toegang";
import { formatDatumKort } from "@/lib/datum";
import { NietDoorgegaanKnop } from "@/components/NietDoorgegaanKnop";
import { ActieKaart } from "@/components/ActieKaart";
import { KlusActiviteit } from "@/components/KlusActiviteit";

export const dynamic = "force-dynamic";

export default async function AfrondenPage({ params }: { params: Promise<{ id: string }> }) {
  await vereisRol(["monteur", "beheerder"]);
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) notFound();
  const klantNaam = opdracht.klant_naam ?? "deze klus";

  // Activiteit (logboek + verzendingen) met service-rechten lezen, zodat de monteur ook
  // de bevestiging van zijn eigen klus ziet (RLS blokkeert dit lezen anders soms).
  const adm = dbAdmin();
  const [gebeurtenissen, verzendingen] = await Promise.all([
    adm.getGebeurtenissenVoor(id),
    adm.getRapportVerzendingen(id),
  ]);
  // Al verstuurd? Opdrachtgever-klus = read-only (alleen rapport bekijken); eigen klus blijft te bewerken
  // (de waarschuwing zit in de oplever-flow zelf).
  const toegang = opleverToegang({
    opdrachtgeverId: opdracht.opdrachtgever_id,
    opgeleverd: opdracht.opdracht_status === "opgeleverd",
    verzendingen,
  });

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <Link
          href={`/opdracht/${id}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface"
        >
          <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
          Terug
        </Link>
      </div>
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Klus afsluiten</p>
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Op welke manier sluit je af?</h1>
        <p className="mt-1 text-sm text-ink-muted">Kies wat bij deze klus past.</p>
        <span
          aria-hidden
          className={`absolute inset-x-0 bottom-0 h-1.5 ${opdracht.opdracht_status === "opgeleverd" ? "bg-success" : "bg-accent"}`}
        />
      </header>

      {toegang.readOnly ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-2 border-line bg-surface px-3 py-2.5 text-sm font-bold text-ink">
            <Lock size={16} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
            {toegang.verstuurdOp
              ? `Al verstuurd op ${formatDatumKort(toegang.verstuurdOp)} aan de opdrachtgever, alleen-lezen.`
              : "Al verstuurd aan de opdrachtgever, alleen-lezen."}
          </div>
          <ActieKaart
            href={`/opdracht/${id}/opleveren`}
            accent="neutraal"
            icoon={<ClipboardCheck size={22} strokeWidth={2.5} aria-hidden="true" />}
            titel="Rapport bekijken"
            sub="Bekijk het verstuurde rapport en wat er is gedaan."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ActieKaart
            href={`/opdracht/${id}/afronden/snel`}
            accent="neutraal"
            icoon={<Zap size={22} strokeWidth={2.5} aria-hidden="true" />}
            titel="Snel afsluiten"
            sub="Voor service of een kleine klus. Een verkort rapport naar de opdrachtgever, zonder handtekening."
          />

          <ActieKaart
            href={`/opdracht/${id}/opleveren`}
            accent="actie"
            icoon={<ClipboardCheck size={22} strokeWidth={2.5} aria-hidden="true" />}
            titel="Afsluiten + rapport"
            sub="Volledige oplevering, optioneel met foto, video en handtekening."
          />

          <NietDoorgegaanKnop opdrachtId={id} klantNaam={klantNaam} />
        </div>
      )}

      <KlusActiviteit gebeurtenissen={gebeurtenissen} verzendingen={verzendingen} />
    </main>
  );
}
