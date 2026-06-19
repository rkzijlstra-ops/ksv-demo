"use client";

import { useState } from "react";
import { RotateCcw, Loader2, FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Vaste balk bovenaan in de DEMO-omgeving: maakt duidelijk dat het nepdata is en biedt twee resets.
 * "Speel opnieuw" houdt de huidige beheerder (de demo-draaier hoeft zich niet opnieuw te melden);
 * "Helemaal opnieuw" zet ook de beheerder leeg (een ander neemt de demo over). Beide ruimen de
 * zelf-aangemelde monteurs op. Alleen gerenderd in demo-modus; bestaat dus niet in productie.
 */
export function DemoBanner() {
  const router = useRouter();
  const [bezig, setBezig] = useState<"" | "gewoon" | "volledig">("");
  const [fout, setFout] = useState("");

  async function reset(volledig: boolean) {
    const tekst = volledig
      ? "Helemaal opnieuw? Ook de beheerder gaat weg; je meldt je daarna opnieuw aan."
      : "Demo terugzetten naar het begin? Je blijft als beheerder ingelogd; klussen en aangemelde monteurs worden vers.";
    if (!window.confirm(tekst)) return;
    setBezig(volledig ? "volledig" : "gewoon");
    setFout("");
    try {
      const res = await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volledig }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Terugzetten mislukt (${res.status})`);
        setBezig("");
        return;
      }
      if (volledig) {
        window.location.href = "/demo/word-beheerder";
      } else {
        router.refresh();
        setBezig("");
      }
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
      setBezig("");
    }
  }

  const knop =
    "inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 border-2 border-white px-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em] hover:bg-white/20 disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-accent px-4 py-1.5 text-white">
      <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em]">
        <FlaskConical size={15} strokeWidth={2.5} aria-hidden="true" />
        Demo, voorbeelddata, geen echte klanten
      </span>
      <span className="flex items-center gap-2">
        {fout && <span className="text-[11px] font-semibold">{fout}</span>}
        <button type="button" onClick={() => reset(false)} disabled={bezig !== ""} className={`${knop} bg-white/10`}>
          {bezig === "gewoon" ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={13} strokeWidth={2.5} aria-hidden="true" />}
          Speel opnieuw
        </button>
        <button type="button" onClick={() => reset(true)} disabled={bezig !== ""} className={knop}>
          {bezig === "volledig" ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
          Helemaal opnieuw
        </button>
      </span>
    </div>
  );
}
