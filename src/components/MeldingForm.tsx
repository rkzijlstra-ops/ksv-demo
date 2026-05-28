"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Loader2, Send, Save, AlertCircle } from "lucide-react";
import { FotoMaken } from "./FotoMaken";
import { SpraakOpname } from "./SpraakOpname";

type Urgentie = "rood" | "geel";

export function MeldingForm() {
  const router = useRouter();
  const [urgentie, setUrgentie] = useState<Urgentie | null>(null);
  const [tekst, setTekst] = useState("");
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [klantNaam, setKlantNaam] = useState("");
  const [bezig, setBezig] = useState<"" | "concept" | "verzonden">("");
  const [fout, setFout] = useState("");

  async function opslaan(status: "concept" | "verzonden") {
    if (!urgentie) {
      setFout("Kies eerst rood of geel.");
      return;
    }
    setBezig(status);
    setFout("");
    try {
      const res = await fetch("/api/meldingen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          urgentie,
          ruwe_tekst: tekst.trim() || null,
          foto_urls: fotoUrls,
          klant_naam: klantNaam.trim() || null,
          status,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Opslaan mislukt (${res.status})`);
      router.push("/");
      router.refresh();
    } catch (err) {
      setFout((err as Error).message);
      setBezig("");
    }
  }

  const urgentieKnop = (waarde: Urgentie, label: string, Icon: typeof AlertTriangle, kleur: string) => {
    const actief = urgentie === waarde;
    return (
      <button
        type="button"
        onClick={() => setUrgentie(waarde)}
        aria-pressed={actief}
        className={`flex min-h-[64px] flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 font-bold transition-all duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          actief ? `${kleur} text-white border-transparent` : "border-line bg-white text-ink"
        }`}
      >
        <Icon size={24} strokeWidth={2.5} aria-hidden="true" />
        {label}
      </button>
    );
  };

  const werkBezig = bezig !== "";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="mb-2 block font-semibold text-ink">Urgentie</span>
        <div className="flex gap-3">
          {urgentieKnop("rood", "DIRECT", AlertTriangle, "bg-urgent-rood")}
          {urgentieKnop("geel", "ACHTERAF", Clock, "bg-urgent-geel")}
        </div>
      </div>

      <div>
        <label htmlFor="klant" className="mb-2 block font-semibold text-ink">
          Klant (optioneel)
        </label>
        <input
          id="klant"
          type="text"
          value={klantNaam}
          onChange={(e) => setKlantNaam(e.target.value)}
          placeholder="Naam of adres"
          className="min-h-[56px] w-full rounded-xl border border-line px-4 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
        />
      </div>

      <div>
        <label htmlFor="tekst" className="mb-2 block font-semibold text-ink">
          Wat is er aan de hand?
        </label>
        <textarea
          id="tekst"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          rows={4}
          placeholder="Typ of spreek je melding in"
          className="w-full rounded-xl border border-line p-4 font-[family-name:var(--font-body)] text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
        />
        <div className="mt-2">
          <SpraakOpname onTekst={(t) => setTekst((prev) => (prev ? `${prev} ${t}` : t))} />
        </div>
      </div>

      <div>
        <span className="mb-2 block font-semibold text-ink">Foto&apos;s</span>
        <FotoMaken urls={fotoUrls} onChange={setFotoUrls} />
      </div>

      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => opslaan("concept")}
          disabled={werkBezig}
          className="flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-primary bg-white px-4 text-base font-bold text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
        >
          {bezig === "concept" ? (
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={20} strokeWidth={2.5} aria-hidden="true" />
          )}
          Concept
        </button>
        <button
          type="button"
          onClick={() => opslaan("verzonden")}
          disabled={werkBezig}
          className="flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
        >
          {bezig === "verzonden" ? (
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          ) : (
            <Send size={20} strokeWidth={2.5} aria-hidden="true" />
          )}
          Verzenden
        </button>
      </div>
    </div>
  );
}
