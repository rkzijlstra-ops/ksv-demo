"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { FotoMaken } from "@/components/FotoMaken";
import { VideoMaken } from "@/components/VideoMaken";

/**
 * Het "Klaar, snel" afgerond-scherm: optioneel foto's, video en een notitie, plus het vervolg-vinkje.
 * Hergebruikt FotoMaken en VideoMaken (zelfde als de oplever-flow). Alles is optioneel.
 */
export function AfgerondMeldenScherm({ opdrachtId, klantNaam }: { opdrachtId: string; klantNaam: string }) {
  const router = useRouter();
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [toelichting, setToelichting] = useState("");
  const [vervolg, setVervolg] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function melden() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/afgerond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toelichting: toelichting.trim() || null,
          vervolgNodig: vervolg,
          fotoUrls,
          videoUrl,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Afronden mislukt (${res.status})`);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="border-2 border-t-0 border-line bg-white px-5 py-5">
      <p className="text-sm text-ink-muted">
        Klus voor <span className="font-bold text-ink">{klantNaam}</span>. De zaak krijgt bericht dat hij klaar is. Alles hieronder is optioneel.
      </p>

      <h2 className="mt-4 mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Foto&apos;s (optioneel)</h2>
      <FotoMaken urls={fotoUrls} onChange={setFotoUrls} />

      <h2 className="mt-5 mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Video (optioneel)</h2>
      <VideoMaken url={videoUrl} onChange={setVideoUrl} />

      <label className="mt-5 flex flex-col gap-1 text-sm font-semibold text-ink">
        Notitie (optioneel)
        <textarea
          value={toelichting}
          onChange={(e) => setToelichting(e.target.value)}
          rows={3}
          placeholder="Bijv. lade afgesteld, alles getest, klant tevreden."
          className="border-2 border-line bg-white p-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
        />
      </label>

      <label className="mt-4 flex items-start gap-3 border-2 border-urgent-geel bg-[#fffbeb] p-3 text-sm">
        <input
          type="checkbox"
          checked={vervolg}
          onChange={(e) => setVervolg(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
        />
        <span>
          <span className="font-bold text-ink">Er komt nog een vervolg</span>
          <span className="block text-ink-muted">
            Bijv. onderdelen die later binnenkomen. De klus gaat dan terug naar de zaak om opnieuw in te plannen.
          </span>
        </span>
      </label>

      {fout && (
        <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}

      <button
        type="button"
        onClick={melden}
        disabled={bezig}
        className="relative mt-5 flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-base font-extrabold uppercase tracking-[0.05em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
      >
        {bezig ? <Loader2 size={22} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={22} strokeWidth={2.5} aria-hidden="true" />}
        Afgerond melden
      </button>
    </div>
  );
}
