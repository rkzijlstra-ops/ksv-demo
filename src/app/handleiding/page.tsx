import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import { TerugKnop } from "@/components/TerugKnop";
import { vereisRol } from "@/lib/toegang";
import { HANDLEIDING_GROEPEN } from "@/lib/handleiding-stappen";
import { HandleidingWeergave, type GroepView } from "@/components/HandleidingWeergave";

export const dynamic = "force-dynamic";

export default async function HandleidingPage() {
  // Alle ingelogde rollen mogen de uitleg zien; geen gevoelige data, geen redirect-gedoe.
  const { email, profiel } = await vereisRol(["monteur", "beheerder", "opdrachtgever"]);
  const isMonteur = profiel.rol === "monteur";
  const terugHref = isMonteur ? "/" : "/dashboard";
  const terugLabel = isMonteur ? "Kluspool" : "Dashboard";

  // Server-side per onderwerp checken of het screenshot-bestand bestaat; de client toont
  // anders een nette placeholder. Zo breekt een ontbrekend plaatje de pagina nooit.
  const groepen: GroepView[] = HANDLEIDING_GROEPEN.map((groep) => ({
    titel: groep.titel,
    onderwerpen: groep.onderwerpen.map((o) => ({
      id: o.id,
      titel: o.titel,
      intro: o.intro,
      punten: o.punten,
      bestand: o.bestand,
      nieuw: o.nieuw,
      bestaat: existsSync(path.join(process.cwd(), "public", "handleiding", o.bestand)),
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <TerugKnop href={terugHref} label={terugLabel} />
      </div>
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Hulp / Handleiding</p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Handleiding</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Zo loop je een klus door, van kluspool tot versturen. Tik een onderwerp aan om het te openen.
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <HandleidingWeergave groepen={groepen} />

      <div className="mt-6">
        <Link
          href="/handleiding/voorbeeldrapport"
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 border-2 border-primary px-4 text-sm font-extrabold uppercase tracking-[0.05em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
        >
          Bekijk een voorbeeldrapport
        </Link>
      </div>
    </main>
  );
}
