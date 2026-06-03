"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, PackageCheck, PenLine, CheckCircle2, Mic, ChevronLeft, Eye, CloudOff } from "lucide-react";
import { useOfflineState } from "@/lib/use-offline-state";
import { FotoMaken } from "@/components/FotoMaken";
import { VideoMaken } from "@/components/VideoMaken";
import { HandtekeningModal } from "@/components/HandtekeningModal";
import { SpraakOpname } from "@/components/SpraakOpname";
import { Voortgang } from "@/components/Voortgang";
import { controleerOplevering } from "@/lib/oplever-validatie";
import { dataUrlNaarBlob, uploadHandtekening } from "@/lib/handtekening";
import { useVerlaatWaarschuwing } from "@/lib/use-verlaat-waarschuwing";
import { KEUKENZAKEN } from "@/lib/keukenzaken";

export function OpleverFlow({ opdrachtId }: { opdrachtId: string }) {
  const router = useRouter();
  const { online } = useOfflineState();
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [opmerking, setOpmerking] = useState("");
  const [rapportEmail, setRapportEmail] = useState("");
  const [handmatig, setHandmatig] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // De handtekening wordt meteen bij "Klaar" geüpload en als URL bewaard (net als foto's en video),
  // zodat hij in elke tussentijdse opslag meegaat en een herlaad/terugkeer overleeft.
  const [handtekeningUrl, setHandtekeningUrl] = useState<string | null>(null);
  const [handtekeningBezig, setHandtekeningBezig] = useState(false);
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
            setHandtekeningUrl(oplevering.handtekening_url ?? null);
            setOpmerking(oplevering.opmerking ?? "");
            const em: string = oplevering.rapport_email ?? "";
            setRapportEmail(em);
            if (em && !KEUKENZAKEN.some((z) => z.email === em)) setHandmatig(true);
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

  function bewaarConcept(emailOverride?: string) {
    if (!geladenRef.current) return;
    const rapport_email =
      emailOverride !== undefined ? emailOverride.trim() || null : rapportEmail.trim() || null;
    void fetch(`/api/opdrachten/${opdrachtId}/oplevering`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eindstaat_foto_urls: fotoUrls,
        video_url: videoUrl,
        handtekening_url: handtekeningUrl,
        opmerking: opmerking.trim() || null,
        rapport_email,
      }),
    }).catch(() => {});
  }

  // Foto's/video/handtekening meteen bewaren als ze wijzigen (de dure uploads niet kwijtraken).
  useEffect(() => {
    bewaarConcept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoUrls, videoUrl, handtekeningUrl]);

  const check = controleerOplevering({
    fotoCount: fotoUrls.length,
    heeftVideo: videoUrl !== null,
  });

  async function versturen() {
    if (check.waarschuwing && !window.confirm(check.waarschuwing)) return;

    setBezig(true);
    setFout("");
    try {
      // De handtekening is bij "Klaar" al geüpload en in elke tussenopslag bewaard; hier alleen
      // nog expliciet meesturen voor de zekerheid.
      const conceptRes = await fetch(`/api/opdrachten/${opdrachtId}/oplevering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eindstaat_foto_urls: fotoUrls,
          video_url: videoUrl,
          handtekening_url: handtekeningUrl,
          opmerking: opmerking.trim() || null,
          rapport_email: rapportEmail.trim() || null,
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
          onBlur={() => bewaarConcept()}
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
        {handtekeningBezig ? (
          <div className="rounded-none border border-line bg-surface px-3 py-3">
            <Voortgang label="Handtekening opslaan…" />
          </div>
        ) : !handtekeningUrl ? (
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
              src={handtekeningUrl}
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
                onClick={() => setHandtekeningUrl(null)}
                className="inline-flex min-h-[36px] cursor-pointer items-center justify-center border border-urgent-rood px-2 text-xs font-semibold text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-primary"
              >
                Wis
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Rapport naar */}
      <section className="border-t border-line pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">Rapport naar</span>
          <select
            value={
              handmatig
                ? "__anders__"
                : KEUKENZAKEN.find((z) => z.email === rapportEmail)?.naam ?? ""
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__anders__") {
                setHandmatig(true);
              } else if (v === "") {
                setHandmatig(false);
                setRapportEmail("");
                bewaarConcept("");
              } else {
                const email = KEUKENZAKEN.find((z) => z.naam === v)?.email ?? "";
                setHandmatig(false);
                setRapportEmail(email);
                bewaarConcept(email);
              }
            }}
            className="min-h-[48px] rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
          >
            <option value="">Kies de keukenzaak…</option>
            {KEUKENZAKEN.map((z) => (
              <option key={z.naam} value={z.naam}>
                {z.naam}
              </option>
            ))}
            <option value="__anders__">Anders (typ zelf)</option>
          </select>
          {handmatig && (
            <input
              type="email"
              inputMode="email"
              value={rapportEmail}
              onChange={(e) => setRapportEmail(e.target.value)}
              onBlur={() => bewaarConcept()}
              placeholder="naam@keukenzaak.nl"
              className="mt-1 min-h-[48px] rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
            />
          )}
          <span className="text-xs text-ink-muted">Leeg laten = naar het standaardadres (test).</span>
        </div>
        {fout && (
          <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
            <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            {fout}
          </p>
        )}
      </section>

      {/* Vaste onderbalk: voorvertonen + navigatie + versturen */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          {bezig ? (
            <Voortgang label="Rapport maken en versturen…" />
          ) : (
            <>
              <Link
                href={`/opdracht/${opdrachtId}/rapport`}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
              >
                <Eye size={18} strokeWidth={2.5} aria-hidden="true" />
                Rapport voorvertonen
              </Link>
              <div className="flex gap-3">
                <Link
                  href={`/opdracht/${opdrachtId}`}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
                >
                  <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
                  Meldingen
                </Link>
                <button
                  type="button"
                  onClick={versturen}
                  disabled={!online}
                  className="relative inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 bg-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
                >
                  {!online ? (
                    <>
                      <CloudOff size={18} strokeWidth={2.5} aria-hidden="true" />
                      Netwerk nodig
                    </>
                  ) : (
                    <>
                      <PackageCheck size={18} strokeWidth={2.5} aria-hidden="true" />
                      Versturen
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <HandtekeningModal
          onOpslaan={async (d) => {
            setModalOpen(false);
            setHandtekeningBezig(true);
            setFout("");
            try {
              const blob = dataUrlNaarBlob(d);
              const { url } = await uploadHandtekening(blob);
              setHandtekeningUrl(url);
            } catch (err) {
              setFout(`Handtekening opslaan mislukt: ${(err as Error).message}`);
            } finally {
              setHandtekeningBezig(false);
            }
          }}
          onSluiten={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
