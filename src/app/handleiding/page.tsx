import { existsSync } from "node:fs";
import path from "node:path";
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
  const terugLabel = isMonteur ? "Werkpool" : "Dashboard";

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
              Zo loop je een klus door, van werkpool tot versturen.
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <ol className="space-y-4">
        {HANDLEIDING_STAPPEN.map((stap, i) => {
          const bestaat = existsSync(path.join(process.cwd(), "public", "handleiding", stap.bestand));
          return (
            <li key={stap.bestand} className="border-2 border-line bg-white">
              <div className="border-b-2 border-line px-5 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">Stap {i + 1}</p>
                <h2 className="mt-1 font-mono text-xl font-extrabold tracking-tight text-ink">{stap.titel}</h2>
                <p className="mt-2 text-sm text-ink">{stap.uitleg}</p>
              </div>
              {bestaat ? (
                // Bewust een gewone <img>: de bestanden staan in /public en worden los gegenereerd,
                // geen next/image-optimalisatie nodig.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/handleiding/${stap.bestand}`}
                  alt={`Schermafbeelding: ${stap.titel}`}
                  className="mx-auto block w-full max-w-sm"
                />
              ) : (
                <div className="flex min-h-[200px] items-center justify-center bg-surface p-5 text-center text-sm text-ink-muted">
                  Schermafbeelding nog niet gegenereerd ({stap.bestand}).
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
