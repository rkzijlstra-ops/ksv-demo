"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { normaliseerNlMobiel } from "@/lib/telefoon";

/**
 * Eenmalig welkomscherm voor een opdrachtgever: zijn door beheer ingevulde naam staat klaar, hij kan
 * die (en optioneel zijn telefoon) één keer corrigeren en bevestigen. Daarna verdwijnt het scherm.
 */
export function WelkomOpdrachtgeverForm({
  naam,
  telefoon,
}: {
  naam: string | null;
  telefoon: string | null;
}) {
  const router = useRouter();
  const [velden, setVelden] = useState({ naam: naam ?? "", telefoon: telefoon ?? "" });
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const naamOk = velden.naam.trim().length > 0;
  const telLeegOfOk = !velden.telefoon.trim() || normaliseerNlMobiel(velden.telefoon) !== null;

  async function bevestigen() {
    if (!naamOk) return;
    setBezig(true);
    setFout("");
    try {
      const res = await fetch("/api/welkom-opdrachtgever", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(velden),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Bevestigen mislukt (${res.status})`);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  const labelClass = "flex flex-col gap-1 text-sm font-semibold text-ink";
  const inputClass =
    "min-h-[44px] border-2 border-line bg-white px-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";

  return (
    <div className="flex flex-col gap-4">
      <label className={labelClass}>
        Je naam
        <input
          className={inputClass}
          value={velden.naam}
          onChange={(e) => setVelden((v) => ({ ...v, naam: e.target.value }))}
          placeholder="Bijv. Sandra de Vries"
        />
      </label>
      <label className={labelClass}>
        Telefoon (optioneel)
        <input
          className={inputClass}
          value={velden.telefoon}
          onChange={(e) => setVelden((v) => ({ ...v, telefoon: e.target.value }))}
          inputMode="tel"
          placeholder="Bijv. 06-12345678"
        />
        {velden.telefoon.trim() && !telLeegOfOk && (
          <span className="text-xs font-normal text-urgent-rood">Vul een geldig 06-nummer in, of laat leeg.</span>
        )}
      </label>

      <p className="text-xs text-ink-muted">
        Je naam staat hierboven al klaar. Klopt hij, bevestig dan. Je kunt dit nu nog corrigeren; daarna
        gaat het welkomscherm weg.
      </p>

      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}

      <button
        type="button"
        onClick={bevestigen}
        disabled={bezig || !naamOk || !telLeegOfOk}
        className="relative inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
      >
        {bezig && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Bevestigen en verder
        <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
