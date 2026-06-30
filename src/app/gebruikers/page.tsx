import { db } from "@/lib/db";
import { UitnodigForm } from "@/components/UitnodigForm";
import { NieuweOpdrachtgeverForm } from "@/components/NieuweOpdrachtgeverForm";
import { GebruikerRij } from "@/components/GebruikerRij";
import { OpdrachtgeverInstelling } from "@/components/OpdrachtgeverInstelling";
import { UserMenu } from "@/components/UserMenu";
import { TerugKnop } from "@/components/TerugKnop";
import { vereisRol } from "@/lib/toegang";

export const dynamic = "force-dynamic";

export default async function GebruikersPage() {
  const { email, profiel } = await vereisRol(["beheerder"]);
  const dbi = await db();
  const profielen = await dbi.getProfielen();
  const opdrachtgevers = await dbi.getOpdrachtgevers();

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <TerugKnop href="/dashboard" label="Dashboard" />
      </div>
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Beheer / Gebruikers</p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Gebruikers</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Nodig monteurs en opdrachtgevers uit. Ze krijgen een inloglink, geen wachtwoord.
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <UitnodigForm opdrachtgevers={opdrachtgevers.map((o) => ({ id: o.id, naam: o.naam }))} />

      <section className="mt-6">
        <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
          Accounts ({profielen.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {profielen.map((p) => (
            <GebruikerRij
              key={p.id}
              id={p.id}
              naam={p.naam}
              rol={p.rol}
              isZelf={p.id === profiel.id}
            />
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
          Opdrachtgevers ({opdrachtgevers.length})
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          De keukenzaken namens wie je werkt. Maak er een aan, kies hem bij het uitnodigen en het
          inschieten. Per zaak kun je hieronder klant-levering aan- of uitzetten.
        </p>
        <div className="mb-3">
          <NieuweOpdrachtgeverForm />
        </div>
        <ul className="flex flex-col gap-2">
          {opdrachtgevers.map((o) => (
            <OpdrachtgeverInstelling key={o.id} id={o.id} naam={o.naam} aan={o.klant_levering_toegestaan} />
          ))}
        </ul>
      </section>
    </main>
  );
}
