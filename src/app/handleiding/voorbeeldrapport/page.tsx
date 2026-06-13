import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { vereisRol } from "@/lib/toegang";
import { RapportWeergave } from "@/components/RapportWeergave";
import { voorbeeldRapportData } from "@/lib/handleiding-voorbeeldrapport";

export const dynamic = "force-dynamic";

export default async function VoorbeeldRapportPage() {
  // Alle ingelogde rollen mogen de demo zien, net als de handleiding zelf.
  await vereisRol(["monteur", "beheerder", "opdrachtgever"]);

  // Bepaal welke demo-foto's al op schijf staan zodat het rapport werkt zonder JPGs.
  const voorbeeldDir = path.join(process.cwd(), "public", "handleiding", "voorbeeld");

  const kandidatenFotos = ["foto-1.jpg", "foto-3.jpg", "foto-4.jpg", "foto-5.jpg", "foto-6.jpg"];
  const fotos = kandidatenFotos
    .filter((naam) => existsSync(path.join(voorbeeldDir, naam)))
    .map((naam) => `/handleiding/voorbeeld/${naam}`);

  const kandidatenMelding = ["melding-1.jpg", "melding-2.jpg"];
  const meldingFotos = kandidatenMelding
    .filter((naam) => existsSync(path.join(voorbeeldDir, naam)))
    .map((naam) => `/handleiding/voorbeeld/${naam}`);

  const opleverdatum = new Date().toISOString();
  const data = voorbeeldRapportData(opleverdatum, fotos, meldingFotos);

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <RapportWeergave data={data} />

      {/* vaste onderbalk: terug naar de handleiding */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/handleiding"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
            Terug naar de handleiding
          </Link>
        </div>
      </div>
    </main>
  );
}
