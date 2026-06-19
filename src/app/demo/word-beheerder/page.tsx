"use client";

import { useState } from "react";
import { Loader2, AlertCircle, LayoutDashboard } from "lucide-react";

/**
 * Demo: de persoon die de demo draait meldt zich aan als beheerder (naam + 06 + e-mail) en komt op het
 * dashboard. Klussen die hij aan de voorbeeld-monteurs toewijst, komen op zíjn toestel binnen.
 */
export default function WordBeheerderPage() {
  const [naam, setNaam] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function start() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch("/api/demo/word-beheerder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam: naam.trim(), telefoon: telefoon.trim() || null, email: email.trim() || null }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Starten mislukt (${res.status})`);
        setBezig(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
      setBezig(false);
    }
  }

  const veld = "min-h-[48px] w-full border-2 border-line bg-white px-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-5">
      <div>
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
          <LayoutDashboard size={16} strokeWidth={2.5} aria-hidden="true" /> Demo
        </p>
        <h1 className="mt-1 font-mono text-2xl font-extrabold tracking-tight">Start de demo</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Jij draait de demo als kantoor. Vul je gegevens in; klussen die je aan de voorbeeld-monteurs
          geeft, komen op jouw toestel binnen.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Jouw naam
        <input className={veld} value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Bijv. Ed" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        06-nummer
        <input className={veld} inputMode="tel" value={telefoon} onChange={(e) => setTelefoon(e.target.value)} placeholder="06..." />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        E-mailadres
        <input className={veld} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jij@voorbeeld.nl" />
      </label>

      {fout && (
        <p className="flex items-center gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} aria-hidden="true" /> {fout}
        </p>
      )}

      <button
        type="button"
        onClick={start}
        disabled={bezig || !naam.trim()}
        className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-base font-extrabold uppercase tracking-[0.05em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
      >
        {bezig && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
        Start de demo
      </button>
    </main>
  );
}
