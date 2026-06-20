"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Video, Image as ImageIcon, AlertCircle, CheckCircle2, Play, Trash2, Clock } from "lucide-react";
import { uploadOpleverVideo } from "@/lib/oplever-upload";
import { isGrootBestand, bytesNaarMB } from "@/lib/video-opname";
import { VideoOpnemen } from "@/components/VideoOpnemen";
import { Voortgang } from "@/components/Voortgang";
import { useVerlaatWaarschuwing } from "@/lib/use-verlaat-waarschuwing";
import { zetVideoBezig, leesUploadStatus, useOpleverUpload } from "@/lib/oplever-upload-status";

/**
 * Opnemen/kiezen van één oplever-video. Upload rechtstreeks naar Supabase Storage.
 * `url` is de opgeslagen video-URL (of null). Online-only (de hele oplever-flow vereist netwerk).
 */
export function VideoMaken({
  url,
  onChange,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
}) {
  const [bezig, setBezig] = useState(false);
  const [pct, setPct] = useState(0);
  const [fout, setFout] = useState("");
  const [speel, setSpeel] = useState(false);
  const [opnemen, setOpnemen] = useState(false);
  const [tip, setTip] = useState("");
  // Serialisatie: een gekozen video wacht tot de foto's klaar zijn (foto en video niet tegelijk uploaden).
  const [wachtend, setWachtend] = useState<File | null>(null);
  // Synchrone spiegels van wachtend/bezig (state is async; refs voorkomen een dubbele start).
  const wachtendRef = useRef<File | null>(null);
  const bezigRef = useRef(false);
  // Reactieve foto-status: zo re-rendert dit component en vuurt de start-effect betrouwbaar zodra de
  // foto's klaar zijn (een store-abonnement miste dat moment door her-abonneren bij elke render).
  const { fotoBezig } = useOpleverUpload();

  // Een wachtende of lopende video wil je niet kwijtraken bij weg-navigeren/verversen.
  useVerlaatWaarschuwing(bezig || wachtend !== null);

  // Bezig-status delen met de foto-kant. Alleen een ECHTE upload telt als videoBezig; een wachtende
  // video niet, anders zouden foto en video op elkaar kunnen blijven wachten (deadlock).
  useEffect(() => {
    zetVideoBezig(bezig);
  }, [bezig]);
  useEffect(() => () => zetVideoBezig(false), []);

  const verwerkBestand = useCallback(
    async (file: File) => {
      bezigRef.current = true;
      setBezig(true);
      setPct(0);
      setFout("");
      try {
        const { url: nieuweUrl } = await uploadOpleverVideo(file, setPct);
        onChange(nieuweUrl);
      } catch (err) {
        setFout((err as Error).message);
      } finally {
        bezigRef.current = false;
        setBezig(false);
      }
    },
    [onChange],
  );

  // Zodra de foto's klaar zijn, start de wachtende video automatisch. De refs voorkomen dat dezelfde
  // video twee keer start. Dit is een bewuste synchronisatie met de externe foto-status.
  useEffect(() => {
    if (!fotoBezig && wachtendRef.current && !bezigRef.current) {
      const f = wachtendRef.current;
      wachtendRef.current = null;
      setWachtend(null);
      void verwerkBestand(f);
    }
  }, [fotoBezig, verwerkBestand]);

  /** Start de upload, of laat hem wachten als de foto's nog uploaden. */
  function startOfWacht(file: File) {
    if (leesUploadStatus().fotoBezig) {
      wachtendRef.current = file;
      setWachtend(file);
    } else {
      void verwerkBestand(file);
    }
  }

  /** Een wachtende video alsnog annuleren. */
  function annuleerWachten() {
    wachtendRef.current = null;
    setWachtend(null);
  }

  function handleGalerij(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setTip(
      isGrootBestand(file.size)
        ? `Zwaar bestand (~${bytesNaarMB(file.size)} MB). Tip: sneller opnemen met de Opnemen-knop.`
        : "",
    );
    startOfWacht(file);
  }

  function handleOpname(file: File) {
    setOpnemen(false);
    setTip("");
    startOfWacht(file);
  }

  if (url) {
    return (
      <div className="flex flex-col gap-2 rounded-none border border-success bg-success/10 p-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 size={20} strokeWidth={2.5} aria-hidden="true" />
          Video vastgelegd
        </span>
        {speel && (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="max-h-56 w-full rounded-none border border-line bg-black"
          />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSpeel((v) => !v)}
            className="inline-flex min-h-[40px] flex-1 cursor-pointer items-center justify-center gap-1 rounded-none border border-ink px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <Play size={15} strokeWidth={2.5} aria-hidden="true" />
            {speel ? "Verbergen" : "Bekijken"}
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSpeel(false);
            }}
            className="inline-flex min-h-[40px] flex-1 cursor-pointer items-center justify-center gap-1 rounded-none border border-urgent-rood px-3 text-sm font-semibold text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-primary"
          >
            <Trash2 size={15} strokeWidth={2.5} aria-hidden="true" />
            Verwijderen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {bezig ? (
        <div className="rounded-none border border-line bg-surface px-3 py-3">
          <Voortgang label="Video uploaden…" percent={pct} />
        </div>
      ) : wachtend ? (
        <div className="flex items-center gap-2 rounded-none border border-line bg-surface px-3 py-3 text-sm font-semibold text-ink">
          <Clock size={18} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="flex-1">Video wacht tot de foto&apos;s klaar zijn…</span>
          <button
            type="button"
            onClick={annuleerWachten}
            className="shrink-0 cursor-pointer border border-ink px-2 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-line/40"
          >
            Annuleren
          </button>
        </div>
      ) : opnemen ? (
        <VideoOpnemen onCapture={handleOpname} onAnnuleer={() => setOpnemen(false)} />
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setFout("");
              setTip("");
              setOpnemen(true);
            }}
            className="flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-3 py-3 text-base font-semibold text-ink transition-colors duration-150 hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary"
          >
            <Video size={22} strokeWidth={2.5} aria-hidden="true" />
            Opnemen
          </button>
          <label className="flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-3 py-3 text-base font-semibold text-ink transition-colors duration-150 hover:bg-line/40 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary">
            <input type="file" accept="video/*" hidden onChange={handleGalerij} />
            <ImageIcon size={22} strokeWidth={2.5} aria-hidden="true" />
            Galerij
          </label>
        </div>
      )}
      {tip && !fout && (
        <p className="mt-2 text-sm font-medium text-ink/70">{tip}</p>
      )}
      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
