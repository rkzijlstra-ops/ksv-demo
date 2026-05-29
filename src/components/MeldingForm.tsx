"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Loader2, FileCheck, AlertCircle } from "lucide-react";
import { FotoMaken } from "./FotoMaken";
import { SpraakOpname } from "./SpraakOpname";

type Urgentie = "rood" | "geel";

export interface BestaandeMelding {
  id: string;
  urgentie: Urgentie | null;
  ruwe_tekst: string | null;
  foto_urls: string[];
}

export function MeldingForm({
  opdrachtId,
  bestaand,
}: {
  opdrachtId: string;
  bestaand?: BestaandeMelding;
}) {
  const router = useRouter();
  const isBewerken = Boolean(bestaand);
  const [urgentie, setUrgentie] = useState<Urgentie | null>(bestaand?.urgentie ?? null);
  const [tekst, setTekst] = useState(bestaand?.ruwe_tekst ?? "");
  const [fotoUrls, setFotoUrls] = useState<string[]>(bestaand?.foto_urls ?? []);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function opslaan() {
    if (!urgentie) {
      setFout("Kies eerst rood of geel.");
      return;
    }
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(
        bestaand ? `/api/meldingen/${bestaand.id}` : "/api/meldingen",
        {
          method: bestaand ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            bestaand
              ? {
                  urgentie,
                  ruwe_tekst: tekst.trim() || null,
                  foto_urls: fotoUrls,
                  status: "verzonden",
                }
              : {
                  opdracht_id: opdrachtId,
                  urgentie,
                  ruwe_tekst: tekst.trim() || null,
                  foto_urls: fotoUrls,
                  status: "verzonden",
                },
          ),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Opslaan mislukt (${res.status})`);
      router.push(`/opdracht/${opdrachtId}`);
      router.refresh();
    } catch (err) {
      setFout((err as Error).message);
      setBezig(false);
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

      <button
        type="button"
        onClick={opslaan}
        disabled={bezig}
        className="flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
      >
        {bezig ? (
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
        ) : (
          <FileCheck size={20} strokeWidth={2.5} aria-hidden="true" />
        )}
        {isBewerken ? "Bijwerken in rapport" : "Toevoegen aan rapport"}
      </button>
    </div>
  );
}
