"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, PackageCheck, PenLine, CheckCircle2, Mic } from "lucide-react";
import { FotoMaken } from "@/components/FotoMaken";
import { VideoMaken } from "@/components/VideoMaken";
import { HandtekeningModal } from "@/components/HandtekeningModal";
import { SpraakOpname } from "@/components/SpraakOpname";
import { Voortgang } from "@/components/Voortgang";
import { controleerOplevering } from "@/lib/oplever-validatie";
import { dataUrlNaarBlob, uploadHandtekening } from "@/lib/handtekening";
import { useVerlaatWaarschuwing } from "@/lib/use-verlaat-waarschuwing";

export function OpleverFlow({ opdrachtId }: { opdrachtId: string }) {
  const router = useRouter();
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [opmerking, setOpmerking] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [handtekeningDataUrl, setHandtekeningDataUrl] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState("");

  useVerlaatWaarschuwing(bezig);

  const geladenRef = useRef(false);

  // Bestaand concept laden bij binnenkomst, zodat een halve oplevering (incl. de geuploade
  // video) bewaard blijft als je tussendoor naar de werkpool gaat en terugkomt.
  useEffect(() => {
    let actief = true;
    (async () => {
      try {
        const res = await fetch(`/api/opdrachten/${opdrachtId}/oplevering`);
        if (res.ok && actief) {
          const { oplevering } = await res.json();
          if (oplevering) {
            setFotoUrls(oplevering.eindstaat_foto_urls ?? []);
            setVideoUrl(oplevering.video_url ?? null);
            setOpmerking(oplevering.opmerking ?? "");
          }
        }
      } finally {
        geladenRef.current = true;
      }
    })();
    return () => {
      actief = false;
    };
  }, [opdrachtId]);

  function bewaarConcept() {
    if (!geladenRef.current) return;
    void fetch(`/api/opdrachten/${opdrachtId}/oplevering`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eindstaat_foto_urls: fotoUrls,
        video_url: videoUrl,
        opmerking: opmerking.trim() || null,
      }),
    }).catch(() => {});
  }

  // Foto's/video meteen bewaren als ze wijzigen (de dure uploads niet kwijtraken).
  useEffect(() => {
    bewaarConcept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoUrls, videoUrl]);

  const check = controleerOplevering({
    fotoCount: fotoUrls.length,
    heeftVideo: videoUrl !== null,
  });

  async function versturen() {
    if (check.waarschuwing && !window.confirm(check.waarschuwing)) return;

    setBezig(true);
    setFout("");
    try {
      let handtekening_url: string | null = null;
      if (handtekeningDataUrl) {
        const blob = dataUrlNaarBlob(handtekeningDataUrl);
        handtekening_url = (await uploadHandtekening(blob)).url;
      }

      const conceptRes = await fetch(`/api/opdrachten/${opdrachtId}/oplevering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eindstaat_foto_urls: fotoUrls,
          video_url: videoUrl,
          handtekening_url,
          opmerking: opmerking.trim() || null,
        }),
      });
      if (!conceptRes.ok) {
        const b = await conceptRes.json().catch(() => ({}));
        throw new Error(b.error ?? `Opslaan mislukt (${conceptRes.status})`);
      }

      const verstuurRes = await fetch(`/api/opdrachten/${opdrachtId}/opleveren`, { method: "POST" });
      if (!verstuurRes.ok) {
        const b = await verstuurRes.json().catch(() => ({}));
        throw new Error(b.error ?? `Versturen mislukt (${verstuurRes.status})`);
      }

      // Belonend "klaar"-moment, dan terug naar de opdracht.
      setKlaar(true);
      setTimeout(() => {
        router.push(`/opdracht/${opdrachtId}`);
        router.refresh();
      }, 1400);
    } catch (err) {
      setFout((err as Error).message);
      setBezig(false);
    }
  }

  if (klaar) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <CheckCircle2
          size={72}
          strokeWidth={2.5}
          className="animate-[ping_0.6s_ease-out_1] text-success"
          aria-hidden="true"
        />
        <CheckCircle2 size={72} strokeWidth={2.5} className="-mt-[84px] text-success" aria-hidden="true" />
        <p className="mt-2 font-mono text-2xl font-extrabold text-ink">Opgeleverd!</p>
        <p className="text-sm text-ink-muted">Het rapport is naar de zaak verstuurd.</p>
      </div>
    );
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
      </section>

      {/* Notitie */}
      <section className="border-t border-line pt-6">
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          Opmerking (optioneel)
        </h2>
        <p className="mb-2 text-sm text-ink-muted">
          Bijzonderheden die geen melding zijn. Bijvoorbeeld: klant belt nog voor smetplinten,
          muren niet haaks.
        </p>
        <textarea
          value={opmerking}
          onChange={(e) => setOpmerking(e.target.value)}
          onBlur={bewaarConcept}
          rows={3}
          placeholder="Typ hier of spreek in…"
          className="w-full rounded-none border border-line bg-white p-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
        />
        <div className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
          <Mic size={16} aria-hidden="true" />
          Of spreek het in:
        </div>
        <div className="mt-1">
          <SpraakOpname onTekst={(t) => setOpmerking((prev) => (prev ? `${prev} ${t}` : t))} />
        </div>
      </section>

      {/* Stap 2: handtekening (overslaanbaar) */}
      <section className="border-t border-line pt-6">
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          2. Handtekening (optioneel)
        </h2>
        {!handtekeningDataUrl ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-white px-4 text-base font-extrabold uppercase tracking-[0.05em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <PenLine size={20} strokeWidth={2.5} aria-hidden="true" />
            Klant laten tekenen
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-none border border-success bg-success/10 p-2">
            <CheckCircle2 size={18} strokeWidth={2.5} className="shrink-0 text-success" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={handtekeningDataUrl}
              alt="Handtekening klant"
              className="h-10 w-20 shrink-0 border border-line bg-white object-contain"
            />
            <span className="text-sm font-semibold text-success">Gezet</span>
            <div className="ml-auto flex gap-1.5">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-[36px] cursor-pointer items-center justify-center border border-ink px-2 text-xs font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
              >
                Opnieuw
              </button>
              <button
                type="button"
                onClick={() => setHandtekeningDataUrl(null)}
                className="inline-flex min-h-[36px] cursor-pointer items-center justify-center border border-urgent-rood px-2 text-xs font-semibold text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-primary"
              >
                Wis
              </button>
            </div>
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
        {bezig ? (
          <div className="rounded-none border border-line bg-surface px-4 py-4">
            <Voortgang label="Rapport maken en versturen…" />
          </div>
        ) : (
          <button
            type="button"
            onClick={versturen}
            className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-extrabold uppercase tracking-[0.06em] text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
          >
            <PackageCheck size={22} strokeWidth={2.5} aria-hidden="true" />
            Oplevering versturen
          </button>
        )}
      </section>

      {modalOpen && (
        <HandtekeningModal
          onOpslaan={(d) => {
            setHandtekeningDataUrl(d);
            setModalOpen(false);
          }}
          onSluiten={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
