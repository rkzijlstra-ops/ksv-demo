import { notFound } from "next/navigation";
import { isTestLoginActief } from "@/lib/demo";

/**
 * Test-only inlogscherm voor de preview/test-omgeving. Twee knoppen die als een vast test-account op de
 * TEST-DB inloggen, zonder Google/magic-link. Bestaat alleen buiten productie; op de prod- en demo-deploy
 * geeft de pagina 404. De knoppen zijn gewone links (geen prefetch) naar /api/test-login.
 */
export default function TestLoginPage() {
  if (!isTestLoginActief()) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-4">
      <header className="relative mb-6 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Kluslus / Test</p>
        <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Test-login</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Alleen in de test-/preview-omgeving. Logt in op de test-database, niet op productie.
        </p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <a
        href="/api/test-login?rol=kantoor"
        className="relative mb-3 flex min-h-[56px] w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-extrabold uppercase tracking-[0.06em] text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
      >
        Inloggen als kantoor
      </a>
      <a
        href="/api/test-login?rol=monteur"
        className="relative flex min-h-[56px] w-full items-center justify-center gap-2 border-2 border-ink bg-white px-4 py-3 text-base font-extrabold uppercase tracking-[0.05em] text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
      >
        Inloggen als monteur
      </a>
    </main>
  );
}
