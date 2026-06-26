import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";
import { TerugKnop } from "@/components/TerugKnop";
import { vereisRol } from "@/lib/toegang";
import { HANDLEIDING_STAPPEN } from "@/lib/handleiding-stappen";

export const dynamic = "force-dynamic";

export default async function HandleidingPage() {
  // Alle ingelogde rollen mogen de uitleg zien; geen gevoelige data. Zo geen redirect-gedoe
  // als een opdrachtgever per ongeluk op de menu-link tikt.
  const { email, profiel } = await vereisRol(["monteur", "beheerder", "opdrachtgever"]);
  const isMonteur = profiel.rol === "monteur";
  const terugHref = isMonteur ? "/" : "/dashboard";
  const terugLabel = isMonteur ? "Kluspool" : "Dashboard";

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
              Zo loop je een klus door, van kluspool tot versturen.
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <ol className="space-y-8">
        {HANDLEIDING_STAPPEN.map((stap, i) => {
          const bestaat = existsSync(path.join(process.cwd(), "public", "handleiding", stap.bestand));
          const laatste = i === HANDLEIDING_STAPPEN.length - 1;
          return (
            <li key={stap.bestand} className="relative border-2 border-ink bg-white">
              {/* Donkere kopbalk met oranje stapnummer: maakt het begin van elke stap meteen zichtbaar. */}
              <div className="flex items-center gap-3 bg-ink px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-accent font-mono text-lg font-extrabold leading-none text-ink">
                  {i + 1}
                </span>
                <h2 className="font-mono text-xl font-extrabold tracking-tight text-white">{stap.titel}</h2>
                <span className="ml-auto font-mono text-xs uppercase tracking-[0.18em] text-white/50">
                  {i + 1}/{HANDLEIDING_STAPPEN.length}
                </span>
              </div>

              <div className="px-5 py-4">
                {stap.intro && <p className="text-sm text-ink">{stap.intro}</p>}
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
                  {stap.punten.map((punt) => (
                    <li key={punt}>{punt}</li>
                  ))}
                </ul>
              </div>

              {bestaat ? (
                // Bewust een gewone <img>: de bestanden staan in /public en worden los gegenereerd,
                // geen next/image-optimalisatie nodig.
                // eslint-disable-next-line @next/next/no-img-element
                <div className="border-t-2 border-line bg-surface/40 p-4">
                  <img
                    src={`/handleiding/${stap.bestand}`}
                    alt={`Schermafbeelding: ${stap.titel}`}
                    className="mx-auto block w-full max-w-sm border border-line"
                  />
                </div>
              ) : (
                <div className="flex min-h-[200px] items-center justify-center border-t-2 border-line bg-surface p-5 text-center text-sm text-ink-muted">
                  Schermafbeelding nog niet gegenereerd ({stap.bestand}).
                </div>
              )}

              {/* Stippellijn-pijl naar de volgende stap, behalve onder de laatste. */}
              {!laatste && (
                <span
                  aria-hidden
                  className="absolute -bottom-8 left-1/2 flex h-8 w-px -translate-x-1/2 items-end justify-center"
                >
                  <span className="h-full w-px border-l-2 border-dashed border-ink/30" />
                </span>
              )}
            </li>
          );
        })}
      </ol>

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
