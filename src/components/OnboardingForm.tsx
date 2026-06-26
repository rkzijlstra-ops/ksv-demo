"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, BookOpen, ArrowRight } from "lucide-react";
import { normaliseerNlMobiel } from "@/lib/telefoon";
import { geldigEmail } from "@/lib/email";

/**
 * Eerste-gebruik-scherm voor een nieuwe monteur: vul je afzendergegevens in (komen op het opleverrapport
 * en bepalen het Reply-To). Pas door als alle vier geldig zijn. Daarna een welkom-stap met de handleiding.
 */
export function OnboardingForm({
  naam,
  bedrijfsnaam,
  telefoon,
  contactEmail,
}: {
  naam: string | null;
  bedrijfsnaam: string | null;
  telefoon: string | null;
  contactEmail: string | null;
}) {
  const [velden, setVelden] = useState({
    naam: naam ?? "",
    bedrijfsnaam: bedrijfsnaam ?? "",
    telefoon: telefoon ?? "",
    contact_email: contactEmail ?? "",
  });
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [klaar, setKlaar] = useState(false);

  const naamOk = velden.naam.trim().length > 0;
  const bedrijfOk = velden.bedrijfsnaam.trim().length > 0;
  const telOk = normaliseerNlMobiel(velden.telefoon) !== null;
  const mailOk = geldigEmail(velden.contact_email);
  const allesOk = naamOk && bedrijfOk && telOk && mailOk;

  function zet(veld: keyof typeof velden, waarde: string) {
    setVelden((v) => ({ ...v, [veld]: waarde }));
  }

  async function opslaan() {
    if (!allesOk) return;
    setBezig(true);
    setFout("");
    try {
      const res = await fetch("/api/mijn-gegevens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(velden),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Opslaan mislukt (${res.status})`);
        return;
      }
      setKlaar(true);
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  const labelClass = "flex flex-col gap-1 text-sm font-semibold text-ink";
  const inputClass =
    "min-h-[44px] border-2 border-line bg-white px-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";

  if (klaar) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink">
          Top, je gegevens staan goed. Wil je weten hoe de app werkt? Bekijk even de handleiding, of ga
          direct aan de slag.
        </p>
        <Link
          href="/handleiding"
          className="inline-flex min-h-[48px] items-center justify-center gap-2 border-2 border-primary bg-white px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
        >
          <BookOpen size={18} strokeWidth={2.5} aria-hidden="true" />
          Bekijk de handleiding
        </Link>
        <Link
          href="/"
          className="relative inline-flex min-h-[48px] items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
        >
          Naar de kluspool
          <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className={labelClass}>
        Naam
        <input className={inputClass} value={velden.naam} onChange={(e) => zet("naam", e.target.value)} placeholder="Bijv. Piet de Vries" />
      </label>
      <label className={labelClass}>
        Bedrijfsnaam
        <input className={inputClass} value={velden.bedrijfsnaam} onChange={(e) => zet("bedrijfsnaam", e.target.value)} placeholder="Bijv. Keukenmontage Jansen" />
      </label>
      <label className={labelClass}>
        Telefoon (mobiel)
        <input className={inputClass} value={velden.telefoon} onChange={(e) => zet("telefoon", e.target.value)} inputMode="tel" placeholder="Bijv. 06-12345678" />
        {velden.telefoon.trim() && !telOk && (
          <span className="text-xs font-normal text-urgent-rood">Vul een geldig 06-nummer in.</span>
        )}
      </label>
      <label className={labelClass}>
        Contact-e-mail
        <input className={inputClass} value={velden.contact_email} onChange={(e) => zet("contact_email", e.target.value)} inputMode="email" placeholder="Bijv. jouw@bedrijf.nl" />
        {velden.contact_email.trim() && !mailOk && (
          <span className="text-xs font-normal text-urgent-rood">Vul een geldig e-mailadres in.</span>
        )}
      </label>

      <p className="text-xs text-ink-muted">
        Deze gegevens komen op je opleverrapporten (briefhoofd en voetregel), en een antwoord van de
        opdrachtgever komt op je e-mailadres binnen.
      </p>

      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}

      <button
        type="button"
        onClick={opslaan}
        disabled={bezig || !allesOk}
        className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
      >
        {bezig && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Opslaan en verder
      </button>
    </div>
  );
}
