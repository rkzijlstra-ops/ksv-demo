import { Camera, Video, PenLine, WifiOff, Phone } from "lucide-react";
import { APP_VERSIE } from "@/lib/versie";
import { TerugKnop } from "@/components/TerugKnop";

export const dynamic = "force-static";

export default function OverPage() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <TerugKnop href="/" label="Werkpool" />

      <header className="relative mt-2 mb-4 bg-primary px-5 py-5 text-white">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/70">Over de app</p>
        <h1 className="mt-1 font-mono text-2xl font-extrabold tracking-tight">Hoe werkt het?</h1>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <div className="flex flex-col gap-6 text-base text-ink">
        <section>
          <h2 className="mb-1 font-bold">Wat doet de app</h2>
          <p className="text-ink-muted">
            Je gebruikt de app voor twee soorten klussen: het <b>monteren van een nieuwe keuken</b>
            {" "}en <b>servicewerk en nazorg</b> (reparaties, manco&apos;s, afmontage). Je opdrachten
            staan in de werkpool. Je voegt ze toe via een PDF of foto, of handmatig. Bij elke
            opdracht kun je meldingen maken en de klus opleveren met bewijs. Dezelfde oplever-flow
            werkt voor allebei.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">Een klus opleveren (montage én service)</h2>
          <ul className="flex flex-col gap-2 text-ink-muted">
            <li className="flex items-start gap-2">
              <Camera size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
              Maak foto&apos;s van het eindresultaat. Bij een montage: de keuken, het blad en de
              apparatuur. Bij service: het opgeloste of nog openstaande punt.
            </li>
            <li className="flex items-start gap-2">
              <Video size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
              Een korte video mag erbij (houd hem kort). Vooral handig bij een nieuwe keuken.
            </li>
            <li className="flex items-start gap-2">
              <PenLine size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
              Laat de klant eventueel tekenen. Niet verplicht, overslaan kan. Bij service laat je
              meestal niet tekenen.
            </li>
          </ul>
          <p className="mt-2 text-ink-muted">
            Een opmerking die geen melding is (bijvoorbeeld: klant belt nog voor smetplinten, of
            muren niet haaks) zet je in het opmerkingenveld, typen of inspreken. Daarna versturen:
            het rapport gaat naar de keukenzaak.
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
