import { db } from "@/lib/db";
import { teDoenTelling } from "@/lib/te-doen";
import { DashboardLijst } from "@/components/DashboardLijst";
import { InschietZone } from "@/components/InschietZone";
import { KlusInvoer } from "@/components/KlusInvoer";
import { UserMenu } from "@/components/UserMenu";
import { PaginaNavKnop } from "@/components/PaginaNavKnop";
import { DemoAutoRefresh } from "@/components/DemoAutoRefresh";
import { DemoStartblok } from "@/components/DemoStartblok";
import { vereisRol } from "@/lib/toegang";
import { isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { email, profiel } = await vereisRol(["opdrachtgever", "beheerder"]);

  const dbi = await db();
  const opdrachten = await dbi.getOpdrachtenVoorDashboard();
  const telling = teDoenTelling(opdrachten);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-24">
      {isDemoMode() && <DemoAutoRefresh />}
      <header className="mb-4 border-2 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
              Kluslus / Dashboard
            </p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Klussen</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {opdrachten.length} {opdrachten.length === 1 ? "klus" : "klussen"}
              {telling.aandacht > 0 && ` · ${telling.aandacht} ${telling.aandacht === 1 ? "vraagt" : "vragen"} aandacht`}
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
      </header>

      {isDemoMode() && <DemoStartblok />}

      <div className="mb-4">
        <PaginaNavKnop href="/planbord" label="Naar het planbord" icon="agenda" />
      </div>

      <div className="mb-4">
        <KlusInvoer context="kantoor" />
      </div>

      <div className="mb-4">
        <InschietZone />
      </div>

      <DashboardLijst opdrachten={opdrachten} telling={telling} />

      <div className="mt-6">
        <PaginaNavKnop href="/planbord" label="Naar het planbord" icon="agenda" />
      </div>
    </main>
  );
}
