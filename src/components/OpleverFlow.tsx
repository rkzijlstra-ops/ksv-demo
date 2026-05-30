"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, PackageCheck, PenLine } from "lucide-react";
import { FotoMaken } from "@/components/FotoMaken";
import { VideoMaken } from "@/components/VideoMaken";
import { Handtekening } from "@/components/Handtekening";
import { controleerOplevering, type Uitkomst } from "@/lib/oplever-validatie";
import { dataUrlNaarBlob, uploadHandtekening } from "@/lib/handtekening";

export function OpleverFlow({ opdrachtId }: { opdrachtId: string }) {
  const router = useRouter();
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uitkomst, setUitkomst] = useState<Uitkomst | null>(null);
  const [tekenen, setTekenen] = useState(false);
  const [handtekeningDataUrl, setHandtekeningDataUrl] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const check = controleerOplevering({
    fotoCount: fotoUrls.length,
    heeftVideo: videoUrl !== null,
    uitkomst,
  });

  async function versturen() {
    if (!check.magVersturen) {
      setFout("Kies eerst de uitkomst (Afgerond of Nog openstaande punten).");
      return;
    }
    if (check.waarschuwing && !window.confirm(check.waarschuwing)) {
      return;
    }
    setBezig(true);
    setFout("");
    try {
      // 1. Handtekening (optioneel) uploaden.
      let handtekening_url: string | null = null;
      if (tekenen && handtekeningDataUrl) {
        const blob = dataUrlNaarBlob(handtekeningDataUrl);
        handtekening_url = (await uploadHandtekening(blob)).url;
      }

      // 2. Concept opslaan.
      const conceptRes = await fetch(`/api/opdrachten/${opdrachtId}/oplevering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uitkomst,
          eindstaat_foto_urls: fotoUrls,
          video_url: videoUrl,
          handtekening_url,
        }),
      });
      if (!conceptRes.ok) {
        const b = await conceptRes.json().catch(() => ({}));
        throw new Error(b.error ?? `Opslaan mislukt (${conceptRes.status})`);
      }

      // 3. Versturen (rapport + mail + markeren).
      const verstuurRes = await fetch(`/api/opdrachten/${opdrachtId}/opleveren`, {
        method: "POST",
      });
      if (!verstuurRes.ok) {
        const b = await verstuurRes.json().catch(() => ({}));
        throw new Error(b.error ?? `Versturen mislukt (${verstuurRes.status})`);
      }

      router.push(`/opdracht/${opdrachtId}`);
      router.refresh();
    } catch (err) {
      setFout((err as Error).message);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stap 1: eindresultaat */}
      <section>
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          1. Eindresultaat vastleggen
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          Maak foto&apos;s van de keuken, het blad en de apparatuur. Een korte video mag erbij.
        </p>
        <FotoMaken urls={fotoUrls} onChange={setFotoUrls} />
        <div className="mt-3">
          <VideoMaken url={videoUrl} onChange={setVideoUrl} />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-ink">Uitkomst</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {(
              [
                { v: "afgerond", label: "Afgerond" },
                { v: "openstaande_punten", label: "Nog openstaande punten" },
              ] as { v: Uitkomst; label: string }[]
            ).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => setUitkomst(v)}
                className={`min-h-[48px] flex-1 cursor-pointer border-2 px-4 text-base font-extrabold uppercase tracking-[0.04em] transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-accent ${
                  uitkomst === v
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-white text-ink hover:bg-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stap 2: handtekening (overslaanbaar) */}
      <section className="border-t border-line pt-6">
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          2. Handtekening (optioneel)
        </h2>
        {!tekenen ? (
          <button
            type="button"
            onClick={() => setTekenen(true)}
            className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-white px-4 text-base font-extrabold uppercase tracking-[0.05em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <PenLine size={20} strokeWidth={2.5} aria-hidden="true" />
            Klant laten tekenen
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <Handtekening onChange={setHandtekeningDataUrl} />
            <button
              type="button"
              onClick={() => {
                setTekenen(false);
                setHandtekeningDataUrl(null);
              }}
              className="self-start text-sm font-semibold text-ink-muted hover:underline"
            >
              Toch overslaan
            </button>
          </div>
        )}
      </section>

      {/* Stap 3: versturen */}
      <section className="border-t border-line pt-6">
        {fout && (
          <p className="mb-3 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
            <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            {fout}
          </p>
        )}
        <button
          type="button"
          onClick={versturen}
          disabled={bezig}
          className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-extrabold uppercase tracking-[0.06em] text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
        >
          {bezig ? (
            <>
              <Loader2 size={22} className="animate-spin" aria-hidden="true" />
              Versturen…
            </>
          ) : (
            <>
              <PackageCheck size={22} strokeWidth={2.5} aria-hidden="true" />
              Oplevering versturen
            </>
          )}
        </button>
      </section>
    </div>
  );
}
