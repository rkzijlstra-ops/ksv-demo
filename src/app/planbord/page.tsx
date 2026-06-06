import Link from "next/link";
import { db } from "@/lib/db";
import { PlanbordBord } from "@/components/PlanbordBord";
import { UserMenu } from "@/components/UserMenu";
import { vereisRol } from "@/lib/toegang";

export const dynamic = "force-dynamic";

function vandaagISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dag}`;
}

// Op zaterdag/zondag de volgende maandag als anker, zodat het bord meteen de komende werkweek toont.
function ankerVoorDatum(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const DATUM_PATROON = /^\d{4}-\d{2}-\d{2}$/;

export default async function PlanbordPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const { email, profiel } = await vereisRol(["opdrachtgever", "beheerder"]);

  const vandaag = vandaagISO();
  const ankerInit = week && DATUM_PATROON.test(week) ? week : ankerVoorDatum(vandaag);
  const dbi = await db();
  const opdrachten = await dbi.getOpdrachtenVoorDashboard();
  const monteurs = (await dbi.getMonteurs()).map((m) => ({ id: m.id, naam: m.naam }));

  return (
    <main className="mx-auto w-full max-w-[1040px] p-4 pb-24">
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">KSV / Agenda</p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Planbord</h1>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <PlanbordBord
        opdrachten={opdrachten}
        monteurs={monteurs}
        ankerInit={ankerInit}
        vandaag={vandaag}
      />

      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
      >
        ← Naar het dashboard
      </Link>
    </main>
  );
}
