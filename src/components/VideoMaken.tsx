"use client";

import { useState } from "react";
import { Video, Loader2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { uploadOpleverVideo } from "@/lib/oplever-upload";

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
  const [fout, setFout] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBezig(true);
    setFout("");
    try {
      const grootMb = file.size / (1024 * 1024);
      if (grootMb > 200) {
        setFout(`Video is erg groot (${Math.round(grootMb)} MB). Houd het kort, 30-60 seconden is genoeg.`);
        return;
      }
      const { url: nieuweUrl } = await uploadOpleverVideo(file);
      onChange(nieuweUrl);
    } catch (err) {
      setFout((err as Error).message);
    } finally {
      setBezig(false);
    }
  }

  if (url) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-none border border-success bg-success/10 px-3 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 size={20} strokeWidth={2.5} aria-hidden="true" />
          Video vastgelegd
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Video verwijderen"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-none text-ink-muted hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        className={`flex min-h-[56px] items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-3 py-3 text-base font-semibold text-ink transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${
          bezig ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-line/40"
        }`}
      >
        <input
          type="file"
          accept="video/*"
          capture="environment"
          hidden
          disabled={bezig}
          onChange={handleFile}
        />
        {bezig ? (
          <>
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            Video uploaden…
          </>
        ) : (
          <>
            <Video size={22} strokeWidth={2.5} aria-hidden="true" />
            Video opnemen (optioneel)
          </>
        )}
      </label>
      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
