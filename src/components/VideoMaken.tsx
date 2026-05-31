"use client";

import { useState } from "react";
import { Video, Image as ImageIcon, AlertCircle, CheckCircle2, Play, Trash2 } from "lucide-react";
import { uploadOpleverVideo } from "@/lib/oplever-upload";
import { Voortgang } from "@/components/Voortgang";
import { useVerlaatWaarschuwing } from "@/lib/use-verlaat-waarschuwing";

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

  useVerlaatWaarschuwing(bezig);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBezig(true);
    setPct(0);
    setFout("");
    try {
      const { url: nieuweUrl } = await uploadOpleverVideo(file, setPct);
      onChange(nieuweUrl);
    } catch (err) {
      setFout((err as Error).message);
    } finally {
      setBezig(false);
    }
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
      ) : (
        <div className="flex gap-2">
          <label className="flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-3 py-3 text-base font-semibold text-ink transition-colors duration-150 hover:bg-line/40 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary">
            <input type="file" accept="video/*" capture="environment" hidden onChange={handleFile} />
            <Video size={22} strokeWidth={2.5} aria-hidden="true" />
            Opnemen
          </label>
          <label className="flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-3 py-3 text-base font-semibold text-ink transition-colors duration-150 hover:bg-line/40 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary">
            <input type="file" accept="video/*" hidden onChange={handleFile} />
            <ImageIcon size={22} strokeWidth={2.5} aria-hidden="true" />
            Galerij
          </label>
        </div>
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
