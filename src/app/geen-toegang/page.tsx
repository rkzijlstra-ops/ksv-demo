import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default function GeenToegangPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-4">
      <div className="relative border-2 border-line bg-white p-6 text-center">
        <ShieldAlert size={40} className="mx-auto text-ink-muted" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-extrabold text-ink">Account nog niet ingesteld</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Je bent ingelogd, maar je account heeft nog geen rol. Neem contact op met de beheerder
          van Kluslus om toegang te krijgen.
        </p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </div>
    </main>
  );
}
