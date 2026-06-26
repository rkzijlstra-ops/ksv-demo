import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";
import { profielVolledig } from "@/lib/profiel";
import { vereisRol } from "@/lib/toegang";

export const dynamic = "force-dynamic";

/**
 * Eerste-gebruik-onboarding voor een monteur: afzendergegevens invullen voor hij de app gebruikt.
 * Slaat de onboarding-gate over (skipOnboarding) om een redirect-lus te voorkomen. Is het profiel al
 * volledig, dan hoeft dit scherm niet en gaat de monteur naar de kluspool.
 */
export default async function WelkomPage() {
  const { profiel } = await vereisRol(["monteur"], { skipOnboarding: true });
  if (profielVolledig(profiel)) redirect("/");

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Welkom bij Kluslus</p>
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Even je gegevens</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Vul je afzendergegevens in. Die komen op je opleverrapporten te staan en zorgen dat antwoorden
          van de opdrachtgever bij jou terechtkomen.
        </p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <section className="border-2 border-t-0 border-line bg-white px-5 py-5">
        <OnboardingForm
          naam={profiel.naam}
          bedrijfsnaam={profiel.bedrijfsnaam}
          telefoon={profiel.telefoon}
          contactEmail={profiel.contact_email}
        />
      </section>
    </main>
  );
}
