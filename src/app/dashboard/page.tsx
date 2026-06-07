import { db } from "@/lib/db";
import { teDoenTelling } from "@/lib/te-doen";
import { DashboardLijst } from "@/components/DashboardLijst";
import { InschietZone } from "@/components/InschietZone";
import { UserMenu } from "@/components/UserMenu";
import { PaginaNavKnop } from "@/components/PaginaNavKnop";
import { vereisRol } from "@/lib/toegang";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { email, profiel } = await vereisRol(["opdrachtgever", "beheerder"]);

  const dbi = await db();
  const opdrachten = await dbi.getOpdrachtenVoorDashboard();
  const telling = teDoenTelling(opdrachten);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-24">
      <header className="mb-4 border-2 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
              KSV / Dashboard
            </p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Opdrachten</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {opdrachten.length} {opdrachten.length === 1 ? "opdracht" : "opdrachten"}
              {telling.aandacht > 0 && ` · ${telling.aandacht} ${telling.aandacht === 1 ? "vraagt" : "vragen"} aandacht`}
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
      </header>

      <div className="mb-4">
        <PaginaNavKnop href="/planbord" label="Naar het planbord" icon="agenda" />
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
