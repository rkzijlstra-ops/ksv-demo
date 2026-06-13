"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, BookOpen, X, Sparkles } from "lucide-react";
import { WELKOM_WEG_KEY } from "@/lib/onboarding";

/**
 * Onboarding voor de werkpool: leidt een nieuwe gebruiker naar de handleiding. Past zich aan:
 * - geen klussen + niet weggeklikt: rijke welkom-uitleg met 3 stappen.
 * - wel klussen + niet weggeklikt: compacte tip-balk boven de lijst.
 * - weggeklikt: verdwijnt; bij een lege werkpool valt het terug op de gewone lege-staat.
 * De handleiding blijft altijd in het menu staan; dat staat ook in het blok zelf, zodat
 * niemand denkt dat de uitleg na "Niet meer tonen" voorgoed weg is.
 */
export function WerkpoolOnboarding({ leeg }: { leeg: boolean }) {
  // null = nog niet uit localStorage gelezen (SSR/voor mount); daarna true/false.
  const [weg, setWeg] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setWeg(localStorage.getItem(WELKOM_WEG_KEY) === "1");
    } catch {
      setWeg(false);
    }
  }, []);

  function verberg() {
    try {
      localStorage.setItem(WELKOM_WEG_KEY, "1");
    } catch {
      // private mode e.d.: dan blijft het deze sessie weg, dat is genoeg.
    }
    setWeg(true);
  }

  // Voor mount weten we nog niet of het is weggeklikt: niets tonen om een flits te voorkomen.
  if (weg === null) return null;

  // Weggeklikt: lege werkpool valt terug op de gewone lege-staat; met klussen tonen we niets.
  if (weg) {
    if (!leeg) return null;
    return (
      <div className="mt-8 flex flex-col items-center gap-3 border border-line bg-surface p-8 text-center">
        <Inbox size={40} className="text-ink-muted" aria-hidden="true" />
        <p className="font-semibold text-ink">Geen actieve klussen</p>
        <p className="text-sm text-ink-muted">Nieuwe klussen en meldingen verschijnen hier.</p>
      </div>
    );
  }

  // Rijke variant: nieuwe gebruiker zonder klussen.
  if (leeg) {
    return (
      <section className="border-2 border-ink bg-white">
        <div className="flex items-center gap-2 bg-ink px-4 py-3">
          <Sparkles size={18} strokeWidth={2.5} className="shrink-0 text-accent" aria-hidden="true" />
          <h2 className="font-mono text-lg font-extrabold tracking-tight text-white">Welkom bij Kluslus</h2>
          <button
            type="button"
            onClick={verberg}
            aria-label="Welkom sluiten"
            className="ml-auto flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-accent"
          >
            <X size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-ink">Je hebt nog geen klussen. Zo werkt het:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink">
            <li>Voeg een klus toe (knop hierboven).</li>
            <li>Open de klus, maak een melding of lever op.</li>
            <li>Verstuur het naar de opdrachtgever.</li>
          </ol>
          <Link
            href="/handleiding"
            className="mt-4 inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-accent px-4 text-sm font-extrabold uppercase tracking-[0.05em] text-ink transition-[filter] duration-150 hover:brightness-95 focus-visible:outline-3 focus-visible:outline-primary"
          >
            <BookOpen size={18} strokeWidth={2.5} aria-hidden="true" />
            Bekijk de handleiding (6 stappen)
          </Link>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={verberg}
              className="cursor-pointer text-xs font-semibold text-ink-muted underline hover:text-ink"
            >
              Niet meer tonen
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            De handleiding blijft altijd in het menu (≡) rechtsboven staan.
          </p>
        </div>
      </section>
    );
  }

  // Compacte variant: gebruiker met klussen, nog niet weggeklikt.
  return (
    <section className="mb-3 border-2 border-ink bg-white">
      <div className="flex items-center gap-2 bg-ink px-4 py-2.5">
        <Sparkles size={16} strokeWidth={2.5} className="shrink-0 text-accent" aria-hidden="true" />
        <p className="font-mono text-sm font-extrabold tracking-tight text-white">Nieuw hier?</p>
        <button
          type="button"
          onClick={verberg}
          aria-label="Tip sluiten"
          className="ml-auto flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-accent"
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <p className="text-sm text-ink">Bekijk hoe Kluslus werkt in 6 korte stappen.</p>
        <Link
          href="/handleiding"
          className="inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary transition-colors hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
        >
          <BookOpen size={16} strokeWidth={2.5} aria-hidden="true" />
          Open de handleiding
        </Link>
        <button
          type="button"
          onClick={verberg}
          className="cursor-pointer text-xs font-semibold text-ink-muted underline hover:text-ink"
        >
          Niet meer tonen
        </button>
      </div>
    </section>
  );
}
