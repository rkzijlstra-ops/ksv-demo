"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2, Check, AlertCircle } from "lucide-react";

/** Beheer maakt een nieuwe opdrachtgever (zaak) aan. Alleen op de Gebruikers-pagina (beheer-gate). */
export function NieuweOpdrachtgeverForm() {
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [bezig, setBezig] = useState(false);
  const [bericht, setBericht] = useState("");
  const [fout, setFout] = useState("");

  async function aanmaken(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setBericht("");
    setFout("");
    try {
      const res = await fetch("/api/opdrachtgevers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Aanmaken mislukt (${res.status})`);
        return;
      }
      setBericht(`Opdrachtgever "${naam}" aangemaakt.`);
      setNaam("");
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  const veld =
    "min-h-[48px] border-2 border-line bg-white px-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";

  return (
    <form onSubmit={aanmaken} className="flex flex-col gap-3 border-2 border-ink bg-white p-4">
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Nieuwe opdrachtgever
        <input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          required
          className={veld}
          placeholder="Bijv. Keukenhal Lisse"
        />
        <span className="text-xs font-normal text-ink-muted">
          De keukenzaak namens wie je klussen plant en mensen uitnodigt.
        </span>
      </label>
      <button
        type="submit"
        disabled={bezig || !naam.trim()}
        className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-extrabold uppercase tracking-[0.05em] text-white disabled:opacity-60"
      >
        {bezig ? (
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
        ) : (
          <Building2 size={20} strokeWidth={2.4} aria-hidden="true" />
        )}
        Opdrachtgever aanmaken
      </button>

      {bericht && (
        <p className="flex items-start gap-2 text-sm font-semibold text-success">
          <Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {bericht}
        </p>
      )}
      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </form>
  );
}
