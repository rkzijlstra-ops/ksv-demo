import { redirect } from "next/navigation";
import { WelkomOpdrachtgeverForm } from "@/components/WelkomOpdrachtgeverForm";
import { vereisRol } from "@/lib/toegang";

export const dynamic = "force-dynamic";

/**
 * Eenmalig welkomscherm voor een opdrachtgever. Slaat de onboarding-gate over (skipOnboarding) om een
 * redirect-lus te voorkomen. Heeft hij al bevestigd, dan hoeft dit niet en gaat hij naar het dashboard.
 */
export default async function WelkomOpdrachtgeverPage() {
  const { profiel } = await vereisRol(["opdrachtgever"], { skipOnboarding: true });
  if (profiel.welkom_bevestigd) redirect("/dashboard");

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Welkom bij Kluslus</p>
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Klopt je naam?</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Je bent toegevoegd aan de planning-app. Controleer even je naam (en eventueel je telefoon), dan
          ben je klaar om te starten.
        </p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <section className="border-2 border-t-0 border-line bg-white px-5 py-5">
        <WelkomOpdrachtgeverForm naam={profiel.naam} telefoon={profiel.telefoon} />
      </section>
    </main>
  );
}
