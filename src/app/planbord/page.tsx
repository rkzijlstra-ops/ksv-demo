import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import {
  maandagVan,
  weekDagen,
  weeknummer,
  verschuifDagen,
  monteurRijen,
} from "@/lib/planbord";
import { formatDatumKort } from "@/lib/datum";
import { PlanbordBord } from "@/components/PlanbordBord";
import { VerstuurKnop } from "@/components/VerstuurKnop";
import { UserMenu } from "@/components/UserMenu";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function vandaagISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dag}`;
}

const DATUM_PATROON = /^\d{4}-\d{2}-\d{2}$/;

export default async function PlanbordPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const anker = week && DATUM_PATROON.test(week) ? week : vandaagISO();
  const maandag = maandagVan(anker);
  const dagen = weekDagen(maandag);
  const weeknr = weeknummer(maandag);

  const opdrachten = await (await db()).getOpdrachtenVoorDashboard();
  const monteurs = monteurRijen(opdrachten);
  const teVersturen = opdrachten
    .filter((o) => o.dashboard_status === "concept_gepland" || o.gewijzigd_te_versturen)
    .map((o) => o.id);

  const vorige = verschuifDagen(maandag, -7);
  const volgende = verschuifDagen(maandag, 7);
  const vandaagMaandag = maandagVan(vandaagISO());

  const pill =
    "inline-flex items-center gap-1.5 border-[1.5px] border-primary bg-white px-3 py-2 text-[13px] font-bold uppercase tracking-[0.03em]";

  return (
    <main className="mx-auto w-full max-w-[1040px] p-4 pb-24">
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">KSV / Agenda</p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Planbord</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Week {weeknr} · {formatDatumKort(dagen[0])} – {formatDatumKort(dagen[4])} ·{" "}
              {monteurs.length} {monteurs.length === 1 ? "monteur" : "monteurs"}
            </p>
          </div>
          {user?.email && <UserMenu email={user.email} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/planbord?week=${vorige}`} className={`${pill} border-line text-ink-muted`}>
          <ChevronLeft size={16} aria-hidden="true" /> Vorige
        </Link>
        <Link href={`/planbord?week=${vandaagMaandag}`} className={pill}>
          Vandaag
        </Link>
        <Link href={`/planbord?week=${volgende}`} className={`${pill} border-line text-ink-muted`}>
          Volgende <ChevronRight size={16} aria-hidden="true" />
        </Link>
        <span className="flex-1" />
        <VerstuurKnop ids={teVersturen} />
      </div>

      <PlanbordBord opdrachten={opdrachten} weekdagen={dagen} standaardDatum={dagen[0]} />

      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
      >
        ← Naar het dashboard
      </Link>
    </main>
  );
}
