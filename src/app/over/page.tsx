import Link from "next/link";
import { ChevronLeft, Camera, Video, PenLine, WifiOff, Phone } from "lucide-react";
import { APP_VERSIE } from "@/lib/versie";

export const dynamic = "force-static";

export default function OverPage() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center gap-1 text-base font-semibold text-primary hover:underline"
      >
        <ChevronLeft size={22} aria-hidden="true" />
        Werkpool
      </Link>

      <header className="relative mt-2 mb-4 bg-primary px-5 py-5 text-white">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/70">Over de app</p>
        <h1 className="mt-1 font-mono text-2xl font-extrabold tracking-tight">Hoe werkt het?</h1>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <div className="flex flex-col gap-6 text-base text-ink">
        <section>
          <h2 className="mb-1 font-bold">Wat doet de app</h2>
          <p className="text-ink-muted">
            Je opdrachten staan in de werkpool. Je voegt opdrachten toe via een PDF of foto, of
            handmatig. Bij elke opdracht kun je meldingen maken en de keuken opleveren met bewijs.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">Een opdracht opleveren</h2>
          <ul className="flex flex-col gap-2 text-ink-muted">
            <li className="flex items-start gap-2">
              <Camera size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
              Maak foto&apos;s van de eindstaat: keuken, blad en apparatuur.
            </li>
            <li className="flex items-start gap-2">
              <Video size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
              Een korte video mag erbij (houd hem kort).
            </li>
            <li className="flex items-start gap-2">
              <PenLine size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
              Laat de klant eventueel tekenen. Niet verplicht, overslaan kan.
            </li>
          </ul>
          <p className="mt-2 text-ink-muted">
            Een opmerking die geen melding is (bijvoorbeeld: klant belt nog voor smetplinten) zet je
            in het opmerkingenveld. Daarna versturen: het rapport gaat naar de keukenzaak.
          </p>
        </section>

        <section>
          <h2 className="mb-1 flex items-center gap-2 font-bold">
            <WifiOff size={18} aria-hidden="true" /> Offline werken
          </h2>
          <p className="text-ink-muted">
            Opdrachten lezen en meldingen met foto maken kan zonder netwerk; die worden verstuurd
            zodra je weer bereik hebt. Inspreken, opleveren en nieuwe opdrachten inlezen hebben wel
            netwerk nodig.
          </p>
        </section>

        <section>
          <h2 className="mb-1 flex items-center gap-2 font-bold">
            <Phone size={18} aria-hidden="true" /> Vragen?
          </h2>
          <p className="text-ink-muted">
            Bel of mail Reinier (BKM Keukenmontage): 06-31665814, bkmkeukenmontage@gmail.com.
          </p>
        </section>

        <p className="text-xs text-ink-muted">Versie {APP_VERSIE}</p>
      </div>
    </main>
  );
}
